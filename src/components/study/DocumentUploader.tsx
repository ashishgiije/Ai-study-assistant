import React, { useRef, useState } from 'react';
import type { Document } from '../../types';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';

interface DocumentUploaderProps {
  onUpload: (files: File[]) => Promise<{ documents: Document[] } | undefined>;
  uploading: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onUpload, uploading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFiles = async (filesList: FileList | File[]) => {
    if (uploading) return;
    setErrorMsg(null);
    const validFiles: File[] = [];
    const maxMb = 20;

    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
        setErrorMsg(`"${file.name}" is not supported. Use PDF, DOCX, or TXT.`);
        return;
      }
      if (file.size > maxMb * 1024 * 1024) {
        setErrorMsg(`"${file.name}" exceeds the ${maxMb}MB file size limit.`);
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      try {
        const result = await onUpload(validFiles);
        const failures = result?.documents.filter(doc => doc.status === 'failed') ?? [];
        if (failures.length) {
          setErrorMsg(failures.map(doc => `${doc.file_name}: ${doc.error_message || 'Indexing failed'}`).join(' '));
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Upload failed');
      }
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const input: HTMLInputElement = e.currentTarget;
          const files = input.files ? Array.from(input.files) : [];
          input.value = '';
          if (files.length) void handleFiles(files);
        }}
      />

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => { if (!uploading) fileInputRef.current?.click(); }}
        className={`p-3.5 border border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-[#FEF08A] bg-[#FEF08A]/10'
            : 'border-white/20 hover:border-[#FEF08A] bg-[#121212] hover:bg-white/5'
        }`}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-xs font-mono uppercase font-bold text-[#FEF08A]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Uploading and indexing…</span>
          </div>
        ) : (
          <>
            <UploadCloud className="w-5 h-5 text-[#FEF08A] mb-1" />
            <p className="text-xs font-bold uppercase tracking-wider text-white">
              Add Study Documents
            </p>
            <p className="text-[10px] font-mono text-[#808080] mt-0.5">
              Drop PDF, DOCX, TXT (Max 20MB)
            </p>
          </>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1.5 p-2 bg-red-500/10 border border-red-500/30 text-xs text-red-400 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
