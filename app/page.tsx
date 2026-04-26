'use client';

import { useState, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { TranscriptPanel } from './components/TranscriptPanel';
import { SuggestionsPanel } from './components/SuggestionsPanel';
import { ChatPanel } from './components/ChatPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ResizeHandle } from './components/ResizeHandle';

const MIN_PANEL_WIDTH = 240;
const MAX_PANEL_WIDTH = 480;
const DEFAULT_LEFT_WIDTH = 280;
const DEFAULT_RIGHT_WIDTH = 300;

export default function Home() {
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);

  const handleLeftResize = useCallback((delta: number) => {
    setLeftWidth((prev) => {
      const newWidth = prev + delta;
      return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));
    });
  }, []);

  const handleRightResize = useCallback((delta: number) => {
    setRightWidth((prev) => {
      const newWidth = prev - delta;
      return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, newWidth));
    });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0f] overflow-hidden">
      <Toolbar />
      <main className="flex-1 flex min-h-0 p-3 gap-0">
        {/* Left Panel - Transcript */}
        <div
          className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden border border-white/[0.06] bg-[#12121a] shadow-xl shadow-black/20"
          style={{ width: leftWidth }}
        >
          <TranscriptPanel />
        </div>

        {/* Left Resize Handle */}
        <ResizeHandle direction="horizontal" onResize={handleLeftResize} />

        {/* Center Panel - Suggestions */}
        <div className="flex-1 flex flex-col rounded-xl overflow-hidden border border-white/[0.06] bg-[#12121a] shadow-xl shadow-black/20 min-w-[400px]">
          <SuggestionsPanel />
        </div>

        {/* Right Resize Handle */}
        <ResizeHandle direction="horizontal" onResize={handleRightResize} />

        {/* Right Panel - Chat */}
        <div
          className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden border border-white/[0.06] bg-[#12121a] shadow-xl shadow-black/20"
          style={{ width: rightWidth }}
        >
          <ChatPanel />
        </div>
      </main>
      <SettingsPanel />
    </div>
  );
}
