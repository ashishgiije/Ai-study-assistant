import { Chat, Message, Document, AskQuestionResponse } from '../types';

const API_BASE = '/api';

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...customHeaders };
  let userId = 'default_user';
  try {
    const userStr = localStorage.getItem('edumind_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.uid) {
        userId = user.uid;
      }
    }
  } catch (e) {
    console.warn('Error reading user from localStorage', e);
  }
  if (!headers['x-user-id']) {
    headers['x-user-id'] = userId;
  }
  return headers;
}

export const api = {
  async getChats(): Promise<Chat[]> {
    const res = await fetch(`${API_BASE}/chats`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || 'Failed to fetch chats');
    }
    return res.json();
  },

  async createChat(title?: string): Promise<Chat> {
    const res = await fetch(`${API_BASE}/chats`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title: title || 'New Study Session' }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || 'Failed to create chat');
    }
    return res.json();
  },

  async getChat(chatId: string): Promise<Chat> {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || 'Failed to fetch chat');
    }
    return res.json();
  },

  async renameChat(chatId: string, title: string): Promise<Chat> {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || 'Failed to rename chat');
    }
    return res.json();
  },

  async deleteChat(chatId: string): Promise<{ message: string; chatId: string }> {
    const res = await fetch(`${API_BASE}/chats/${chatId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || 'Failed to delete chat');
    }
    return res.json();
  },

  async getMessages(chatId: string): Promise<Message[]> {
    const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || errData.error || 'Failed to fetch messages');
    }
    return res.json();
  },

  async askQuestion(chatId: string, question: string, documentId?: string): Promise<AskQuestionResponse> {
    const res = await fetch(`${API_BASE}/chats/${chatId}/messages`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ question, document_id: documentId || undefined }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detail = typeof errData.detail === 'string' ? errData.detail : errData.error;
      throw new Error(detail || 'Failed to generate answer');
    }
    return res.json();
  },

  async getDocuments(chatId: string): Promise<Document[]> {
    const res = await fetch(`${API_BASE}/chats/${chatId}/documents`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detail = typeof errData.detail === 'string' ? errData.detail : errData.error;
      throw new Error(detail || 'Failed to fetch documents');
    }
    return res.json();
  },

  async uploadDocuments(chatId: string, files: File[]): Promise<{ message: string; documents: Document[] }> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const res = await fetch(`${API_BASE}/chats/${chatId}/documents`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detail = typeof errData.detail === 'string' ? errData.detail : errData.error;
      throw new Error(detail || 'Failed to upload document(s)');
    }

    return res.json();
  },

  async deleteDocument(chatId: string, documentId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/chats/${chatId}/documents/${documentId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },
};
