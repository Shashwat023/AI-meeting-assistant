'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '../store/appStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import {
  exportToJSON,
  exportToTXT,
  downloadExport,
  generateFilename,
} from '../services/exportService';
import {
  Mic,
  RefreshCw,
  Settings,
  Brain,
  Loader2,
  AlertCircle,
  Radio,
  FileJson,
  FileText,
} from 'lucide-react';

export function Toolbar() {
  const { recordingState, recordingError, toggleRecording, currentChunkIndex } = useAudioRecorder();
  const [isExporting, setIsExporting] = useState(false);

  // Use getState for actions to avoid re-render loops
  const handleToggleSettings = () => useAppStore.getState().toggleSettings();
  const handleClearTranscript = () => useAppStore.getState().clearTranscript();

  // Get data for export
  const transcript = useAppStore((state) => state.transcript);
  const suggestionBatches = useAppStore((state) => state.suggestionBatches);
  const chatMessages = useAppStore((state) => state.chatMessages);

  const hasData = transcript.length > 0 || suggestionBatches.length > 0 || chatMessages.length > 0;

  const handleExportJSON = useCallback(() => {
    if (!hasData) return;
    setIsExporting(true);
    try {
      const content = exportToJSON(transcript, suggestionBatches, chatMessages);
      const filename = generateFilename('json');
      downloadExport(content, filename, 'application/json');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [hasData, transcript, suggestionBatches, chatMessages]);

  const handleExportTXT = useCallback(() => {
    if (!hasData) return;
    setIsExporting(true);
    try {
      const content = exportToTXT(transcript, suggestionBatches, chatMessages);
      const filename = generateFilename('txt');
      downloadExport(content, filename, 'text/plain');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [hasData, transcript, suggestionBatches, chatMessages]);

  const getButtonContent = () => {
    switch (recordingState) {
      case 'recording':
        return (
          <>
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="hidden sm:inline">Recording</span>
            {currentChunkIndex > 0 && (
              <span className="text-xs opacity-75">#{currentChunkIndex}</span>
            )}
          </>
        );
      case 'processing':
        return (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Processing</span>
          </>
        );
      case 'error':
        return (
          <>
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Error</span>
          </>
        );
      default:
        return (
          <>
            <Mic className="w-4 h-4" />
            <span className="hidden sm:inline">Start</span>
          </>
        );
    }
  };

  const getButtonStyles = () => {
    switch (recordingState) {
      case 'recording':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'processing':
        return 'bg-amber-600 hover:bg-amber-700 text-white cursor-wait';
      case 'error':
        return 'bg-red-500 hover:bg-red-600 text-white';
      default:
        return '';
    }
  };

  const handleClear = () => {
    handleClearTranscript();
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-lg font-semibold text-foreground">TwinMind</h1>
        {recordingState === 'recording' && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Recording Error Indicator */}
        {recordingError && (
          <span className="hidden md:inline text-xs text-red-600 max-w-[200px] truncate" title={recordingError.message}>
            {recordingError.message}
          </span>
        )}

        {/* Mic Toggle */}
        <Button
          variant={recordingState === 'idle' ? 'outline' : 'default'}
          size="sm"
          onClick={toggleRecording}
          disabled={recordingState === 'processing'}
          className={`gap-2 ${getButtonStyles()}`}
        >
          {getButtonContent()}
        </Button>

        {/* Clear Transcript */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="hidden sm:inline">Clear</span>
        </Button>

        {/* Export JSON */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportJSON}
          disabled={!hasData || isExporting}
          className="gap-2 px-2"
          title="Export as JSON"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileJson className="w-4 h-4" />
          )}
          <span className="hidden lg:inline">JSON</span>
        </Button>

        {/* Export TXT */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportTXT}
          disabled={!hasData || isExporting}
          className="gap-2 px-2"
          title="Export as Text"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileText className="w-4 h-4" />
          )}
          <span className="hidden lg:inline">TXT</span>
        </Button>

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleSettings}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </div>
    </header>
  );
}
