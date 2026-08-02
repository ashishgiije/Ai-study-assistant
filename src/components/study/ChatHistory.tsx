import React, { useState } from 'react';
import { MessageSquare, Trash2, Edit2, Check, X, Clock } from 'lucide-react';
import { Chat } from '../../types';

interface ChatHistoryProps {
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startRename = (chat: Chat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title);
    setDeletingId(null);
  };

  const saveRename = (chatId: string, e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameChat(chatId, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const startDelete = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(chatId);
    setEditingId(null);
  };

  const confirmDelete = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
    onDeleteChat(chatId);
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (chats.length === 0) {
    return (
      <div className="text-center py-6 px-3 bg-[#121212] border border-white/10 text-[10px] font-mono text-[#808080] uppercase tracking-wider">
        No active study sessions.
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
      {chats.map(chat => {
        const isActive = chat.id === activeChatId;
        const isEditing = editingId === chat.id;
        const isDeleting = deletingId === chat.id;

        return (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`group relative p-2.5 border flex items-center justify-between gap-2 cursor-pointer transition-all ${
              isActive
                ? 'bg-[#121212] border-[#FEF08A] text-white shadow-[0_0_10px_rgba(254,240,138,0.12)]'
                : 'bg-[#0A0A0A] border-white/10 hover:bg-[#121212] hover:border-white/20 text-[#A0A0A0] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FEF08A]' : 'text-[#808080]'}`} />

              {isEditing ? (
                <form
                  onSubmit={e => saveRename(chat.id, e)}
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 min-w-0 flex-1"
                >
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="w-full bg-[#0A0A0A] text-xs text-white px-2 py-1 border border-[#FEF08A] focus:outline-none font-bold"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="p-1 text-[#FEF08A] hover:bg-white/10"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelRename}
                    className="p-1 text-gray-400 hover:bg-white/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-bold uppercase tracking-tight truncate ${isActive ? 'text-[#FEF08A]' : 'text-white'}`}>
                    {chat.title}
                  </p>
                  <span className="text-[10px] font-mono text-[#808080] flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTime(chat.updated_at)}
                  </span>
                </div>
              )}
            </div>

            {!isEditing && (
              <div className="flex items-center gap-1 shrink-0">
                {isDeleting ? (
                  <div className="flex items-center gap-1 bg-red-950/80 p-1 border border-red-500/50">
                    <button
                      onClick={e => confirmDelete(chat.id, e)}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      onClick={cancelDelete}
                      className="p-0.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={e => startRename(chat, e)}
                      className="p-1 text-[#808080] hover:text-white transition-colors"
                      title="Rename chat"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => startDelete(chat.id, e)}
                      className="p-1 text-[#808080] hover:text-red-400 transition-colors"
                      title="Delete chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
