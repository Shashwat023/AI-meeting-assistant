'use client';

import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store/appStore';
import {
  generateDetailedAnswer,
  generateChatResponse,
  type ChatResponse,
} from '../services/chatService';
import type { SuggestionCard, ChatMessage } from '../types';

const TYPING_CHAR_DELAY_MS = 20; // ~50 chars per second

interface UseChatReturn {
  isLoading: boolean;
  isTyping: boolean;
  error: string | null;
  displayedContent: string;
  sendSuggestionMessage: (suggestion: SuggestionCard) => Promise<void>;
  sendManualMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedContent, setDisplayedContent] = useState('');

  const abortTypingRef = useRef<boolean>(false);
  const lastMessageRef = useRef<{
    type: 'suggestion' | 'manual';
    suggestion?: SuggestionCard;
    text?: string;
  } | null>(null);

  // Get store values
  const transcript = useAppStore((state) => state.transcript);
  const apiKey = useAppStore((state) => state.settings.groqApiKey);
  const contextWindowSize = useAppStore((state) => state.settings.contextWindowSize);
  const detailedAnswerPrompt = useAppStore((state) => state.settings.detailedAnswerPrompt);
  const chatPrompt = useAppStore((state) => state.settings.chatPrompt);
  const chatMessages = useAppStore((state) => state.chatMessages);

  // Get store actions
  const addChatMessage = useCallback(
    (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
      useAppStore.getState().addChatMessage(message);
    },
    []
  );

  const setTyping = useCallback((typing: boolean) => {
    useAppStore.getState().setTyping(typing);
  }, []);

  // Typing animation effect
  const typeContent = useCallback(async (content: string) => {
    console.log('[useChat] Starting typing animation...');
    setIsTyping(true);
    setTyping(true);
    abortTypingRef.current = false;

    let currentIndex = 0;
    setDisplayedContent('');

    return new Promise<void>((resolve) => {
      const typeNextChar = () => {
        if (abortTypingRef.current) {
          setDisplayedContent(content);
          setIsTyping(false);
          setTyping(false);
          resolve();
          return;
        }

        if (currentIndex >= content.length) {
          setIsTyping(false);
          setTyping(false);
          console.log('[useChat] Typing animation complete');
          resolve();
          return;
        }

        // Type multiple characters per frame for speed
        const charsToType = Math.min(3, content.length - currentIndex);
        currentIndex += charsToType;
        setDisplayedContent(content.slice(0, currentIndex));

        setTimeout(typeNextChar, TYPING_CHAR_DELAY_MS);
      };

      typeNextChar();
    });
  }, [setTyping]);

  // Handle API response
  const handleResponse = useCallback(
    async (response: ChatResponse, userMessageContent: string) => {
      if (response.success && response.content) {
        // First, show typing animation
        await typeContent(response.content);

        // Then add the complete message to chat history
        addChatMessage({
          role: 'assistant',
          content: response.content,
        });
        setDisplayedContent('');
        setError(null);
      } else {
        console.error('[useChat] Response error:', response.error);
        setError(response.error || 'Failed to get response');
        addChatMessage({
          role: 'assistant',
          content: `Sorry, I couldn't generate a response. ${response.error || 'Please try again.'}`,
        });
      }
    },
    [addChatMessage, typeContent]
  );

  // Send suggestion message
  const sendSuggestionMessage = useCallback(
    async (suggestion: SuggestionCard) => {
      console.log(`[useChat] Sending suggestion message: "${suggestion.title}"`);

      // Abort any ongoing typing
      abortTypingRef.current = true;

      // Add user message (the suggestion)
      const userContent = `Suggestion: ${suggestion.title}\n${suggestion.preview}`;
      addChatMessage({
        role: 'user',
        content: userContent,
      });

      setIsLoading(true);
      setError(null);
      lastMessageRef.current = { type: 'suggestion', suggestion };

      try {
        const response = await generateDetailedAnswer(
          suggestion,
          transcript,
          apiKey,
          detailedAnswerPrompt,
          contextWindowSize
        );

        await handleResponse(response, userContent);
      } catch (err) {
        console.error('[useChat] Error sending suggestion:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [addChatMessage, apiKey, contextWindowSize, detailedAnswerPrompt, handleResponse, transcript]
  );

  // Send manual message
  const sendManualMessage = useCallback(
    async (text: string) => {
      console.log(`[useChat] Sending manual message: "${text.substring(0, 60)}..."`);

      if (!text.trim()) return;

      // Abort any ongoing typing
      abortTypingRef.current = true;

      // Add user message
      addChatMessage({
        role: 'user',
        content: text.trim(),
      });

      setIsLoading(true);
      setError(null);
      lastMessageRef.current = { type: 'manual', text: text.trim() };

      try {
        const response = await generateChatResponse(
          text.trim(),
          transcript,
          chatMessages,
          apiKey,
          chatPrompt,
          contextWindowSize
        );

        await handleResponse(response, text.trim());
      } catch (err) {
        console.error('[useChat] Error sending message:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [addChatMessage, apiKey, chatMessages, chatPrompt, contextWindowSize, handleResponse, transcript]
  );

  // Retry last message
  const retryLastMessage = useCallback(async () => {
    if (!lastMessageRef.current) {
      setError('No message to retry');
      return;
    }

    console.log('[useChat] Retrying last message...');

    if (lastMessageRef.current.type === 'suggestion' && lastMessageRef.current.suggestion) {
      await sendSuggestionMessage(lastMessageRef.current.suggestion);
    } else if (lastMessageRef.current.type === 'manual' && lastMessageRef.current.text) {
      await sendManualMessage(lastMessageRef.current.text);
    }
  }, [sendManualMessage, sendSuggestionMessage]);

  return {
    isLoading,
    isTyping,
    error,
    displayedContent,
    sendSuggestionMessage,
    sendManualMessage,
    retryLastMessage,
  };
}
