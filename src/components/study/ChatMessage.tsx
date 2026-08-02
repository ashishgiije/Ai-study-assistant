import React, { useState, useEffect } from 'react';
import { User, Copy, Check, RefreshCw, Volume2, VolumeX, Square, Sparkles } from 'lucide-react';
import { Message } from '../../types';
import { SourceCitation } from './SourceCitation';

interface ChatMessageProps {
  message: Message;
  autoSpeak?: boolean;
  onSelectSuggestedQuestion?: (question: string) => void;
  onRegenerate?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  autoSpeak = false,
  onSelectSuggestedQuestion,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isUser = message.role === 'user';

  // Strip markdown formatting symbols for speech synthesis read aloud
  const getCleanSpeechText = (text: string) => {
    return text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.') // skip long code blocks in voice
      .replace(/[#*`_~[\]()]/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  };

  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const cleanText = getCleanSpeechText(message.content);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Try selecting an English natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
    ) || voices.find(v => v.lang.startsWith('en'));

    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Auto-speak new assistant messages if autoSpeak is enabled
  useEffect(() => {
    if (!isUser && autoSpeak && message.content && 'speechSynthesis' in window) {
      // Small timeout to allow UI rendering
      const timer = setTimeout(() => {
        handleToggleSpeech();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [message.id]);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const copyContent = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    let inCodeBlock = false;
    let codeBuffer: string[] = [];

    const elements: React.ReactNode[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code_${index}`} className="p-3 bg-[#0A0A0A] border border-white/10 font-mono text-xs text-[#FEF08A] my-2 overflow-x-auto">
              <code>{codeBuffer.join('\n')}</code>
            </pre>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith('### ')) {
        elements.push(<h3 key={index} className="text-sm font-bold text-white uppercase tracking-tight mt-3 mb-1">{parseInline(line.replace('### ', ''))}</h3>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={index} className="text-base font-black text-white uppercase tracking-tight mt-4 mb-2">{parseInline(line.replace('## ', ''))}</h2>);
      } else if (line.startsWith('# ')) {
        elements.push(<h1 key={index} className="text-lg font-black text-white uppercase tracking-tight mt-4 mb-2">{parseInline(line.replace('# ', ''))}</h1>);
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <li key={index} className="ml-4 list-disc text-gray-300 text-xs my-0.5 font-medium">
            {parseInline(line.replace(/^[-*]\s+/, ''))}
          </li>
        );
      } else if (/^\d+\.\s+/.test(line)) {
        elements.push(
          <li key={index} className="ml-4 list-decimal text-gray-300 text-xs my-0.5 font-medium">
            {parseInline(line.replace(/^\d+\.\s+/, ''))}
          </li>
        );
      } else if (line.trim() === '') {
        elements.push(<div key={index} className="h-2" />);
      } else {
        elements.push(
          <p key={index} className="text-xs sm:text-sm text-gray-200 leading-relaxed my-1 font-medium">
            {parseInline(line)}
          </p>
        );
      }
    });

    return elements;
  };

  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  if (isUser) {
    return (
      <div className="flex justify-end my-3">
        <div className="max-w-[85%] sm:max-w-[75%] p-3.5 bg-[#121212] border border-white/20 text-white text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#FEF08A] mb-1">
            <User className="w-3 h-3 text-[#FEF08A]" />
            <span>Student Query</span>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start my-4">
      <div className="max-w-[95%] sm:max-w-[88%] p-4 bg-[#121212] border border-white/10 space-y-3 relative group">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#FEF08A] text-[#0A0A0A] flex items-center justify-center font-black text-[10px]">
              AI
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#FEF08A] flex items-center gap-1.5">
              EduMind Assistant
              <span className="text-[9px] font-mono text-[#808080] font-normal lowercase">(RAG Grounded)</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Voice Assistant TTS Button */}
            <button
              onClick={handleToggleSpeech}
              className={`px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 border transition-all cursor-pointer ${
                isSpeaking
                  ? 'bg-[#FEF08A] text-[#0A0A0A] border-[#FEF08A] shadow-[0_0_10px_rgba(254,240,138,0.3)] animate-pulse'
                  : 'bg-white/5 text-[#A0A0A0] border-white/10 hover:border-[#FEF08A] hover:text-[#FEF08A]'
              }`}
              title={isSpeaking ? 'Stop voice readout' : 'Listen to response (Voice Assistant)'}
            >
              {isSpeaking ? (
                <>
                  <Square className="w-3 h-3 fill-current" />
                  <span>Speaking...</span>
                  {/* Audio Wave Visualizer */}
                  <span className="flex items-end gap-0.5 h-2.5 ml-1">
                    <span className="w-0.5 h-full bg-[#0A0A0A] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-0.5 h-full bg-[#0A0A0A] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-0.5 h-full bg-[#0A0A0A] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#FEF08A]" />
                  <span>Read Aloud</span>
                </>
              )}
            </button>

            {/* Copy Button */}
            <button
              onClick={copyContent}
              className="p-1.5 text-[#808080] hover:text-white transition-colors cursor-pointer"
              title="Copy answer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Message Content */}
        <div className="prose prose-invert max-w-none">
          {renderFormattedMarkdown(message.content)}
        </div>

        {/* Source Citations */}
        {message.sources && message.sources.length > 0 && (
          <SourceCitation citations={message.sources} />
        )}

        {/* Suggested Questions */}
        {message.suggested_questions && message.suggested_questions.length > 0 && (
          <div className="pt-3 border-t border-white/10 mt-3">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FEF08A] mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Follow-up Study Prompts:
            </p>
            <div className="flex flex-wrap gap-2">
              {message.suggested_questions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestedQuestion?.(q)}
                  className="text-left text-xs bg-[#0A0A0A] border border-white/10 hover:border-[#FEF08A] text-gray-300 hover:text-white px-2.5 py-1.5 transition-all cursor-pointer font-medium"
                >
                  → {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
