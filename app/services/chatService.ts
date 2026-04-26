import type { TranscriptEntry, ChatMessage, SuggestionCard } from '../types';
import {
  buildSuggestionContext,
  buildChatContext,
} from '../utils/contextBuilder';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const DEFAULT_DETAILED_ANSWER_PROMPT = `You are an intelligent meeting assistant. The user has clicked on a suggestion and wants a detailed, actionable answer.

Your task:
1. Provide a thorough, helpful response that directly addresses the suggestion
2. Reference specific details from the conversation transcript where relevant
3. Explain your reasoning clearly
4. Give concrete, actionable advice - avoid generic responses
5. Be professional yet conversational

Your response should be 3-5 sentences, detailed enough to be genuinely useful.`;

const DEFAULT_CHAT_PROMPT = `You are an intelligent meeting assistant having a conversation with the user.

Your task:
1. Answer the user's question based on the conversation transcript and chat history
2. Be helpful, accurate, and concise but thorough
3. Reference specific details from the transcript when relevant
4. If the question relates to previous chat messages, maintain continuity
5. Be professional yet conversational

Your response should directly address the question with useful, specific information.`;

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
        max_tokens: 800,
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
        max_tokens: 800,
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
