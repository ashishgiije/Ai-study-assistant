import React from 'react';
import { Zap } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0A0A0A] border-t border-white/10 py-12 text-xs text-[#A0A0A0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Tagline */}
          <div className="flex flex-col">
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#FEF08A]">
              STUDIO ENGINE
            </span>
            <span className="text-xl font-black tracking-tighter text-white uppercase flex items-center gap-1">
              EduMind<span className="text-[#FEF08A]">™</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-bold uppercase tracking-[0.2em] text-[#808080]">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Workflow</a>
            <a href="#rag-tech" className="hover:text-white transition-colors">RAG Specs</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#808080] gap-4">
          <p>© {new Date().getFullYear()} EDUMIND AI SYSTEMS INC.</p>
          <p className="flex items-center gap-1">
            POWERED BY <span className="text-[#FEF08A] font-bold">GEMINI 3.6 FLASH</span> & <span className="text-[#FEF08A] font-bold">QDRANT VECTOR DB</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
