import type { SuggestionCard, SuggestionType } from '../types';

const VALID_TYPES: SuggestionType[] = ['question', 'talking_point', 'answer', 'fact_check', 'clarification', 'short', 'detailed'];

export interface ParseResult {
  success: boolean;
  suggestions?: SuggestionCard[];
  error?: string;
}

/**
 * Parse and validate LLM response for suggestions
 * Expects exactly 3 suggestions in a JSON array format
 */
export function parseSuggestions(rawResponse: string, baseTimestamp: number = Date.now()): ParseResult {
  try {
    // Clean common markdown fences
    let cleaned = rawResponse.trim();
    cleaned = cleaned.replace(/^```json\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/i, '');
    cleaned = cleaned.trim();

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      return { success: false, error: 'Response is not an array' };
    }

    // Validate exactly 3 suggestions
    if (parsed.length !== 3) {
      return { success: false, error: `Expected 3 suggestions, got ${parsed.length}` };
    }

    // Validate and map each suggestion
    const suggestions: SuggestionCard[] = parsed.map((item: unknown, index: number) => {
      if (typeof item !== 'object' || item === null) {
        throw new Error(`Suggestion ${index} is not an object`);
      }

      const obj = item as Record<string, unknown>;

      // Required fields
      const title = typeof obj.title === 'string' ? obj.title.trim() : '';
      const preview = typeof obj.preview === 'string' ? obj.preview.trim() : '';
      const reasoning = typeof obj.reasoning === 'string' ? obj.reasoning.trim() : '';
      const type = typeof obj.type === 'string' ? obj.type.trim() : '';

      if (!title) throw new Error(`Suggestion ${index} missing title`);
      if (!preview) throw new Error(`Suggestion ${index} missing preview`);
      if (!reasoning) throw new Error(`Suggestion ${index} missing reasoning`);
      if (!type) throw new Error(`Suggestion ${index} missing type`);

      // Validate type
      if (!VALID_TYPES.includes(type as SuggestionType)) {
        throw new Error(`Suggestion ${index} has invalid type: ${type}`);
      }

      // Use preview as content for backward compatibility
      const content = preview;

      return {
        id: `sugg-${baseTimestamp}-${index}`,
        title,
        preview,
        reasoning,
        content,
        type: type as SuggestionType,
        timestamp: baseTimestamp,
      };
    });

    return { success: true, suggestions };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse suggestions',
    };
  }
}

/**
 * Retry parsing with common LLM output corrections
 */
export function parseSuggestionsWithRetry(rawResponse: string, baseTimestamp: number = Date.now()): ParseResult {
  // First attempt
  let result = parseSuggestions(rawResponse, baseTimestamp);
  if (result.success) return result;

  // Try removing trailing commas (common LLM error)
  const noTrailingCommas = rawResponse.replace(/,(\s*[}\]])/g, '$1');
  if (noTrailingCommas !== rawResponse) {
    result = parseSuggestions(noTrailingCommas, baseTimestamp);
    if (result.success) return result;
  }

  // Try extracting JSON from markdown code block if present
  const codeBlockMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    result = parseSuggestions(codeBlockMatch[1], baseTimestamp);
    if (result.success) return result;
  }

  // Try extracting array pattern
  const arrayMatch = rawResponse.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    result = parseSuggestions(arrayMatch[0], baseTimestamp);
    if (result.success) return result;
  }

  // Return original error if all retries fail
  return result;
}
