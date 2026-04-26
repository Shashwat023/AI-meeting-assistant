'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '../store/appStore';
import { useChat } from '../hooks/useChat';
import { MessageSquare, User, Bot, Send, Loader2 } from 'lucide-react';

export function ChatPanel() {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMessages = useAppStore((state) => state.chatMessages);
  const isTyping = useAppStore((state) => state.isTyping);
  const { sendManualMessage, isLoading } = useChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, isTyping]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    const text = inputValue;
    setInputValue('');
    await sendManualMessage(text);
    inputRef.current?.focus();
  }, [inputValue, isLoading, sendManualMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#12121a]">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <h2 className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">Chat</h2>
        </div>
        <span className="text-[10px] text-white/40 font-mono tabular-nums">
          {chatMessages.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-3">
          {chatMessages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center py-8 text-white/40">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center mb-3 border border-white/[0.06]">
                <MessageSquare className="w-5 h-5 text-indigo-500/50" />
              </div>
              <p className="text-xs font-medium text-white/60">Ask anything</p>
              <p className="text-[10px] mt-1 text-white/30 text-center px-4">
                Get answers based on the conversation
              </p>
            </div>
          )}
          
          {chatMessages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-2 ${message.role === 'user' ? 'flex-row' : 'flex-row'}`}
            >
              <div
                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-offset-1 ring-offset-[#12121a] ${
                  message.role === 'user'
                    ? 'bg-indigo-500/20 text-indigo-400 ring-indigo-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-3 h-3" />
                ) : (
                  <Bot className="w-3 h-3" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={`px-3 py-2 rounded-lg border ${
                    message.role === 'user'
                      ? 'bg-indigo-500/10 border-indigo-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[11px] font-medium ${
                        message.role === 'user'
                          ? 'text-indigo-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {message.role === 'user' ? 'You' : 'AI'}
                    </span>
                    <span className="text-[10px] text-white/30 font-mono tabular-nums">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">
                    {message.content}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-2">
              <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 ring-2 ring-offset-1 ring-offset-[#12121a] ring-emerald-500/30">
                <Bot className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-medium text-emerald-400">AI</span>
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                  </div>
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-500/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>
      <div className="p-3 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask about the conversation..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-xs bg-white/[0.05] border border-white/[0.08] rounded-lg text-white/90 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 transition-all duration-150 disabled:opacity-40"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white transition-all duration-150 disabled:opacity-40 disabled:hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
