import { useState, useEffect, useCallback } from 'react';
import { Chat } from '../types';
import { api } from '../lib/api';

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getChats();
      setChats(data);
    } catch (err: any) {
      setError(err.message || 'Error loading chats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const createChat = async (title?: string): Promise<Chat> => {
    const newChat = await api.createChat(title);
    setChats(prev => [newChat, ...prev]);
    return newChat;
  };

  const renameChat = async (chatId: string, newTitle: string) => {
    const updated = await api.renameChat(chatId, newTitle);
    setChats(prev => prev.map(c => (c.id === chatId ? updated : c)));
    return updated;
  };

  const deleteChat = async (chatId: string) => {
    await api.deleteChat(chatId);
    setChats(prev => prev.filter(c => c.id !== chatId));
  };

  return {
    chats,
    loading,
    error,
    loadChats,
    createChat,
    renameChat,
    deleteChat,
  };
}
