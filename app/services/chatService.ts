import type { TranscriptEntry, ChatMessage, SuggestionCard } from '../types';
import {
  buildSuggestionContext,
  buildChatContext,
} from '../utils/contextBuilder';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const DEFAULT_DETAILED_ANSWER_PROMPT = `You are a live meeting copilot. The user clicked a suggestion and needs an instant, actionable answer.

Your task:
1. Lead with the direct answer - 1-2 sentences maximum
2. Reference specific transcript details only if essential
3. NO intro phrases like "Based on the conversation..." or "I recommend that you..."
4. NO summary sentences at the end
5. Strip all filler words. Every word must convey value.
6. Be direct, punchy, and immediately usable`

const DEFAULT_CHAT_PROMPT = `You are a live meeting copilot answering questions in real-time.

Your task:
1. Answer immediately - 1-2 sentences max
2. Lead with the core answer, not preamble
3. Reference transcript details only if critical
4. NO phrases like "Based on the transcript..." or "It seems like..."
5. NO summary at the end
6. Strip filler. Be punchy and direct.
7. Every word must earn its place on screen`

export interface ChatResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Generate detailed answer for clicked suggestion
 */
export async function generateDetailedAnswer(
  suggestion: SuggestionCard,
  transcript: TranscriptEntry[],
  apiKey: string,
  customPrompt: string | undefined,
  contextWindowSize: number
): Promise<ChatResponse> {
  console.log(`[ChatService] Generating detailed answer for suggestion: "${suggestion.title}"`);

  if (!apiKey.trim()) {
    return {
      success: false,
      error: 'Groq API key not configured. Please add it in Settings.',
    };
  }

  const context = buildSuggestionContext(
    transcript,
    contextWindowSize,
    suggestion.title,
    suggestion.preview,
    suggestion.reasoning,
    suggestion.type
  );

  const prompt = customPrompt?.trim() || DEFAULT_DETAILED_ANSWER_PROMPT;
  const startTime = Date.now();

  try {
    console.log('[ChatService] Sending detailed answer request to Groq...');
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: `Based on this meeting context, provide a detailed answer about: "${suggestion.title}"\n\n${context}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`[ChatService] API response received in ${duration}ms: status=${response.status}`);

    if (!response.ok) {
      let errorMessage = `Groq API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
        console.error('[ChatService] API error details:', errorData);
      } catch {
        // Ignore parsing error
      }
      return { success: false, error: errorMessage };
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      return { success: false, error: 'Invalid response format from Groq API' };
    }

    const content = data.choices[0].message.content.trim();
    console.log(`[ChatService] Detailed answer generated (${content.length} chars)`);

    return {
      success: true,
      content,
    };
  } catch (error) {
    console.error('[ChatService] Error generating detailed answer:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate answer',
    };
  }
}

/**
 * Generate response for manual chat message
 */
export async function generateChatResponse(
  question: string,
  transcript: TranscriptEntry[],
  chatMessages: ChatMessage[],
  apiKey: string,
  customPrompt: string | undefined,
  contextWindowSize: number
): Promise<ChatResponse> {
  console.log(`[ChatService] Generating chat response for: "${question.substring(0, 60)}..."`);

  if (!apiKey.trim()) {
    return {
      success: false,
      error: 'Groq API key not configured. Please add it in Settings.',
    };
  }

  const context = buildChatContext(
    transcript,
    contextWindowSize,
    chatMessages,
    question
  );

  const prompt = customPrompt?.trim() || DEFAULT_CHAT_PROMPT;
  const startTime = Date.now();

  try {
    console.log('[ChatService] Sending chat request to Groq...');
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: prompt,
          },
          {
            role: 'user',
            content: context,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`[ChatService] API response received in ${duration}ms: status=${response.status}`);

    if (!response.ok) {
      let errorMessage = `Groq API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
        console.error('[ChatService] API error details:', errorData);
      } catch {
        // Ignore parsing error
      }
      return { success: false, error: errorMessage };
    }

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      return { success: false, error: 'Invalid response format from Groq API' };
    }

    const content = data.choices[0].message.content.trim();
    console.log(`[ChatService] Chat response generated (${content.length} chars)`);

    return {
      success: true,
      content,
    };
  } catch (error) {
    console.error('[ChatService] Error generating chat response:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate response',
    };
  }
}
