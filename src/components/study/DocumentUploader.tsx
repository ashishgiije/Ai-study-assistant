import React, { useRef, useState } from 'react';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';

interface DocumentUploaderProps {
  onUpload: (files: File[]) => Promise<any>;
  uploading: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onUpload, uploading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFiles = async (filesList: FileList | File[]) => {
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
        await onUpload(validFiles);
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
        onChange={e => {
          if (e.target.files) handleFiles(e.target.files);
        }}
      />

      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-3.5 border border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragOver
            ? 'border-[#FEF08A] bg-[#FEF08A]/10'
            : 'border-white/20 hover:border-[#FEF08A] bg-[#121212] hover:bg-white/5'
        }`}
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-xs font-mono uppercase font-bold text-[#FEF08A]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Parsing Vectors...</span>
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
          <span className="truncate">{errorMsg}</span>
        </div>
      )}
    </div>
  );
};
