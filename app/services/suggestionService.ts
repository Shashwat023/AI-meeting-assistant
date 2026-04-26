import type { TranscriptEntry, SuggestionCard } from '../types';
import { parseSuggestionsWithRetry } from '../utils/suggestionParser';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const DEFAULT_SUGGESTION_PROMPT = `You are a live meeting copilot generating instant, scannable suggestions. Based on the conversation transcript, generate EXACTLY 3 compact, high-signal suggestions.

Each suggestion must be one of these types:
- "question": A sharp question to advance the discussion
- "talking_point": A relevant angle to contribute
- "answer": A quick answer to a question just asked
- "fact_check": A relevant fact to verify
- "clarification": A point needing clarity

STRICT BREVITY REQUIREMENTS (enforced):
1. Output MUST be a valid JSON array with exactly 3 objects
2. title: max 5 words, action-oriented, no filler
3. preview: max 60 characters, 1-line punchy hook, NO title repetition, NO type explanation
4. reasoning: max 120 characters, dense insight only, no generic explanations
5. Every character must earn its place. Strip all fluff.
6. Be specific - reference actual transcript content
7. NO intros like "Consider asking..." or "You could..." - just the raw suggestion

Output format:
[
  {"title": "...", "preview": "...", "reasoning": "...", "type": "..."},
  {"title": "...", "preview": "...", "reasoning": "...", "type": "..."},
  {"title": "...", "preview": "...", "reasoning": "...", "type": "..."}
]`

export interface GenerateSuggestionsResult {
  success: boolean;
  suggestions?: SuggestionCard[];
  error?: string;
}

/**
 * Build context string from recent transcript entries
 */
function buildTranscriptContext(
  transcript: TranscriptEntry[],
  contextWindowSize: number
): string {
  if (transcript.length === 0) {
    return 'No transcript available yet.';
  }

  // Get last N entries
  const recentEntries = transcript.slice(-contextWindowSize);
  console.log(`[SuggestionService] Building context from ${recentEntries.length} entries (window=${contextWindowSize}, total=${transcript.length})`);

  return recentEntries
    .map((entry) => {
      const speaker = entry.speaker === 'user' ? 'You' : 'Other';
      return `[${speaker}]: ${entry.text}`;
    })
    .join('\n');
}

/**
 * Generate suggestions based on recent transcript context
 */
export async function generateSuggestions(
  transcript: TranscriptEntry[],
  apiKey: string,
  customPrompt: string | undefined,
  contextWindowSize: number
): Promise<GenerateSuggestionsResult> {
  console.log(`[SuggestionService] Generating suggestions: transcript=${transcript.length} entries, window=${contextWindowSize}`);
  
  if (!apiKey.trim()) {
    console.error('[SuggestionService] No API key configured');
    return {
      success: false,
      error: 'Groq API key not configured. Please add it in Settings.',
    };
  }

  if (transcript.length === 0) {
    console.warn('[SuggestionService] No transcript entries available');
    return {
      success: false,
      error: 'No transcript available to generate suggestions.',
    };
  }

  const context = buildTranscriptContext(transcript, contextWindowSize);
  const prompt = customPrompt?.trim() || DEFAULT_SUGGESTION_PROMPT;
  const startTime = Date.now();
  
  console.log(`[SuggestionService] Sending request to Groq (model=${MODEL})...`);

  try {
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
            content: `Based on this conversation transcript, generate 3 helpful suggestions:\n\n${context}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      }),
    });

    const duration = Date.now() - startTime;
    console.log(`[SuggestionService] API response received in ${duration}ms: status=${response.status}`);

    if (!response.ok) {
      let errorMessage = `Groq API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
        console.error('[SuggestionService] Groq API error details:', errorData);
      } catch {
        // Ignore parsing error
      }
      return { success: false, error: errorMessage };
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('[SuggestionService] Invalid response format:', data);
      return { success: false, error: 'Invalid response format from Groq API' };
    }

    const rawContent = data.choices[0].message.content;
    const timestamp = Date.now();

    console.log(`[SuggestionService] Raw response length: ${rawContent.length} chars`);

    // Try to parse as JSON object with suggestions array, or direct array
    let contentToParse = rawContent;
    
    // If response is wrapped in an object with a suggestions key, extract it
    try {
      const parsedObj = JSON.parse(rawContent);
      if (parsedObj.suggestions && Array.isArray(parsedObj.suggestions)) {
        contentToParse = JSON.stringify(parsedObj.suggestions);
        console.log(`[SuggestionService] Extracted suggestions array from object`);
      }
    } catch {
      // Not wrapped in object, use raw content
    }

    const parseResult = parseSuggestionsWithRetry(contentToParse, timestamp);

    if (!parseResult.success) {
      console.error(`[SuggestionService] Failed to parse suggestions: ${parseResult.error}`);
      return {
        success: false,
        error: `Failed to parse suggestions: ${parseResult.error}`,
      };
    }

    console.log(`[SuggestionService] Successfully generated ${parseResult.suggestions?.length} suggestions`);
    parseResult.suggestions?.forEach((s, i) => {
      console.log(`[SuggestionService] Suggestion ${i+1}: [${s.type}] "${s.title}"`);
    });

    return {
      success: true,
      suggestions: parseResult.suggestions,
    };
  } catch (error) {
    console.error('[SuggestionService] Error generating suggestions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions',
    };
  }
}
