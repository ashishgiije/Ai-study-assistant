import React, { useRef, useEffect, useState } from 'react';
import { Edit2, FileText, BookOpen, Loader2, Zap, Check, X, Filter, Volume2, Menu } from 'lucide-react';
import { Chat, Message, Document } from '../../types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatWindowProps {
  chat: Chat | null;
  messages: Message[];
  documents: Document[];
  loading: boolean;
  sending: boolean;
  selectedDocumentId?: string | null;
  onSelectDocument?: (docId: string | null) => void;
  onSendMessage: (text: string, documentId?: string | null) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onOpenUpload: () => void;
  onOpenMobileSidebar?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  messages,
  documents,
  loading,
  sending,
  selectedDocumentId = null,
  onSelectDocument,
  onSendMessage,
  onRenameChat,
  onOpenUpload,
  onOpenMobileSidebar,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handlePromptClick = (promptText: string) => {
    onSendMessage(promptText, selectedDocumentId);
  };

  const handleStartRename = () => {
    if (!chat) return;
    setTitleInput(chat.title);
    setIsEditingTitle(true);
  };

  const handleSaveRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (chat && titleInput.trim()) {
      onRenameChat(chat.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  if (!chat && loading) {
    return (
      <div className="flex-1 bg-[#0A0A0A] flex items-center justify-center text-[#A0A0A0] text-xs font-mono uppercase tracking-wider">
        <Loader2 className="w-5 h-5 animate-spin text-[#FEF08A] mr-2" />
        Initializing Workspace Engine...
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex-1 bg-[#0A0A0A] flex items-center justify-center text-[#808080] text-xs uppercase tracking-widest p-4 text-center">
        Select or launch a study session to begin.
      </div>
    );
  }

  const selectedDoc = documents.find(d => d.id === selectedDocumentId);

  return (
    <div className="flex-1 bg-[#0A0A0A] flex flex-col h-full overflow-hidden">
      {/* Workspace Header */}
      <div className="p-3 sm:p-4 bg-[#121212] border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Mobile Sidebar Toggle Button */}
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-1.5 bg-white/5 border border-white/10 hover:border-[#FEF08A] text-[#FEF08A] transition-colors cursor-pointer shrink-0 flex items-center gap-1 text-[10px] font-mono font-bold uppercase"
              title="Open Vault & Chat Sessions"
            >
              <Menu className="w-4 h-4" />
              <span className="hidden xs:inline">Vault</span>
            </button>
          )}

          <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center text-[#FEF08A] shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isEditingTitle ? (
                <form onSubmit={handleSaveRename} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={e => setTitleInput(e.target.value)}
                    className="bg-[#0A0A0A] text-sm font-black text-white uppercase tracking-tight px-2 py-0.5 border border-[#FEF08A] focus:outline-none"
                    autoFocus
                  />
                  <button type="submit" className="p-1 text-[#FEF08A] hover:bg-white/10 cursor-pointer">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setIsEditingTitle(false)} className="p-1 text-gray-400 hover:bg-white/10 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <>
                  <h1 className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate">{chat.title}</h1>
                  <button
                    onClick={handleStartRename}
                    className="text-[#808080] hover:text-[#FEF08A] p-1 cursor-pointer"
                    title="Rename chat"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            <p className="text-[10px] uppercase font-mono tracking-wider text-[#A0A0A0] flex items-center gap-2 flex-wrap">
              <span>{documents.length} File(s)</span>
              <span>•</span>
              <span className={selectedDoc ? 'text-[#FEF08A] font-bold' : 'text-gray-400'}>
                {selectedDoc ? `Filtered: ${selectedDoc.file_name}` : 'Search Scope: All Documents'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenUpload}
            className="px-3 py-1.5 bg-[#0A0A0A] hover:bg-white/5 border border-white/10 hover:border-[#FEF08A] text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
          >
            <FileText className="w-3.5 h-3.5 text-[#FEF08A]" />
            <span className="hidden sm:inline">Upload Files</span>
          </button>
        </div>
      </div>

      {/* Messages Thread Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto my-12 text-center space-y-6">
            <div className="w-14 h-14 bg-white/5 border border-[#FEF08A]/40 flex items-center justify-center mx-auto text-[#FEF08A] shadow-[0_0_20px_rgba(254,240,138,0.15)]">
              <Zap className="w-7 h-7 fill-[#FEF08A]" />
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#FEF08A] block mb-1">
                STUDIO ENGINE & VOICE ASSISTANT READY
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase text-white tracking-tight">
                {chat.title}
              </h2>
              <p className="mt-2 text-xs text-[#A0A0A0] max-w-md mx-auto font-medium">
                {documents.length > 0
                  ? selectedDoc
                    ? `Queries are currently filtered exclusively to "${selectedDoc.file_name}". Ask a question or speak your query below!`
                    : 'Your documents are indexed in this study session. You can query all documents or pick a specific document filter below!'
                  : 'Upload study notes, PDFs, or Word files to start asking context-grounded questions with voice support.'}
              </p>
            </div>

            {/* Quick Starters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto">
              {[
                { title: 'Summarize Key Topics', desc: 'Overview of the main concepts in my study materials' },
                { title: 'Define Core Terms', desc: 'List and define important terms and formulas' },
                { title: 'Generate Quiz Questions', desc: 'Create 5 practice questions based on the uploaded notes' },
                { title: 'Explain Hard Concepts', desc: 'Break down complex topics step by step' },
              ].map((starter, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePromptClick(starter.title)}
                  className="p-3 bg-[#121212] border border-white/10 hover:border-[#FEF08A] text-left transition-all cursor-pointer group"
                >
                  <p className="text-xs font-bold uppercase text-white group-hover:text-[#FEF08A]">{starter.title}</p>
                  <p className="text-[10px] text-[#808080] mt-1">{starter.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((msg, index) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                autoSpeak={autoVoiceEnabled && index === messages.length - 1 && msg.role === 'assistant'}
                onSelectSuggestedQuestion={handlePromptClick}
                onRegenerate={() => {
                  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                  if (lastUserMsg) onSendMessage(lastUserMsg.content, selectedDocumentId);
                }}
              />
            ))}

            {sending && (
              <div className="flex justify-start my-4">
                <div className="p-4 bg-[#121212] border border-[#FEF08A]/40 flex items-center gap-3 text-xs text-[#FEF08A] font-mono uppercase tracking-wider">
                  <Loader2 className="w-4 h-4 animate-spin text-[#FEF08A]" />
                  <span>
                    {selectedDoc
                      ? `Searching vector chunks in "${selectedDoc.file_name}" & synthesizing response...`
                      : 'Searching all session document vectors & synthesizing response...'}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        onSendMessage={onSendMessage}
        sending={sending}
        documents={documents}
        selectedDocumentId={selectedDocumentId}
        onSelectDocument={onSelectDocument || (() => {})}
        autoVoiceEnabled={autoVoiceEnabled}
        onToggleAutoVoice={() => setAutoVoiceEnabled(!autoVoiceEnabled)}
        onOpenUpload={onOpenUpload}
        hasDocuments={documents.length > 0}
      />
    </div>
  );
};
