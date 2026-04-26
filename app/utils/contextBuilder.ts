import type { TranscriptEntry, ChatMessage } from '../types';

/**
 * Build transcript context from recent entries
 */
export function buildTranscriptContext(
  transcript: TranscriptEntry[],
  contextWindowSize: number
): string {
  if (transcript.length === 0) {
    return 'No transcript available yet.';
  }

  const recentEntries = transcript.slice(-contextWindowSize);

  return recentEntries
    .map((entry) => {
      const speaker = entry.speaker === 'user' ? 'You' : 'Other';
      return `[${speaker}]: ${entry.text}`;
    })
    .join('\n');
}

/**
 * Build chat history summary for context
 */
export function buildChatHistoryContext(
  chatMessages: ChatMessage[],
  maxMessages: number = 10
): string {
  if (chatMessages.length === 0) {
    return '';
  }

  const recentMessages = chatMessages.slice(-maxMessages);

  return recentMessages
    .map((msg) => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    })
    .join('\n');
}

/**
 * Build full context for suggestion expansion
 */
export function buildSuggestionContext(
  transcript: TranscriptEntry[],
  contextWindowSize: number,
  suggestionTitle: string,
  suggestionPreview: string,
  suggestionReasoning: string,
  suggestionType: string
): string {
  const transcriptContext = buildTranscriptContext(transcript, contextWindowSize);

  return `CONVERSATION TRANSCRIPT:\n${transcriptContext}\n\nFOCUS TOPIC:\nType: ${suggestionType}\nTitle: ${suggestionTitle}\nContext: ${suggestionPreview}\nWhy this matters: ${suggestionReasoning}`;
}

/**
 * Build full context for chat messages
 */
export function buildChatContext(
  transcript: TranscriptEntry[],
  contextWindowSize: number,
  chatMessages: ChatMessage[],
  currentQuestion: string
): string {
  const transcriptContext = buildTranscriptContext(transcript, contextWindowSize);
  const chatHistory = buildChatHistoryContext(chatMessages, 6);

  let context = `CONVERSATION TRANSCRIPT:\n${transcriptContext}`;

  if (chatHistory) {
    context += `\n\nCHAT HISTORY:\n${chatHistory}`;
  }

  context += `\n\nUSER QUESTION:\n${currentQuestion}`;

  return context;
}
