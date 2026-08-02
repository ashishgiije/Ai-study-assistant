import React, { useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Citation } from '../../types';

interface SourceCitationProps {
  sources: Citation[];
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ sources }) => {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-white/10 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-[#FEF08A] hover:text-white transition-colors cursor-pointer font-bold uppercase tracking-wider text-[10px]"
      >
        <span className="flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5" />
          Sources Used ({sources.length})
        </span>
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      <div className="mt-2 space-y-1.5">
        {sources.slice(0, expanded ? sources.length : 2).map((src, idx) => (
          <div
            key={idx}
            className="p-2.5 bg-[#0A0A0A] border border-white/10 flex flex-col gap-1 text-[11px]"
          >
            <div className="flex items-center justify-between font-bold text-white">
              <span className="flex items-center gap-1.5 min-w-0">
                <FileText className="w-3.5 h-3.5 text-[#FEF08A] shrink-0" />
                <span className="truncate font-mono text-xs">{src.document_name}</span>
              </span>
              <div className="flex items-center gap-1.5 shrink-0 text-[#A0A0A0] font-mono text-[10px]">
                {src.page_number && <span className="text-[#FEF08A]">PG {src.page_number}</span>}
                {src.section && <span>• {src.section}</span>}
              </div>
            </div>

            {expanded && src.snippet && (
              <p className="text-[#CCCCCC] text-[10px] font-mono leading-relaxed bg-[#121212] p-2 border border-white/5">
                "{src.snippet}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
