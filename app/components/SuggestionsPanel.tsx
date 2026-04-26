'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppStore } from '../store/appStore';
import { useSuggestions } from '../hooks/useSuggestions';
import { useChat } from '../hooks/useChat';
import type { SuggestionCard, SuggestionType } from '../types';
import {
  Lightbulb,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  Send,
} from 'lucide-react';

const typeConfig: Record<SuggestionType, { label: string; icon: React.ElementType; color: string; gradient: string }> = {
  question: { label: 'Question', icon: HelpCircle, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', gradient: 'from-cyan-500/20 to-blue-500/20' },
  talking_point: { label: 'Talking Point', icon: MessageSquare, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', gradient: 'from-emerald-500/20 to-teal-500/20' },
  answer: { label: 'Answer', icon: CheckCircle, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', gradient: 'from-indigo-500/20 to-violet-500/20' },
  fact_check: { label: 'Fact Check', icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', gradient: 'from-amber-500/20 to-orange-500/20' },
  clarification: { label: 'Clarification', icon: Info, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', gradient: 'from-rose-500/20 to-pink-500/20' },
  short: { label: 'Quick', icon: MessageSquare, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', gradient: 'from-cyan-500/20 to-blue-500/20' },
  detailed: { label: 'Detailed', icon: MessageSquare, color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', gradient: 'from-violet-500/20 to-purple-500/20' },
};

// UI truncation helpers to enforce max lengths even if model ignores instructions
const MAX_PREVIEW_LENGTH = 60;
const MAX_REASONING_LENGTH = 120;
const MAX_TITLE_LENGTH = 30; // Roughly 5 words

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + '...';
}

function SuggestionCardItem({
  suggestion,
  onChatClick,
  isLoadingChat,
}: {
  suggestion: SuggestionCard;
  onChatClick: (suggestion: SuggestionCard) => void;
  isLoadingChat: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = typeConfig[suggestion.type] || typeConfig.talking_point;
  const Icon = typeInfo.icon;

  // Apply UI-level truncation guardrails
  const displayTitle = truncateText(suggestion.title, MAX_TITLE_LENGTH);
  const displayPreview = truncateText(suggestion.preview, MAX_PREVIEW_LENGTH);
  const displayReasoning = truncateText(suggestion.reasoning, MAX_REASONING_LENGTH);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div 
      className={`
        group relative rounded-lg overflow-hidden border transition-all duration-150
        ${expanded 
          ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] border-white/[0.12]' 
          : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05]'
        }
      `}
    >
      {/* Gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${typeInfo.gradient} opacity-60`} />
      
      <div className="px-3 py-2.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="text-xs font-semibold text-white/90 flex-1 line-clamp-1 leading-tight">
            {displayTitle}
          </h4>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeInfo.color} flex items-center gap-1 shrink-0 font-medium`}>
            <Icon className="w-3 h-3" />
            {typeInfo.label}
          </span>
        </div>
        
        <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
          {displayPreview}
        </p>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-[11px] text-white/50 leading-relaxed">
              <span className="font-medium text-white/70">Why: </span>
              {displayReasoning}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1.5 text-[10px] text-white/40 tabular-nums">
            <Clock className="w-3 h-3" />
            <span>{formatTime(suggestion.timestamp)}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.08] text-white/50 hover:text-white/80 transition-all duration-150"
              title={expanded ? 'Show less' : 'Show more'}
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => onChatClick(suggestion)}
              disabled={isLoadingChat}
              className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 hover:text-indigo-300 transition-all duration-150 disabled:opacity-40"
              title="Ask AI about this"
            >
              {isLoadingChat ? (
                <div className="w-3 h-3 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchSection({
  batch,
  isLatest,
  onChatClick,
  isLoadingChat,
}: {
  batch: { id: string; timestamp: number; suggestions: SuggestionCard[]; contextSummary: string };
  isLatest: boolean;
  onChatClick: (suggestion: SuggestionCard) => void;
  isLoadingChat: boolean;
}) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className={`space-y-2 ${isLatest ? '' : 'opacity-50'}`}>
      <div className="flex items-center gap-2 py-1.5">
        <div className={`h-px flex-1 ${isLatest ? 'bg-gradient-to-r from-transparent to-amber-500/30' : 'bg-white/[0.04]'}`} />
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isLatest ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium' : 'text-white/30'}`}>
          {isLatest ? (
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
              Latest • {batch.contextSummary}
            </span>
          ) : (
            formatTime(batch.timestamp)
          )}
        </span>
        <div className={`h-px flex-1 ${isLatest ? 'bg-gradient-to-l from-transparent to-amber-500/30' : 'bg-white/[0.04]'}`} />
      </div>

      {batch.suggestions.map((suggestion, idx) => (
        <div 
          key={suggestion.id} 
          className={isLatest ? `animate-card-enter stagger-${Math.min(idx + 1, 3)}` : ''}
        >
          <SuggestionCardItem
            suggestion={suggestion}
            onChatClick={onChatClick}
            isLoadingChat={isLoadingChat}
          />
        </div>
      ))}
    </div>
  );
}

export function SuggestionsPanel() {
  const { isLoading, error, refreshSuggestions } = useSuggestions();
  const { sendSuggestionMessage, isLoading: isLoadingChat } = useChat();
  const batches = useAppStore((state) => state.suggestionBatches);
  const clearSuggestions = useCallback(() => {
    useAppStore.getState().clearSuggestions();
  }, []);

  const hasBatches = batches.length > 0;

  const handleChatClick = useCallback(
    async (suggestion: SuggestionCard) => {
      await sendSuggestionMessage(suggestion);
    },
    [sendSuggestionMessage]
  );

  return (
    <div className="flex flex-col h-full bg-[#12121a]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          <h2 className="text-[11px] font-semibold text-white/80 uppercase tracking-wider">Live Suggestions</h2>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-white/40 font-mono tabular-nums">
            {batches.length > 0 ? `${batches.length * 3}` : '0'}
          </span>
          <button
            onClick={refreshSuggestions}
            disabled={isLoading}
            className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.05] hover:bg-white/[0.08] text-white/50 hover:text-white/80 transition-all duration-150 disabled:opacity-40"
            title="Refresh suggestions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {hasBatches && (
            <button
              onClick={clearSuggestions}
              className="flex items-center justify-center w-6 h-6 rounded-md bg-white/[0.05] hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-all duration-150"
              title="Clear suggestions"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-4">
          {/* Error State */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2">
              <div className="text-[11px] text-red-400 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {error}
                </span>
                <button
                  onClick={refreshSuggestions}
                  className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-white/[0.04]" />
                <div className="h-2.5 w-20 bg-white/[0.08] rounded animate-pulse" />
                <div className="h-px flex-1 bg-white/[0.04]" />
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-lg overflow-hidden bg-white/[0.03] border border-white/[0.06]">
                  <div className="px-3 py-2 border-b border-white/[0.04]">
                    <div className="h-3 w-2/3 bg-white/[0.08] rounded animate-pulse" />
                  </div>
                  <div className="px-3 py-2.5 space-y-2">
                    <div className="h-2.5 w-full bg-white/[0.06] rounded animate-pulse" />
                    <div className="h-2.5 w-1/2 bg-white/[0.06] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!hasBatches && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-8 text-white/40">
              <div className="w-10 h-10 rounded-full bg-white/[0.03] flex items-center justify-center mb-3 border border-white/[0.06]">
                <Lightbulb className="w-5 h-5 text-amber-500/50" />
              </div>
              <p className="text-xs font-medium text-white/60">Three fresh ideas every ~30s</p>
              <p className="text-[10px] mt-1.5 text-white/30 text-center px-4 leading-relaxed">
                Newest batch appears on top. Each card is a question, answer, talking point, or fact-check drawn from recent context.
              </p>
            </div>
          )}

          {/* Batches */}
          {batches.map((batch, index) => (
            <BatchSection
              key={batch.id}
              batch={batch}
              isLatest={index === 0}
              onChatClick={handleChatClick}
              isLoadingChat={isLoadingChat}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

