'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
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
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-foreground">Chat</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {chatMessages.length} messages
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {chatMessages.map((message, index) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'flex-row' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Card
                  className={`p-3 border-0 shadow-sm ${
                    message.role === 'user'
                      ? 'bg-indigo-50'
                      : 'bg-emerald-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium ${
                        message.role === 'user'
                          ? 'text-indigo-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {message.role === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p
                    className={`text-sm leading-relaxed ${
                      message.role === 'user'
                        ? 'text-indigo-900'
                        : 'text-emerald-900'
                    }`}
                  >
                    {message.content}
                  </p>
                </Card>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <Card className="p-3 border-0 shadow-sm bg-emerald-50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-emerald-700">Assistant</span>
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                  </div>
                  <div className="flex gap-1 items-center h-5">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </Card>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
