'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { generateSuggestions } from '../services/suggestionService';
import type { SuggestionCard, TranscriptEntry } from '../types';

// Number of new transcript entries to trigger suggestion generation
const TRIGGER_THRESHOLD = 3;

export interface UseSuggestionsReturn {
  isLoading: boolean;
  error: string | null;
  refreshSuggestions: () => Promise<void>;
  lastBatchTimestamp: number | null;
}

export function useSuggestions(): UseSuggestionsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastBatchTimestamp, setLastBatchTimestamp] = useState<number | null>(null);

  // Refs for tracking state without re-renders
  const processedCountRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Get store values
  const transcript = useAppStore((state) => state.transcript);
  const apiKey = useAppStore((state) => state.settings.groqApiKey);
  const customPrompt = useAppStore((state) => state.settings.liveSuggestionPrompt);
  const contextWindowSize = useAppStore((state) => state.settings.contextWindowSize);

  // Get store actions
  const addSuggestionBatch = useCallback(
    (suggestions: SuggestionCard[], summary: string) => {
      useAppStore.getState().addSuggestionBatch(suggestions, summary);
    },
    []
  );

  // Core function to generate and add suggestions
  const generateAndAddSuggestions = useCallback(async (
    currentTranscript: TranscriptEntry[],
    force: boolean = false
  ) => {
    console.log(`[useSuggestions] generateAndAddSuggestions called (force=${force}, entries=${currentTranscript.length})`);
    
    if (!isMountedRef.current) {
      console.warn('[useSuggestions] Component not mounted, aborting');
      return;
    }
    if (isLoading && !force) {
      console.log('[useSuggestions] Already loading, skipping (use force=true to override)');
      return;
    }
    if (!apiKey) {
      console.error('[useSuggestions] No API key configured');
      setError('Groq API key not configured');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[useSuggestions] Calling generateSuggestions with ${currentTranscript.length} transcript entries...`);
      const result = await generateSuggestions(
        currentTranscript,
        apiKey,
        customPrompt,
        contextWindowSize
      );

      if (!isMountedRef.current) {
        console.warn('[useSuggestions] Component unmounted during API call');
        return;
      }

      if (result.success && result.suggestions) {
        const summary = `Based on ${Math.min(contextWindowSize, currentTranscript.length)} recent transcript entries`;
        console.log(`[useSuggestions] Success! Adding batch with ${result.suggestions.length} suggestions`);
        addSuggestionBatch(result.suggestions, summary);
        setLastBatchTimestamp(Date.now());
        processedCountRef.current = currentTranscript.length;
        console.log(`[useSuggestions] Updated processedCount to ${processedCountRef.current}`);
      } else {
        console.error('[useSuggestions] Generation failed:', result.error);
        setError(result.error || 'Failed to generate suggestions');
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('[useSuggestions] Exception during generation:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [apiKey, customPrompt, contextWindowSize, addSuggestionBatch, isLoading]);

  // Manual refresh function
  const refreshSuggestions = useCallback(async () => {
    console.log(`[useSuggestions] Manual refresh requested (transcript=${transcript.length} entries)`);
    if (transcript.length === 0) {
      console.warn('[useSuggestions] No transcript available');
      setError('No transcript available to generate suggestions');
      return;
    }
    await generateAndAddSuggestions(transcript, true);
  }, [transcript, generateAndAddSuggestions]);

  // Auto-trigger effect: watch for new transcript entries
  useEffect(() => {
    const newEntriesCount = transcript.length - processedCountRef.current;
    console.log(`[useSuggestions] Transcript changed: ${transcript.length} total, ${newEntriesCount} new (threshold=${TRIGGER_THRESHOLD})`);

    // Only trigger if we have new entries
    if (newEntriesCount <= 0) {
      console.log('[useSuggestions] No new entries, skipping');
      return;
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      console.log('[useSuggestions] Clearing existing debounce timer');
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce to wait for transcription to settle
    console.log('[useSuggestions] Starting 2s debounce timer...');
    debounceTimerRef.current = setTimeout(() => {
      const currentNewCount = transcript.length - processedCountRef.current;
      console.log(`[useSuggestions] Debounce complete: ${currentNewCount} new entries, isLoading=${isLoading}`);

      // Trigger if we have enough new entries
      if (currentNewCount >= TRIGGER_THRESHOLD && !isLoading) {
        console.log(`[useSuggestions] AUTO-TRIGGERING: ${currentNewCount} >= ${TRIGGER_THRESHOLD} threshold`);
        generateAndAddSuggestions(transcript);
      } else {
        console.log(`[useSuggestions] Not triggering: ${currentNewCount} < ${TRIGGER_THRESHOLD} or isLoading=${isLoading}`);
      }
    }, 2000); // 2 second debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [transcript, isLoading, generateAndAddSuggestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isLoading,
    error,
    refreshSuggestions,
    lastBatchTimestamp,
  };
}
