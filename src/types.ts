export interface Citation {
  document_id: string;
  document_name: string;
  page_number?: number;
  section?: string;
  snippet?: string;
}

export interface Message {
  id: string;
  chat_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: Citation[];
  suggested_questions?: string[];
  created_at: string;
}

export interface Document {
  id: string;
  chat_id: string;
  file_name: string;
  file_type: 'pdf' | 'docx' | 'txt';
  file_path: string;
  file_size: number;
  status: 'uploading' | 'queued' | 'processing' | 'indexed' | 'failed';
  chunk_count: number;
  created_at: string;
  processed_at?: string;
  error_message?: string;
}

export interface Chat {
  id: string;
  userId?: string;
  title: string;
  created_at: string;
  updated_at: string;
  documents?: Document[];
  messages?: Message[];
}

export interface DocumentChunk {
  chunk_id: string;
  chat_id: string;
  document_id: string;
  document_name: string;
  file_type: 'pdf' | 'docx' | 'txt';
  page_number?: number;
  section?: string;
  chunk_index: number;
  text: string;
  enriched_text: string;
  score?: number;
}

export interface AskQuestionResponse {
  answer: string;
  sources: Citation[];
  suggested_questions: string[];
  message: Message;
}

export interface UploadDocumentResponse {
  document: Document;
  message: string;
}
