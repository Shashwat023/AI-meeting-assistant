import { create } from 'zustand';
import type { TranscriptEntry, SuggestionCard, SuggestionBatch, ChatMessage, AppSettings, RecordingState, RecordingError } from '../types';

// Default settings
const defaultSettings: AppSettings = {
  groqApiKey: '',
  liveSuggestionPrompt: `You are an intelligent meeting assistant. Based on the conversation transcript provided, generate EXACTLY 3 helpful, context-aware suggestions.

Each suggestion must be one of these types:
- "question": A smart question to ask to advance the discussion
- "talking_point": An interesting angle or perspective to bring up
- "answer": A concise answer to a question that was just asked
- "fact_check": A relevant fact to verify or clarify
- "clarification": A point that needs clarification

Requirements:
1. Output MUST be a valid JSON array with exactly 3 objects
2. Each object must have: title (string), preview (string, max 100 chars), reasoning (string, detailed), type (one of the 5 types above)
3. Suggestions must be varied (don't have 3 questions in a row)
4. Be specific - reference actual content from the transcript
5. No generic filler like "ask for clarification" without specifics

Output format:
[
  {"title": "...", "preview": "...", "reasoning": "...", "type": "..."},
  {"title": "...", "preview": "...", "reasoning": "...", "type": "..."},
  {"title": "...", "preview": "...", "reasoning": "...", "type": "..."}
]`,
  detailedAnswerPrompt: 'Provide a comprehensive, well-structured answer based on the conversation context. Include key points, reasoning, and actionable recommendations.',
  chatPrompt: 'You are a helpful AI assistant embedded in a meeting context. Answer questions based on the conversation transcript provided. Be concise but thorough.',
  contextWindowSize: 10,
};

// Fixed base timestamp for SSR consistency
const BASE_TIMESTAMP = 1745586000000;

// Mock transcript data
const mockTranscript: TranscriptEntry[] = [
  {
    id: '1',
    timestamp: BASE_TIMESTAMP - 300000,
    speaker: 'other',
    text: "Let's discuss the Q4 roadmap and priorities for the engineering team.",
  },
  {
    id: '2',
    timestamp: BASE_TIMESTAMP - 240000,
    speaker: 'user',
    text: 'I think we should prioritize performance improvements and technical debt reduction.',
  },
  {
    id: '3',
    timestamp: BASE_TIMESTAMP - 180000,
    speaker: 'other',
    text: "What's the timeline for the database refactor? We need to plan around the holiday freeze.",
  },
  {
    id: '4',
    timestamp: BASE_TIMESTAMP - 120000,
    speaker: 'user',
    text: 'We can ship phase 1 by mid-November if we focus on the core tables first.',
  },
  {
    id: '5',
    timestamp: BASE_TIMESTAMP - 60000,
    speaker: 'other',
    text: 'Can you elaborate on the performance targets? What metrics are we aiming for?',
  },
  {
    id: '6',
    timestamp: BASE_TIMESTAMP - 30000,
    speaker: 'user',
    text: 'We are targeting a 40% reduction in query latency and 50% improvement in cache hit rates.',
  },
];

// Mock suggestions data
const mockSuggestions: SuggestionCard[] = [
  {
    id: '1',
    timestamp: BASE_TIMESTAMP - 200000,
    title: 'Key Performance Metrics',
    preview: 'Highlight specific benchmarks: p95 latency under 100ms, 99th percentile under 200ms.',
    reasoning: 'The conversation is discussing performance improvements. Providing specific, measurable targets (p95 < 100ms, p99 < 200ms) gives the team concrete goals. The monitoring dashboard reference helps them track progress immediately.',
    content: 'Highlight specific benchmarks: p95 latency under 100ms, 99th percentile under 200ms. Mention monitoring dashboard at /perf.',
    type: 'talking_point',
  },
  {
    id: '2',
    timestamp: BASE_TIMESTAMP - 150000,
    title: 'Refactor Timeline Breakdown',
    preview: 'Phase 1: Core tables (users, sessions) - Nov 15. Phase 2: Analytics - Dec 1.',
    reasoning: 'A structured timeline helps teams plan resources and dependencies. Breaking the refactor into phases reduces risk and allows for incremental validation. Mentioning DevOps coordination ensures infrastructure readiness.',
    content: 'Phase 1: Core tables (users, sessions) - Nov 15\\nPhase 2: Analytics tables - Dec 1\\nPhase 3: Archive tables - Jan 15\\nCoordinate with DevOps for staging environment.',
    type: 'fact_check',
  },
  {
    id: '3',
    timestamp: BASE_TIMESTAMP - 80000,
    title: 'Q4 Milestone Proposal',
    preview: 'Propose a structured approach with 4 key milestones from Oct 30 to Dec 15.',
    reasoning: 'Having clear milestones keeps projects on track. The proposed dates (baseline Oct 30, kickoff Nov 1, review Nov 15, delivery Dec 15) create accountability and checkpoints for course correction.',
    content: 'Propose a structured approach: (1) Performance baseline by Oct 30, (2) Refactor kickoff Nov 1, (3) Mid-quarter review Nov 15, (4) Final delivery Dec 15.',
    type: 'question',
  },
];

// Mock chat messages
const mockChat: ChatMessage[] = [
  {
    id: '1',
    timestamp: BASE_TIMESTAMP - 250000,
    role: 'user',
    content: 'Summarize the roadmap discussion so far.',
  },
  {
    id: '2',
    timestamp: BASE_TIMESTAMP - 245000,
    role: 'assistant',
    content: 'The team is discussing Q4 priorities focusing on two main areas: (1) Performance improvements targeting 40% query latency reduction and 50% cache improvement, and (2) A database refactor scheduled in three phases through January.',
  },
  {
    id: '3',
    timestamp: BASE_TIMESTAMP - 90000,
    role: 'user',
    content: 'What are the specific performance goals mentioned?',
  },
  {
    id: '4',
    timestamp: BASE_TIMESTAMP - 85000,
    role: 'assistant',
    content: 'The user mentioned targeting a 40% reduction in query latency and a 50% improvement in cache hit rates. These are ambitious but achievable goals that align with the technical debt reduction initiative.',
  },
];

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

  // Initial transcript
  transcript: mockTranscript,
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

  // Initial suggestions
  suggestions: mockSuggestions,
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

  // Initial chat
  chatMessages: mockChat,
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
      transcript: mockTranscript,
      suggestions: mockSuggestions,
      suggestionBatches: [],
      chatMessages: mockChat,
    }),
}));
