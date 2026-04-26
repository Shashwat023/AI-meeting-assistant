import type { TranscriptEntry, SuggestionBatch, ChatMessage } from '../types';

export interface SessionExport {
  version: '1.0';
  exportedAt: string;
  session: {
    startedAt: string;
    endedAt: string;
    durationMinutes: number;
  };
  summary: {
    totalTranscriptEntries: number;
    totalSuggestionBatches: number;
    totalSuggestions: number;
    totalChatMessages: number;
    userMessages: number;
    assistantMessages: number;
  };
  transcript: TranscriptEntry[];
  suggestionBatches: SuggestionBatch[];
  chatHistory: ChatMessage[];
  metadata: {
    exportFormat: 'json' | 'txt';
    includesTranscript: boolean;
    includesSuggestions: boolean;
    includesChat: boolean;
  };
}

function formatDuration(startTime: number, endTime: number): number {
  return Math.round((endTime - startTime) / 60000 * 10) / 10;
}

function sanitizeForJSON(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (typeof value === 'function') return undefined;
    if (value instanceof Error) return value.message;
    return value;
  }));
}

export function buildSessionExport(
  transcript: TranscriptEntry[],
  suggestionBatches: SuggestionBatch[],
  chatMessages: ChatMessage[],
  format: 'json' | 'txt' = 'json'
): SessionExport {
  const now = Date.now();
  const startTime = transcript.length > 0 ? transcript[0].timestamp : now;

  const userMessages = chatMessages.filter(m => m.role === 'user').length;
  const assistantMessages = chatMessages.filter(m => m.role === 'assistant').length;
  const totalSuggestions = suggestionBatches.reduce((sum, batch) => sum + batch.suggestions.length, 0);

  return {
    version: '1.0',
    exportedAt: new Date(now).toISOString(),
    session: {
      startedAt: new Date(startTime).toISOString(),
      endedAt: new Date(now).toISOString(),
      durationMinutes: formatDuration(startTime, now),
    },
    summary: {
      totalTranscriptEntries: transcript.length,
      totalSuggestionBatches: suggestionBatches.length,
      totalSuggestions,
      totalChatMessages: chatMessages.length,
      userMessages,
      assistantMessages,
    },
    transcript: sanitizeForJSON(transcript) as TranscriptEntry[],
    suggestionBatches: sanitizeForJSON(suggestionBatches) as SuggestionBatch[],
    chatHistory: sanitizeForJSON(chatMessages) as ChatMessage[],
    metadata: {
      exportFormat: format,
      includesTranscript: transcript.length > 0,
      includesSuggestions: suggestionBatches.length > 0,
      includesChat: chatMessages.length > 0,
    },
  };
}

export function exportToJSON(
  transcript: TranscriptEntry[],
  suggestionBatches: SuggestionBatch[],
  chatMessages: ChatMessage[]
): string {
  const exportData = buildSessionExport(transcript, suggestionBatches, chatMessages, 'json');
  return JSON.stringify(exportData, null, 2);
}

export function exportToTXT(
  transcript: TranscriptEntry[],
  suggestionBatches: SuggestionBatch[],
  chatMessages: ChatMessage[]
): string {
  const data = buildSessionExport(transcript, suggestionBatches, chatMessages, 'txt');
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                    TWINMIND SESSION EXPORT');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');
  lines.push(`Exported: ${data.exportedAt}`);
  lines.push(`Session Duration: ${data.session.durationMinutes} minutes`);
  lines.push('');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push('                         SUMMARY');
  lines.push('───────────────────────────────────────────────────────────────');
  lines.push(`Transcript Entries: ${data.summary.totalTranscriptEntries}`);
  lines.push(`Suggestion Batches: ${data.summary.totalSuggestionBatches}`);
  lines.push(`Total Suggestions: ${data.summary.totalSuggestions}`);
  lines.push(`Chat Messages: ${data.summary.totalChatMessages}`);
  lines.push(`  - User: ${data.summary.userMessages}`);
  lines.push(`  - Assistant: ${data.summary.assistantMessages}`);
  lines.push('');

  if (data.transcript.length > 0) {
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                      TRANSCRIPT');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    data.transcript.forEach((entry, i) => {
      const time = new Date(entry.timestamp).toLocaleTimeString();
      const speaker = entry.speaker === 'user' ? 'You' : 'Other';
      lines.push(`[${time}] ${speaker}:`);
      lines.push(`  ${entry.text}`);
      lines.push('');
    });
  }

  if (data.suggestionBatches.length > 0) {
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                      SUGGESTIONS');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    data.suggestionBatches.forEach((batch, batchIndex) => {
      const batchTime = new Date(batch.timestamp).toLocaleTimeString();
      lines.push(`--- Batch ${batchIndex + 1} (${batchTime}) ---`);
      lines.push(`Context: ${batch.contextSummary}`);
      lines.push('');
      batch.suggestions.forEach((suggestion, i) => {
        lines.push(`${i + 1}. [${suggestion.type.toUpperCase()}] ${suggestion.title}`);
        lines.push(`   Preview: ${suggestion.preview}`);
        lines.push(`   Reasoning: ${suggestion.reasoning}`);
        lines.push('');
      });
    });
  }

  if (data.chatHistory.length > 0) {
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('                    CHAT HISTORY');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    data.chatHistory.forEach((msg) => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const role = msg.role === 'user' ? 'You' : 'Assistant';
      lines.push(`[${time}] ${role}:`);
      lines.push(`  ${msg.content}`);
      lines.push('');
    });
  }

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('                      END OF EXPORT');
  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function downloadExport(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateFilename(format: 'json' | 'txt'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `twinmind-session-${timestamp}.${format}`;
}
