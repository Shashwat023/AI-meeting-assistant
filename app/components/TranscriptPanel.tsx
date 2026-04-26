'use client';

import { useAppStore } from '../store/appStore';
import { useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';

export function TranscriptPanel() {
  const transcript = useAppStore((state) => state.transcript);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current && bottomRef.current && transcript.length > 0) {
      // Use immediate scroll for instant display, smooth only when user hasn't scrolled up
      const scrollContainer = scrollRef.current;
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      
      if (isNearBottom) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [transcript.length, transcript]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Extract chunk index from entry id if it's a chunk
  const getChunkIndex = (entryId: string): number | null => {
    if (entryId.startsWith('chunk-')) {
      const match = entryId.match(/chunk-(\d+)-/);
      return match ? parseInt(match[1], 10) : null;
    }
    return null;
  };

  const isLatestEntry = (index: number) => index === transcript.length - 1;

  return (
    <div className="flex flex-col h-full bg-[#12121a]">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <h2 className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">Transcript</h2>
        </div>
        <span className="text-[10px] text-white/40 font-mono tabular-nums">
          {transcript.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="p-2 space-y-0.5">
          {/* Empty State */}
          {transcript.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-white/40">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center mb-3 border border-white/[0.06]">
                <Mic className="w-5 h-5 text-emerald-500/50" />
              </div>
              <p className="text-xs font-medium text-white/60">Click the mic to start</p>
              <p className="text-[10px] mt-1.5 text-white/30 text-center px-4 leading-relaxed">
                Transcript updates live every ~30 seconds while you speak.
              </p>
            </div>
          )}
          
          {transcript.map((entry, index) => {
            const chunkIndex = getChunkIndex(entry.id);
            const isLatest = isLatestEntry(index);
            return (
              <div 
                key={entry.id} 
                className={`
                  group py-2 px-2.5 rounded-lg transition-all duration-150
                  ${isLatest 
                    ? 'bg-gradient-to-r from-amber-500/10 to-transparent border-l-2 border-amber-500' 
                    : 'hover:bg-white/[0.03] border-l-2 border-transparent'
                  }
                `}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full ring-2 ring-offset-1 ring-offset-[#12121a] ${
                      entry.speaker === 'user'
                        ? 'bg-indigo-400 ring-indigo-500/30'
                        : 'bg-emerald-400 ring-emerald-500/30'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[11px] font-medium ${
                          entry.speaker === 'user'
                            ? 'text-indigo-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {entry.speaker === 'user' ? 'You' : 'Other'}
                      </span>
                      <span className="text-[10px] text-white/30 font-mono tabular-nums">
                        {formatTime(entry.timestamp)}
                      </span>
                      {chunkIndex !== null && (
                        <span className="text-[9px] px-1 py-0.5 bg-white/[0.06] text-white/40 rounded font-mono">
                          #{chunkIndex}
                        </span>
                      )}
                      {isLatest && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-full font-medium">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed ${isLatest ? 'text-white/90' : 'text-white/70'}`}>
                      {entry.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} className="h-2" />
        </div>
      </div>
    </div>
  );
}
