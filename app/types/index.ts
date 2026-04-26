export interface TranscriptEntry {
  id: string;
  timestamp: number;
  speaker: 'user' | 'other';
  text: string;
}

export type SuggestionType = 'question' | 'talking_point' | 'answer' | 'fact_check' | 'clarification' | 'short' | 'detailed';

export interface SuggestionCard {
  id: string;
  title: string;
  preview: string;
  reasoning: string;
  content: string;
  type: SuggestionType;
  timestamp: number;
}

export interface SuggestionBatch {
  id: string;
  timestamp: number;
  suggestions: SuggestionCard[];
  contextSummary: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AppSettings {
  groqApiKey: string;
  liveSuggestionPrompt: string;
  detailedAnswerPrompt: string;
  chatPrompt: string;
  contextWindowSize: number;
}

export type RecordingState = 'idle' | 'recording' | 'processing' | 'error';

export interface AudioChunk {
  id: string;
  blob: Blob;
  timestamp: number;
  duration: number;
  index: number;
}

export interface RecordingError {
  type: 'permission_denied' | 'mic_unavailable' | 'transcription_failed' | 'unknown';
  message: string;
}
