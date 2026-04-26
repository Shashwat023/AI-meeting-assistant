import { create } from 'zustand';
import type { TranscriptEntry, SuggestionCard, SuggestionBatch, ChatMessage, AppSettings, RecordingState, RecordingError } from '../types';

// Default settings
const defaultSettings: AppSettings = {
  groqApiKey: '',
  liveSuggestionPrompt: `You are a live meeting copilot generating instant, scannable suggestions. Based on the conversation transcript, generate EXACTLY 3 compact, high-signal suggestions.

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
]`,
  detailedAnswerPrompt: `You are a live meeting copilot. The user clicked a suggestion and needs an instant, actionable answer.

Your task:
1. Lead with the direct answer - 1-2 sentences maximum
2. Reference specific transcript details only if essential
3. NO intro phrases like "Based on the conversation..." or "I recommend that you..."
4. NO summary sentences at the end
5. Strip all filler words. Every word must convey value.
6. Be direct, punchy, and immediately usable`,
  chatPrompt: `You are a live meeting copilot answering questions in real-time.

Your task:
1. Answer immediately - 1-2 sentences max
2. Lead with the core answer, not preamble
3. Reference transcript details only if critical
4. NO phrases like "Based on the transcript..." or "It seems like..."
5. NO summary at the end
6. Strip filler. Be punchy and direct.
7. Every word must earn its place on screen`,
  contextWindowSize: 10,
};

interface AppState {
  // Settings
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Transcript
  transcript: TranscriptEntry[];
  addTranscriptEntry: (entry: Omit<TranscriptEntry, 'id' | 'timestamp'>) => void;
  addTranscriptChunk: (text: string, chunkIndex: number) => void;
  clearTranscript: () => void;

  // Suggestions
  suggestions: SuggestionCard[]; // Legacy - for backward compatibility
  suggestionBatches: SuggestionBatch[];
  addSuggestion: (suggestion: Omit<SuggestionCard, 'id' | 'timestamp'>) => void;
  addSuggestionBatch: (suggestions: SuggestionCard[], contextSummary: string) => void;
  clearSuggestions: () => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  clearChat: () => void;
  isTyping: boolean;
  setTyping: (isTyping: boolean) => void;

  // Recording State
  recordingState: RecordingState;
  recordingError: RecordingError | null;
  currentChunkIndex: number;
  setRecordingState: (state: RecordingState) => void;
  setRecordingError: (error: RecordingError | null) => void;
  incrementChunkIndex: () => void;
  resetChunkIndex: () => void;

  // Legacy UI State (for backward compatibility)
  isMicActive: boolean;
  isSettingsOpen: boolean;
  toggleMic: () => void;
  toggleSettings: () => void;
  setSettingsOpen: (open: boolean) => void;

  // Actions
  resetMockData: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial settings
  settings: defaultSettings,
  updateSettings: (newSettings) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  // Initial transcript (empty - no demo data)
  transcript: [],
  addTranscriptEntry: (entry) =>
    set((state) => ({
      transcript: [
        ...state.transcript,
        {
          ...entry,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
        },
      ],
    })),

  // Initial suggestions (empty - no demo data)
  suggestions: [],
  suggestionBatches: [],
  addSuggestion: (suggestion) =>
    set((state) => ({
      suggestions: [
        ...state.suggestions,
        {
          ...suggestion,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
        },
      ],
    })),
  addSuggestionBatch: (suggestions, contextSummary) =>
    set((state) => {
      const newBatch: SuggestionBatch = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
        suggestions,
        contextSummary,
      };
      return {
        suggestionBatches: [newBatch, ...state.suggestionBatches],
        // Also add to legacy suggestions for backward compatibility
        suggestions: [...suggestions, ...state.suggestions],
      };
    }),
  clearSuggestions: () =>
    set(() => ({
      suggestions: [],
      suggestionBatches: [],
    })),

  // Initial chat (empty - no demo data)
  chatMessages: [],
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        {
          ...message,
          id: Math.random().toString(36).substring(2, 9),
          timestamp: Date.now(),
        },
      ],
    })),
  clearChat: () => set({ chatMessages: [] }),
  isTyping: false,
  setTyping: (typing) => set({ isTyping: typing }),

  // Transcript chunk management
  addTranscriptChunk: (text, chunkIndex) => {
    const trimmedText = text.trim();
    console.log(`[AppStore] Adding transcript chunk ${chunkIndex}: "${trimmedText.substring(0, 60)}${trimmedText.length > 60 ? '...' : ''}"`);
    set((state) => ({
      transcript: [
        ...state.transcript,
        {
          id: `chunk-${chunkIndex}-${Math.random().toString(36).substring(2, 5)}`,
          timestamp: Date.now(),
          speaker: 'user',
          text: trimmedText,
        },
      ],
    }));
    console.log(`[AppStore] Transcript now has ${useAppStore.getState().transcript.length} entries`);
  },
  clearTranscript: () => set({ transcript: [] }),

  // Recording state
  recordingState: 'idle',
  recordingError: null,
  currentChunkIndex: 0,
  setRecordingState: (newState) => set({ recordingState: newState }),
  setRecordingError: (error) => set({ recordingError: error }),
  incrementChunkIndex: () => set((state) => ({ currentChunkIndex: state.currentChunkIndex + 1 })),
  resetChunkIndex: () => set({ currentChunkIndex: 0 }),

  // Legacy UI state (sync with recording state)
  isMicActive: false,
  isSettingsOpen: false,
  toggleMic: () => set((state) => ({ isMicActive: !state.isMicActive })),
  toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),

  // Actions
  resetMockData: () =>
    set({
      transcript: [],
      suggestions: [],
      suggestionBatches: [],
      chatMessages: [],
    }),
}));
