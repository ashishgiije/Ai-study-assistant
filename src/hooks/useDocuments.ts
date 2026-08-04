import { useState, useEffect, useCallback } from 'react';
import { Document } from '../types';
import { api } from '../lib/api';

export function useDocuments(chatId: string | null) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!chatId) {
      setDocuments([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const docs = await api.getDocuments(chatId);
      setDocuments(Array.isArray(docs) ? docs : []);
    } catch (err: any) {
      console.warn('Error loading documents:', err);
      setDocuments([]);
      setError(err.message || 'Error loading documents');
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const uploadFiles = async (files: File[], overrideChatId?: string) => {
    const targetId = overrideChatId || chatId;
    if (!targetId || files.length === 0) return;
    try {
      setUploading(true);
      setError(null);
      const res = await api.uploadDocuments(targetId, files);
      await loadDocuments();
      return res;
    } catch (err: any) {
      setError(err.message || 'Failed to upload files');
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!chatId) return;
    try {
      await api.deleteDocument(chatId, docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete document');
      throw err;
    }
  };

  return {
    documents,
    loading,
    uploading,
    error,
    loadDocuments,
    uploadFiles,
    deleteDocument,
  };
}
