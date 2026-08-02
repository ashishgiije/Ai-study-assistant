import React from 'react';
import { FileText, Trash2, CheckCircle2, AlertCircle, Loader2, Filter } from 'lucide-react';
import { Document } from '../../types';

interface DocumentListProps {
  documents: Document[];
  selectedDocumentId?: string | null;
  onSelectDocument?: (docId: string | null) => void;
  onDeleteDocument: (docId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onDeleteDocument,
}) => {
  if (documents.length === 0) {
    return (
      <div className="text-center py-4 px-3 bg-[#121212] border border-white/10 text-[10px] font-mono text-[#808080] uppercase tracking-wider">
        No study files attached to session.
      </div>
    );
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusBadge = (status: Document['status'], chunkCount: number) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-[#FEF08A] bg-[#FEF08A]/10 px-1.5 py-0.5 border border-[#FEF08A]/30 uppercase">
            <CheckCircle2 className="w-3 h-3" />
            {chunkCount} CHUNKS
          </span>
        );
      case 'processing':
      case 'uploading':
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-[#FEF08A] bg-[#FEF08A]/10 px-1.5 py-0.5 border border-[#FEF08A]/30 uppercase">
            <Loader2 className="w-3 h-3 animate-spin" />
            {status}
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 border border-red-500/30 uppercase">
            <AlertCircle className="w-3 h-3" />
            FAILED
          </span>
        );
    }
  };

  return (
    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
      {/* Option to clear filter if a document is selected */}
      {selectedDocumentId && onSelectDocument && (
        <button
          onClick={() => onSelectDocument(null)}
          className="w-full p-2 bg-[#1A1A1E] border border-[#FEF08A]/40 hover:bg-[#FEF08A]/10 text-xs font-mono font-bold text-[#FEF08A] flex items-center justify-between transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            Clear Document Scope (Search All)
          </span>
          <span className="text-[10px] uppercase underline">Reset</span>
        </button>
      )}

      {documents.map(doc => {
        const isSelected = selectedDocumentId === doc.id;
        return (
          <div
            key={doc.id}
            onClick={() => onSelectDocument?.(isSelected ? null : doc.id)}
            className={`p-2.5 bg-[#121212] border transition-all cursor-pointer group flex items-center justify-between gap-2 ${
              isSelected
                ? 'border-[#FEF08A] bg-[#FEF08A]/10 shadow-[0_0_10px_rgba(254,240,138,0.15)]'
                : 'border-white/10 hover:border-[#FEF08A]/50 hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <FileText className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#FEF08A]' : 'text-gray-400 group-hover:text-[#FEF08A]'}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-mono font-bold text-white truncate">{doc.file_name}</p>
                  {isSelected && (
                    <span className="text-[9px] font-mono font-black uppercase text-[#0A0A0A] bg-[#FEF08A] px-1 py-0.2 shrink-0">
                      ACTIVE SCOPE
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-[#808080]">{formatFileSize(doc.file_size)}</span>
                  {getStatusBadge(doc.status, doc.chunk_count)}
                </div>
              </div>
            </div>

            <button
              onClick={e => {
                e.stopPropagation();
                onDeleteDocument(doc.id);
              }}
              className="p-1.5 text-[#808080] hover:text-red-400 transition-colors cursor-pointer shrink-0"
              title="Delete document"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
