'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { transcribeAudio } from '../services/transcriptionService';
import type { RecordingError, RecordingState } from '../types';

const CHUNK_DURATION_MS = 20000; // 20 seconds per chunk

export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkStartTimeRef = useRef<number>(0);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef<boolean>(false);
  const mimeTypeRef = useRef<string>('audio/webm');
  const isProcessingChunkRef = useRef<boolean>(false);
  
  // Local state for recording UI
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingError, setRecordingError] = useState<RecordingError | null>(null);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);

  // Get store API key - this is stable
  const groqApiKey = useAppStore((state) => state.settings.groqApiKey);

  // Setup MediaRecorder handlers
  const setupMediaRecorderHandlers = useCallback((recorder: MediaRecorder) => {
    console.log('[AudioRecorder] Setting up MediaRecorder handlers');
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log(`[AudioRecorder] Data available: ${event.data.size} bytes`);
        chunksRef.current.push(event.data);
      }
    };
    
    recorder.onstop = () => {
      console.log('[AudioRecorder] MediaRecorder stopped');
      if (!isStoppingRef.current) {
        // handleChunkComplete will be called via the effect
      }
    };
    
    recorder.onerror = (event) => {
      console.error('[AudioRecorder] MediaRecorder error:', event);
      const error: RecordingError = {
        type: 'mic_unavailable',
        message: 'Microphone recording error occurred',
      };
      setRecordingError(error);
      setRecordingState('error');
    };
    
    recorder.onstart = () => {
      console.log('[AudioRecorder] MediaRecorder started');
    };
  }, []);

  // Process and transcribe a single chunk
  const processChunk = useCallback(async (audioBlob: Blob, chunkIndex: number) => {
    console.log(`[AudioRecorder] Processing chunk ${chunkIndex}: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
    
    if (!groqApiKey) {
      console.error('[AudioRecorder] No API key configured');
      const error: RecordingError = {
        type: 'transcription_failed',
        message: 'Groq API key not configured. Please add it in Settings.',
      };
      setRecordingError(error);
      setRecordingState('error');
      return;
    }

    setRecordingState('processing');
    const startTime = Date.now();

    try {
      console.log(`[AudioRecorder] Sending chunk ${chunkIndex} to transcription service...`);
      const text = await transcribeAudio(audioBlob, groqApiKey);
      const duration = Date.now() - startTime;
      
      console.log(`[AudioRecorder] Chunk ${chunkIndex} transcribed in ${duration}ms: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      
      if (text && text.trim()) {
        console.log(`[AudioRecorder] Adding transcript chunk ${chunkIndex} to store`);
        useAppStore.getState().addTranscriptChunk(text, chunkIndex);
      } else {
        console.warn(`[AudioRecorder] Chunk ${chunkIndex} returned empty transcription`);
      }

      if (!isStoppingRef.current) {
        setRecordingState('recording');
      }
    } catch (error) {
      console.error(`[AudioRecorder] Chunk ${chunkIndex} transcription failed:`, error);
      const recError: RecordingError = {
        type: 'transcription_failed',
        message: error instanceof Error ? error.message : 'Failed to transcribe audio',
      };
      setRecordingError(recError);
      setRecordingState('error');
    }
  }, [groqApiKey]);

  // Handle chunk completion and auto-restart
  const handleChunkComplete = useCallback(() => {
    console.log('[AudioRecorder] Handling chunk completion');
    
    // Reset processing flag immediately
    isProcessingChunkRef.current = false;
    
    if (chunksRef.current.length === 0) {
      console.warn('[AudioRecorder] No audio data in chunk');
      // Auto-restart if not stopping
      if (!isStoppingRef.current && streamRef.current) {
        try {
          const newRecorder = new MediaRecorder(streamRef.current, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
          });
          mediaRecorderRef.current = newRecorder;
          mimeTypeRef.current = newRecorder.mimeType || 'audio/webm';
          
          newRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };
          
          newRecorder.onstop = () => {
            if (!isStoppingRef.current) {
              handleChunkComplete();
            }
          };
          
          newRecorder.onerror = () => {
            const error: RecordingError = {
              type: 'mic_unavailable',
              message: 'Microphone recording error occurred',
            };
            setRecordingError(error);
            setRecordingState('error');
          };
          
          newRecorder.start();
          chunkStartTimeRef.current = Date.now();
          console.log('Auto-restarted recording for next chunk');
        } catch (e) {
          console.error('Failed to auto-restart recorder:', e);
        }
      }
      return;
    }

    const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
    console.log(`[AudioRecorder] Created audio blob for chunk ${currentChunkIndex}: ${audioBlob.size} bytes`);
    chunksRef.current = [];
    
    const chunkIndex = currentChunkIndex;
    
    if (audioBlob.size < 2000) {
      console.warn(`[AudioRecorder] Chunk ${chunkIndex} too small (${audioBlob.size} bytes), skipping`);
      // Still increment and restart
      setCurrentChunkIndex((prev) => prev + 1);
      
      // Auto-restart if not stopping
      if (!isStoppingRef.current && streamRef.current) {
        try {
          const newRecorder = new MediaRecorder(streamRef.current, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
          });
          mediaRecorderRef.current = newRecorder;
          mimeTypeRef.current = newRecorder.mimeType || 'audio/webm';
          
          newRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };
          
          newRecorder.onstop = () => {
            if (!isStoppingRef.current) {
              handleChunkComplete();
            }
          };
          
          newRecorder.onerror = () => {
            const error: RecordingError = {
              type: 'mic_unavailable',
              message: 'Microphone recording error occurred',
            };
            setRecordingError(error);
            setRecordingState('error');
          };
          
          newRecorder.start();
          chunkStartTimeRef.current = Date.now();
          console.log('Auto-restarted recording after small chunk');
        } catch (e) {
          console.error('Failed to auto-restart recorder:', e);
        }
      }
      return;
    }
    
    console.log(`Processing chunk ${chunkIndex}: ${audioBlob.size} bytes, type: ${mimeTypeRef.current}`);
    
    // Process the chunk
    processChunk(audioBlob, chunkIndex).then(() => {
      console.log(`[AudioRecorder] Chunk ${chunkIndex} processing complete, restarting recorder...`);
      // Increment index after successful processing
      setCurrentChunkIndex((prev) => prev + 1);
      
      // Auto-restart recording for next chunk if not stopping
      if (!isStoppingRef.current && streamRef.current) {
        try {
          const newRecorder = new MediaRecorder(streamRef.current, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
          });
          mediaRecorderRef.current = newRecorder;
          mimeTypeRef.current = newRecorder.mimeType || 'audio/webm';
          
          newRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };
          
          newRecorder.onstop = () => {
            if (!isStoppingRef.current) {
              handleChunkComplete();
            }
          };
          
          newRecorder.onerror = () => {
            const error: RecordingError = {
              type: 'mic_unavailable',
              message: 'Microphone recording error occurred',
            };
            setRecordingError(error);
            setRecordingState('error');
          };
          
          newRecorder.start();
          chunkStartTimeRef.current = Date.now();
          console.log(`Auto-restarted recording for chunk ${chunkIndex + 1}`);
        } catch (e) {
          console.error('Failed to auto-restart recorder:', e);
        }
      }
    });
  }, [currentChunkIndex, processChunk]);

  // Stop recording
  const stopRecording = useCallback(() => {
    console.log('[AudioRecorder] Stopping recording...');
    isStoppingRef.current = true;

    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
      console.log('[AudioRecorder] Chunk timer cleared');
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('[AudioRecorder] Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      // Process any remaining chunks if we are in a good state and chunk is large enough
      if (recordingState !== 'error' && chunksRef.current.length > 0) {
        const audioBlob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        chunksRef.current = [];
        if (audioBlob.size >= 2000) {
          console.log(`[AudioRecorder] Processing final chunk ${currentChunkIndex}: ${audioBlob.size} bytes, type: ${mimeTypeRef.current}`);
          processChunk(audioBlob, currentChunkIndex);
        } else {
          console.warn(`[AudioRecorder] Final chunk too small (${audioBlob.size} bytes), skipping`);
        }
      }

      streamRef.current = null;
    }

    // Reset state
    mediaRecorderRef.current = null;
    setRecordingState('idle');
    isStoppingRef.current = false;
    console.log('[AudioRecorder] Recording stopped and state reset');
  }, [recordingState, currentChunkIndex, processChunk]);

  // Start recording
  const startRecording = useCallback(async () => {
    console.log('[AudioRecorder] Starting recording...');
    setRecordingError(null);
    setRecordingState('idle');
    setCurrentChunkIndex(0);
    isStoppingRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      mimeTypeRef.current = mediaRecorder.mimeType || 'audio/webm';
      console.log(`[AudioRecorder] MediaRecorder created with MIME type: ${mimeTypeRef.current}`);
      console.log(`[AudioRecorder] Audio track settings:`, stream.getAudioTracks()[0]?.getSettings());

      setupMediaRecorderHandlers(mediaRecorder);

      mediaRecorder.start();
      chunkStartTimeRef.current = Date.now();
      setRecordingState('recording');
      console.log(`[AudioRecorder] Recording started (chunk ${CHUNK_DURATION_MS}ms)`);

    } catch (error) {
      console.error('[AudioRecorder] Failed to start recording:', error);
      let recError: RecordingError;

      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          recError = {
            type: 'permission_denied',
            message: 'Microphone permission denied. Please allow access in your browser settings.',
          };
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          recError = {
            type: 'mic_unavailable',
            message: 'No microphone found. Please connect a microphone and try again.',
          };
        } else {
          recError = {
            type: 'unknown',
            message: `Microphone error: ${error.message}`,
          };
        }
      } else {
        recError = {
          type: 'unknown',
          message: error instanceof Error ? error.message : 'Failed to start recording',
        };
      }

      setRecordingError(recError);
      setRecordingState('error');
      console.error('[AudioRecorder] Recording error:', recError);
    }
  }, [setupMediaRecorderHandlers]);

  // Setup timer to stop recorder every 20 seconds
  useEffect(() => {
    // Only start timer when actively recording and not processing a chunk
    if (recordingState !== 'recording' || isProcessingChunkRef.current) {
      console.log('[AudioRecorder] Timer not started - state:', recordingState, 'processing:', isProcessingChunkRef.current);
      return;
    }
    
    // Clear any existing timer first
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
    }
    
    console.log(`[AudioRecorder] Starting chunk timer (${CHUNK_DURATION_MS}ms intervals)`);
    
    chunkTimerRef.current = setInterval(() => {
      // Double-check we're still recording and not already processing
      if (isProcessingChunkRef.current) {
        console.log('[AudioRecorder] Timer skipped - already processing chunk');
        return;
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        console.log('[AudioRecorder] Timer triggered: stopping recorder for chunk processing');
        isProcessingChunkRef.current = true;
        mediaRecorderRef.current.stop();
      } else {
        console.warn('[AudioRecorder] Timer fired but recorder not in recording state:', mediaRecorderRef.current?.state);
      }
    }, CHUNK_DURATION_MS);
    
    return () => {
      if (chunkTimerRef.current) {
        console.log('[AudioRecorder] Clearing chunk timer');
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }
    };
  }, [recordingState]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (recordingState === 'recording') {
      stopRecording();
    } else if (recordingState === 'idle' || recordingState === 'error') {
      startRecording();
    }
  }, [recordingState, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    recordingState,
    recordingError,
    toggleRecording,
    currentChunkIndex,
  };
}