import { Toolbar } from './components/Toolbar';
import { TranscriptPanel } from './components/TranscriptPanel';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <Toolbar />
      <main className="flex-1 grid grid-cols-1 md:grid-cols-[280px_1fr_300px] lg:grid-cols-[300px_1fr_320px] min-h-0">
        <TranscriptPanel />
        <SuggestionsPanel />
        <ChatPanel />
      </main>
      <SettingsPanel />
    </div>
  );
}
