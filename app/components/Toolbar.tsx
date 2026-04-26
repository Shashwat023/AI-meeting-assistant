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
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0f0f14]/80 backdrop-blur-xl z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm font-semibold text-white tracking-tight">TwinMind</h1>
          <span className="text-[10px] text-white/40">AI Meeting Assistant</span>
        </div>
        {recordingState === 'recording' && (
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 ml-2">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-live" />
            REC
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {/* Recording Error Indicator */}
        {recordingError && (
          <span className="hidden md:inline text-[11px] text-red-400 max-w-[200px] truncate mr-2" title={recordingError.message}>
            {recordingError.message}
          </span>
        )}

        {/* Mic Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleRecording}
          disabled={recordingState === 'processing'}
          className={`
            gap-2 h-8 px-3 rounded-lg font-medium transition-all duration-150
            ${recordingState === 'idle' 
              ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white/80 hover:text-white border border-white/[0.06]' 
              : recordingState === 'recording'
                ? 'bg-red-500/15 hover:bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                : recordingState === 'processing'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
            }
          `}
        >
          {getButtonContent()}
        </Button>

        {/* Clear Transcript */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="gap-2 h-8 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white border border-white/[0.06] transition-all duration-150"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Clear</span>
        </Button>

        {/* Export JSON */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportJSON}
          disabled={!hasData || isExporting}
          className="gap-2 h-8 px-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white border border-white/[0.06] transition-all duration-150 disabled:opacity-40"
          title="Export as JSON"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileJson className="w-3.5 h-3.5" />
          )}
          <span className="hidden lg:inline text-xs">JSON</span>
        </Button>

        {/* Export TXT */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportTXT}
          disabled={!hasData || isExporting}
          className="gap-2 h-8 px-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white border border-white/[0.06] transition-all duration-150 disabled:opacity-40"
          title="Export as Text"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <FileText className="w-3.5 h-3.5" />
          )}
          <span className="hidden lg:inline text-xs">TXT</span>
        </Button>

        <div className="w-px h-6 bg-white/[0.08] mx-1" />

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleSettings}
          className="gap-2 h-8 px-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-white/70 hover:text-white border border-white/[0.06] transition-all duration-150"
        >
          <Settings className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs">Settings</span>
        </Button>
      </div>
    </header>
  );
}
