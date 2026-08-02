import { useState, useEffect, useCallback } from 'react';
import { Chat, Message } from '../types';
import { api } from '../lib/api';

export function useChat(chatId: string | null) {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadChatData = useCallback(async () => {
    if (!chatId) {
      setChat(null);
      setMessages([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [chatData, msgsData] = await Promise.all([
        api.getChat(chatId),
        api.getMessages(chatId),
      ]);
      setChat(chatData);
      setMessages(msgsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load chat workspace');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]);

  const askQuestion = async (questionText: string, documentId?: string) => {
    if (!chatId || !questionText.trim()) return;

    // Optimistically append user message
    const tempUserMsg: Message = {
      id: 'temp_u_' + Date.now(),
      chat_id: chatId,
      role: 'user',
      content: questionText,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, tempUserMsg]);
    setSending(true);
    setError(null);

    try {
      const res = await api.askQuestion(chatId, questionText, documentId);
      // Replace optimistic message thread with real saved messages
      const updatedMsgs = await api.getMessages(chatId);
      setMessages(updatedMsgs);
      return res;
    } catch (err: any) {
      setError(err.message || 'Failed to generate answer');
      // Remove temp user message on hard error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id));
      throw err;
    } finally {
      setSending(false);
    }
  };

  return {
    chat,
    messages,
    loading,
    sending,
    error,
    loadChatData,
    askQuestion,
  };
}
