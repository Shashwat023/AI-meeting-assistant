'use client';

import { useAppStore } from '../store/appStore';
import { useEffect, useRef } from 'react';

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

  return (
    <div className="flex flex-col h-full border-r border-border bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Transcript</h2>
        <span className="text-xs text-muted-foreground">
          {transcript.length} entries
        </span>
      </div>
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="p-4 space-y-4">
          {transcript.map((entry) => {
            const chunkIndex = getChunkIndex(entry.id);
            return (
              <div key={entry.id} className="group">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
                      entry.speaker === 'user'
                        ? 'bg-indigo-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium ${
                          entry.speaker === 'user'
                            ? 'text-indigo-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {entry.speaker === 'user' ? 'You' : 'Other'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(entry.timestamp)}
                      </span>
                      {chunkIndex !== null && (
                        <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          #{chunkIndex}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {entry.text}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
