import React from 'react';
import { Plus, Home, Folder, MessageSquare, ShieldCheck, X, LogOut } from 'lucide-react';
import { Chat, Document } from '../../types';
import { ChatHistory } from './ChatHistory';
import { DocumentList } from './DocumentList';
import { DocumentUploader } from './DocumentUploader';
import { useAuth } from '../../context/AuthContext';

interface StudySidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  documents: Document[];
  uploading: boolean;
  selectedDocumentId?: string | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onSelectDocument?: (docId: string | null) => void;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  onUploadDocuments: (files: File[]) => Promise<any>;
  onDeleteDocument: (docId: string) => void;
  onNavigateHome: () => void;
  onOpenProfile?: () => void;
}

export const StudySidebar: React.FC<StudySidebarProps> = ({
  chats,
  activeChatId,
  documents,
  uploading,
  selectedDocumentId,
  isOpenMobile = false,
  onCloseMobile,
  onSelectDocument,
  onNewChat,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onUploadDocuments,
  onDeleteDocument,
  onNavigateHome,
  onOpenProfile,
}) => {
  const { user, logout } = useAuth();


  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-80 max-w-[85vw] bg-[#0A0A0A] border-r border-white/10 flex flex-col h-full shrink-0 transition-transform duration-300 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div 
            onClick={() => {
              onNavigateHome();
              onCloseMobile?.();
            }}
            className="flex flex-col cursor-pointer group"
          >
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#FEF08A]">
              RAG STUDIO
            </span>
            <span className="text-xl font-black tracking-tighter text-white uppercase flex items-center gap-1">
              EduMind<span className="text-[#FEF08A]">™</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onNavigateHome();
                onCloseMobile?.();
              }}
              className="p-2 text-[#808080] hover:text-white border border-white/10 hover:border-white transition-colors cursor-pointer"
              title="Return to Home"
            >
              <Home className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-2 text-[#808080] hover:text-[#FEF08A] border border-white/10 hover:border-[#FEF08A] transition-colors cursor-pointer lg:hidden"
              title="Close Sidebar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4 border-b border-white/10">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile?.();
            }}
            className="w-full py-3 px-4 bg-[#FEF08A] text-[#0A0A0A] font-black uppercase text-xs tracking-[0.15em] hover:bg-[#FDE047] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(254,240,138,0.2)]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Study Chat</span>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Chats History Section */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-[#808080] uppercase tracking-[0.2em] mb-3">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#FEF08A]" />
                Sessions ({chats.length})
              </span>
            </div>
            <ChatHistory
              chats={chats}
              activeChatId={activeChatId}
              onSelectChat={(id) => {
                onSelectChat(id);
                onCloseMobile?.();
              }}
              onRenameChat={onRenameChat}
              onDeleteChat={onDeleteChat}
            />
          </div>

          {/* Documents for Current Chat Section */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-[#808080] uppercase tracking-[0.2em] mb-3">
              <span className="flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-[#FEF08A]" />
                Document Vault
              </span>
              <span className="text-[9px] font-mono font-bold uppercase text-[#FEF08A] bg-[#FEF08A]/10 px-2 py-0.5 border border-[#FEF08A]/30">
                {documents.length} File(s)
              </span>
            </div>

            <div className="space-y-3">
              <DocumentUploader onUpload={onUploadDocuments} uploading={uploading} />
              <DocumentList
                documents={documents}
                selectedDocumentId={selectedDocumentId}
                onSelectDocument={(id) => {
                  onSelectDocument?.(id);
                  onCloseMobile?.();
                }}
                onDeleteDocument={onDeleteDocument}
              />
            </div>
          </div>
        </div>

        {/* Footer Info & Profile */}
        <div className="p-3 bg-[#121212] border-t border-white/10 flex flex-col gap-2">
          {user && (
            <div className="flex items-center justify-between gap-2 p-1.5 bg-[#0A0A0A] border border-white/10">
              <button
                onClick={onOpenProfile}
                className="flex items-center gap-2 min-w-0 flex-1 text-left hover:opacity-80 transition-opacity cursor-pointer"
                title="View Account Profile & System Status"
              >
                <div className="w-6 h-6 rounded-full bg-[#FEF08A] text-[#0A0A0A] font-black text-[10px] flex items-center justify-center uppercase shrink-0">
                  {user.displayName?.[0] || 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-mono font-bold text-white truncate">{user.displayName || 'Student'}</p>
                  <p className="text-[9px] font-mono text-gray-400 truncate">{user.email}</p>
                </div>
              </button>
              <button
                onClick={logout}
                className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer rounded"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="text-[10px] font-bold uppercase tracking-wider text-[#A0A0A0] flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5 text-[#FEF08A]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FEF08A]" />
              Isolated Vectors
            </span>
            <span className="text-[#808080] font-mono">v1.0</span>
          </div>
        </div>
      </aside>

    </>
  );
};
