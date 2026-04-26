# TwinMind - AI Meeting Assistant

A real-time AI meeting assistant that transcribes conversations, generates contextual suggestions, and provides an interactive chat interface for deeper insights.

## Features

- **Real-time Transcription**: Records audio in 20-second chunks and transcribes using Groq Whisper
- **Live Suggestions**: Generates contextual suggestions (questions, talking points, answers, fact checks) based on conversation
- **Interactive Chat**: Click suggestions to get detailed explanations or ask custom questions
- **Export**: Download full session as JSON or formatted text
- **Typing Animation**: Natural character-by-character response display

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand |
| Icons | Lucide React |
| AI/ML | Groq API (Whisper + LLaMA) |

## Quick Start

### Prerequisites

- Node.js 18+ 
- Groq API key ([get one free](https://console.groq.com))

### Installation

```bash
# Clone the repository
cd my-app

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Setup

1. Click **Settings** in the top toolbar
2. Paste your Groq API key
3. Click **Start** to begin recording
4. Speak naturally - transcription appears in real-time
5. Suggestions generate automatically every 3+ transcript entries
6. Click **Chat** on any suggestion for detailed answers
7. Or type directly in the chat panel
8. Export your session with **JSON** or **TXT** buttons

## Groq API Key

The app uses Groq's fast inference API:
- **Transcription**: `whisper-large-v3` (audio → text)
- **Suggestions**: `llama-3.3-70b-versatile` (context → suggestions)
- **Chat**: `llama-3.3-70b-versatile` (context + query → response)

API key is stored in browser memory only (Zustand state). No server-side storage.

## Prompt Strategy

### 1. Live Suggestions
- Triggered: After 3+ new transcript entries (debounced 2s)
- Context: Last 10 transcript entries
- Output: Exactly 3 structured suggestions with title, preview, reasoning, type
- Constraint: Must reference actual transcript content, no generic filler

### 2. Detailed Answers (Suggestion Click)
- Context: Full transcript + clicked suggestion metadata
- Style: 3-5 sentences, actionable, references specific transcript details
- Temperature: 0.7 for balanced creativity/consistency

### 3. Chat Responses (Manual Question)
- Context: Full transcript + recent chat history (last 6 messages) + question
- Style: Direct, thorough, maintains conversation continuity
- Temperature: 0.7

All prompts are editable in Settings for customization.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐  │
│  │ Transcript  │  │ Suggestions│  │ Chat                │  │
│  │   Panel     │  │   Panel      │  │ Panel               │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼─────────────────────┼─────────────┘
          │                │                     │
          └────────────────┴──────────┬──────────┘
                                        │
                              ┌─────────▼─────────┐
                              │    Zustand Store   │
                              │  (State Management)│
                              └─────────┬─────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
┌─────────▼─────────┐        ┌──────────▼──────────┐    ┌──────────────▼──────────┐
│   useAudioRecorder│        │   useSuggestions    │    │      useChat            │
│   (Audio + Trans) │        │   (AI Suggestions)  │    │  (Chat + Detailed Ans) │
└─────────┬─────────┘        └──────────┬──────────┘    └──────────────┬──────────┘
          │                             │                             │
┌─────────▼─────────┐        ┌──────────▼──────────┐    ┌──────────────▼──────────┐
│transcriptionService│        │  suggestionService  │    │      chatService        │
│   (Groq Whisper)    │        │   (Groq LLaMA)      │    │     (Groq LLaMA)        │
└─────────────────────┘        └─────────────────────┘    └─────────────────────────┘
```

## Data Flow

1. **Audio Recording**: 20s chunks → `useAudioRecorder` → `transcriptionService` → Store
2. **Suggestions**: Store transcript changes → `useSuggestions` → `suggestionService` → Store batches
3. **Chat**: User click/type → `useChat` → `chatService` → Typing animation → Store
4. **Export**: Store data → `exportService` → JSON/TXT download

## Session Lifecycle

- **Start**: Recording begins, blank slate (no persistence)
- **Active**: Transcription accumulates, suggestions generate periodically
- **Chat**: User interactions recorded in continuous thread
- **Export**: Full session dump with metadata
- **Reload**: Fresh blank session (intentional - no storage)

## Known Tradeoffs

| Decision | Rationale |
|----------|-----------|
| No persistence | Privacy-first; each session is ephemeral |
| 20s audio chunks | Balance between latency (faster transcribe) and accuracy |
| Non-streaming API | Reliability over speed; typing effect compensates UX |
| Single Groq model | Simpler stack; 70B model handles all tasks well |
| Client-side only | No backend needed; API key stays in browser |
| Zustand vs Redux | Smaller bundle, simpler for single-page app |
| shadcn/ui | Consistent, accessible components without heavy CSS |

## Limitations

- Requires Groq API key (free tier available)
- Browser microphone permissions required
- No real-time streaming (20s chunks)
- No persistent storage between reloads
- Suggestions quality depends on transcription accuracy
- Chat history limited to ~6 messages for context window

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

### Netlify

```bash
npm run build
netlify deploy --prod --dir=.next
```

### Environment Variables

None required - the app runs entirely client-side. Users provide their own Groq API key in the UI.

## File Structure

```
app/
├── components/          # UI components
│   ├── Toolbar.tsx      # Header with controls
│   ├── TranscriptPanel.tsx
│   ├── SuggestionsPanel.tsx
│   ├── ChatPanel.tsx
│   └── SettingsPanel.tsx
├── hooks/               # Business logic
│   ├── useAudioRecorder.ts   # Audio + transcription
│   ├── useSuggestions.ts     # AI suggestion generation
│   └── useChat.ts            # Chat + detailed answers
├── services/            # API calls
│   ├── transcriptionService.ts
│   ├── suggestionService.ts
│   ├── chatService.ts
│   └── exportService.ts
├── store/
│   └── appStore.ts      # Zustand state
├── types/
│   └── index.ts         # TypeScript definitions
├── utils/
│   ├── contextBuilder.ts    # LLM context assembly
│   └── suggestionParser.ts  # JSON parsing helpers
└── page.tsx             # Main layout
```

## Development

```bash
# Dev server
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

## License

MIT
