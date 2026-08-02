import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2, Mic, MicOff, Volume2, VolumeX, FileText, Filter, X, Sparkles } from 'lucide-react';
import { Document } from '../../types';

interface ChatInputProps {
  onSendMessage: (text: string, documentId?: string | null) => void;
  sending: boolean;
  documents: Document[];
  selectedDocumentId: string | null;
  onSelectDocument: (docId: string | null) => void;
  autoVoiceEnabled: boolean;
  onToggleAutoVoice: () => void;
  onOpenUpload: () => void;
  hasDocuments: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  sending,
  documents,
  selectedDocumentId,
  onSelectDocument,
  autoVoiceEnabled,
  onToggleAutoVoice,
  onOpenUpload,
  hasDocuments,
}) => {
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Check Web Speech API support
  const SpeechRecognition = typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const isSpeechSupported = !!SpeechRecognition;

  const handleSend = () => {
    if (!text.trim() || sending) return;
    if (isListening) {
      stopListening();
    }
    onSendMessage(text.trim(), selectedDocumentId);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startListening = async () => {
    if (!SpeechRecognition) {
      setSpeechError('Voice input is not supported in this browser.');
      return;
    }

    setSpeechError(null);

    // Request microphone permission explicitly first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop initial permission check stream tracks so speech recognition can use the mic
        stream.getTracks().forEach(track => track.stop());
      } catch (err: any) {
        console.warn('Microphone permission request error:', err);
        setSpeechError('Microphone permission blocked. Please allow microphone access in your browser or open the app in a new tab.');
        return;
      }
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setText(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError('Microphone permission blocked. Please allow microphone access in your browser or open the app in a new tab.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError('Could not start microphone');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [text]);

  const activeDoc = documents.find(d => d.id === selectedDocumentId);

  return (
    <div className="p-3 sm:p-4 bg-[#0A0A0A] border-t border-white/10 space-y-2">
      {/* Top Controls Bar: Document Selector & Voice Assistant Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        {/* Document Selection Dropdown / Indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#808080] shrink-0 flex items-center gap-1">
            <Filter className="w-3 h-3 text-[#FEF08A]" />
            Target Document:
          </span>

          <div className="relative inline-block max-w-xs sm:max-w-md min-w-0">
            <select
              value={selectedDocumentId || ''}
              onChange={e => onSelectDocument(e.target.value || null)}
              className="bg-[#121212] border border-white/20 hover:border-[#FEF08A] text-xs font-mono text-white py-1 pl-2 pr-7 rounded-none focus:outline-none focus:border-[#FEF08A] cursor-pointer truncate max-w-full"
            >
              <option value="">🌐 All Session Documents ({documents.length})</option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>
                  📄 {doc.file_name} ({doc.chunk_count} chunks)
                </option>
              ))}
            </select>
          </div>

          {selectedDocumentId && (
            <button
              onClick={() => onSelectDocument(null)}
              className="p-1 bg-[#FEF08A]/10 text-[#FEF08A] hover:bg-[#FEF08A]/20 border border-[#FEF08A]/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0"
              title="Reset search target to all documents"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Voice Assistant Output Toggle */}
        <button
          onClick={onToggleAutoVoice}
          className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            autoVoiceEnabled
              ? 'bg-[#FEF08A]/10 text-[#FEF08A] border-[#FEF08A]/40'
              : 'bg-[#121212] text-[#808080] border-white/10 hover:border-white/20'
          }`}
          title="When enabled, assistant responses will be automatically read aloud"
        >
          {autoVoiceEnabled ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#FEF08A]" />
              <span>Auto-Read Answers: ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-3.5 h-3.5 text-[#808080]" />
              <span>Auto-Read Answers: OFF</span>
            </>
          )}
        </button>
      </div>

      {/* Active Document Filter Notification Banner */}
      {activeDoc && (
        <div className="p-2 bg-[#FEF08A]/10 border border-[#FEF08A]/30 flex items-center justify-between text-xs text-[#FEF08A] font-mono">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>Queries will strictly perform RAG retrieval ONLY on: <strong>{activeDoc.file_name}</strong></span>
          </div>
          <button
            onClick={() => onSelectDocument(null)}
            className="text-[10px] font-bold uppercase underline hover:text-white shrink-0 ml-2"
          >
            Search All
          </button>
        </div>
      )}

      {/* Speech Listening Live Status Bar */}
      {isListening && (
        <div className="p-2.5 bg-[#121212] border border-[#FEF08A] flex items-center justify-between gap-2 text-xs text-[#FEF08A] font-mono animate-pulse">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="font-bold uppercase tracking-wider">Voice Assistant Listening... Speak your query clearly</span>
          </div>
          <button
            onClick={stopListening}
            className="px-2 py-0.5 bg-[#FEF08A] text-[#0A0A0A] font-black text-[10px] uppercase cursor-pointer hover:bg-white"
          >
            Done Speaking
          </button>
        </div>
      )}

      {speechError && (
        <p className="text-[10px] text-red-400 font-mono">{speechError}</p>
      )}

      {/* Main Input Box */}
      <div className="relative bg-[#121212] border border-white/10 focus-within:border-[#FEF08A] p-2 sm:p-3 transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeDoc
              ? `Query exclusively within "${activeDoc.file_name}"...`
              : hasDocuments
              ? 'Query your entire vector knowledge base...'
              : 'Upload study files or type a question...'
          }
          rows={1}
          disabled={sending}
          className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-[#808080] focus:outline-none resize-none max-h-36 custom-scrollbar pr-12 font-medium"
        />

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenUpload}
              className="p-1.5 text-[#808080] hover:text-[#FEF08A] hover:bg-white/5 transition-colors flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer"
              title="Upload study documents"
            >
              <Paperclip className="w-3.5 h-3.5 text-[#FEF08A]" />
              <span className="hidden sm:inline">Attach Files</span>
            </button>

            {/* Voice Dictation Button */}
            <button
              type="button"
              onClick={toggleListening}
              className={`p-1.5 transition-colors flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider cursor-pointer border ${
                isListening
                  ? 'bg-red-500/20 text-red-400 border-red-500 animate-pulse'
                  : 'text-[#808080] hover:text-[#FEF08A] hover:bg-white/5 border-transparent'
              }`}
              title={isListening ? 'Stop recording voice' : 'Voice Assistant input (Speak query)'}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-red-400">Stop Recording</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-[#FEF08A]" />
                  <span className="hidden sm:inline">Voice Input</span>
                </>
              )}
            </button>

            <span className="text-[10px] text-[#808080] font-mono hidden md:inline">
              [Shift + Enter for linebreak]
            </span>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
              text.trim() && !sending
                ? 'bg-[#FEF08A] text-[#0A0A0A] hover:bg-[#FDE047] shadow-[0_0_15px_rgba(254,240,138,0.25)]'
                : 'bg-white/5 text-[#808080] cursor-not-allowed border border-white/5'
            }`}
          >
            {sending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0A0A0A]" />
                <span>Processing</span>
              </>
            ) : (
              <>
                <span>Send Query</span>
                <Send className="w-3.5 h-3.5 stroke-[3]" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
