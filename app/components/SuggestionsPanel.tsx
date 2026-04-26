'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const typeConfig: Record<SuggestionType, { label: string; icon: React.ElementType; color: string }> = {
  question: { label: 'Question', icon: HelpCircle, color: 'text-blue-600 bg-blue-50' },
  talking_point: { label: 'Talking Point', icon: MessageSquare, color: 'text-green-600 bg-green-50' },
  answer: { label: 'Answer', icon: CheckCircle, color: 'text-purple-600 bg-purple-50' },
  fact_check: { label: 'Fact Check', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50' },
  clarification: { label: 'Clarification', icon: Info, color: 'text-amber-600 bg-amber-50' },
  short: { label: 'Quick', icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
  detailed: { label: 'Detailed', icon: MessageSquare, color: 'text-purple-600 bg-purple-50' },
};

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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-foreground flex-1">
            {suggestion.title}
          </CardTitle>
          <span className={`text-xs px-2 py-1 rounded-full ${typeInfo.color} flex items-center gap-1 shrink-0`}>
            <Icon className="w-3 h-3" />
            {typeInfo.label}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {suggestion.preview}
        </p>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Why this matters: </span>
              {suggestion.reasoning}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatTime(suggestion.timestamp)}</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3 mr-1" />
                  More
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              onClick={() => onChatClick(suggestion)}
              disabled={isLoadingChat}
            >
              {isLoadingChat ? (
                <>
                  <Skeleton className="w-3 h-3 mr-1" />
                  ...
                </>
              ) : (
                <>
                  <Send className="w-3 h-3 mr-1" />
                  Chat
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
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
    <div className={`space-y-3 ${isLatest ? '' : 'opacity-75'}`}>
      <div className="flex items-center gap-2">
        <div className={`h-px flex-1 ${isLatest ? 'bg-amber-200' : 'bg-border'}`} />
        <span className={`text-xs ${isLatest ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
          {isLatest ? 'Latest' : formatTime(batch.timestamp)} • {batch.contextSummary}
        </span>
        <div className={`h-px flex-1 ${isLatest ? 'bg-amber-200' : 'bg-border'}`} />
      </div>

      {batch.suggestions.map((suggestion) => (
        <SuggestionCardItem
          key={suggestion.id}
          suggestion={suggestion}
          onChatClick={onChatClick}
          isLoadingChat={isLoadingChat}
        />
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
    <div className="flex flex-col h-full border-r border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-foreground">Live Suggestions</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {batches.length > 0 ? `${batches.length * 3} suggestions` : 'No suggestions'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={refreshSuggestions}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {hasBatches && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={clearSuggestions}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertDescription className="text-xs flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={refreshSuggestions}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-px flex-1" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-px flex-1" />
              </div>
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border border-border">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!hasBatches && !isLoading && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Start recording to get live suggestions</p>
              <p className="text-xs mt-1 opacity-75">
                Suggestions appear after 3+ transcript entries
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

