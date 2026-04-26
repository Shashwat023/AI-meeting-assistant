import type { RecordingError } from '../types';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3';

// Minimum audio size in bytes (roughly 0.5 seconds of audio)
const MIN_AUDIO_SIZE = 1000;

export async function transcribeAudio(audioBlob: Blob, apiKey: string): Promise<string> {
  console.log(`[TranscriptionService] Starting transcription: blob=${audioBlob.size} bytes, type=${audioBlob.type}`);
  
  if (!apiKey.trim()) {
    console.error('[TranscriptionService] No API key provided');
    const error: RecordingError = {
      type: 'transcription_failed',
      message: 'Groq API key is required for transcription',
    };
    throw new Error(error.message);
  }

  // Validate blob size
  if (audioBlob.size < MIN_AUDIO_SIZE) {
    console.warn(`[TranscriptionService] Audio chunk too small: ${audioBlob.size} bytes, skipping transcription`);
    return ''; // Return empty string for small chunks instead of throwing
  }

  const formData = new FormData();
  
  // Determine file extension based on blob type
  const fileExtension = audioBlob.type.includes('mp4') ? 'm4a' : 'webm';
  const filename = `audio.${fileExtension}`;
  
  console.log(`[TranscriptionService] Uploading as ${filename} (${audioBlob.size} bytes)`);
  
  formData.append('file', audioBlob, filename);
  formData.append('model', WHISPER_MODEL);
  formData.append('response_format', 'json');

  const startTime = Date.now();
  
  try {
    console.log(`[TranscriptionService] Sending request to Groq API...`);
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    const duration = Date.now() - startTime;
    console.log(`[TranscriptionService] API response received in ${duration}ms: status=${response.status}`);

    if (!response.ok) {
      let errorMessage = `Transcription failed: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
        console.error('[TranscriptionService] Groq API error:', errorData);
      } catch {
        // If parsing fails, use default error message
      }

      const error: RecordingError = {
        type: 'transcription_failed',
        message: errorMessage,
      };
      throw new Error(error.message);
    }

    const data = await response.json();
    
    if (data.text) {
      console.log(`[TranscriptionService] Transcription successful: "${data.text.substring(0, 80)}${data.text.length > 80 ? '...' : ''}"`);
      return data.text;
    } else {
      console.error('[TranscriptionService] No text in API response:', data);
      throw new Error('No transcription text received from API');
    }
  } catch (error) {
    console.error('[TranscriptionService] Transcription error:', error);
    if (error instanceof Error) {
      throw error;
    }
    
    const recordingError: RecordingError = {
      type: 'transcription_failed',
      message: 'Network error while sending audio for transcription',
    };
    throw new Error(recordingError.message);
  }
}
