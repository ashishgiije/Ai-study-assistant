import React from 'react';
import { ChevronRight, Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onGetStarted: () => void;
  onNavigateSection: (id: string) => void;
  onOpenProfile?: () => void;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onGetStarted,
  onNavigateSection,
  onOpenProfile,
  onOpenAuth,
}) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-lg bg-[#0A0A0A]/90 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo */}
        <div 
          onClick={() => onNavigateSection('hero')} 
          className="flex flex-col cursor-pointer group"
        >
          <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-[#FEF08A]">
            RAG Engine v1.0
          </span>
          <span className="text-2xl font-black tracking-tighter text-white uppercase flex items-center gap-1 leading-none mt-0.5">
            EduMind<span className="text-[#FEF08A]">™</span>
          </span>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-[0.2em] font-medium text-[#A0A0A0]">
          <button 
            onClick={() => onNavigateSection('features')} 
            className="hover:text-white transition-colors cursor-pointer hover:border-b hover:border-[#FEF08A] pb-0.5"
          >
            01 Features
          </button>
          <button 
            onClick={() => onNavigateSection('how-it-works')} 
            className="hover:text-white transition-colors cursor-pointer hover:border-b hover:border-[#FEF08A] pb-0.5"
          >
            02 How It Works
          </button>
          <button 
            onClick={() => onNavigateSection('rag-tech')} 
            className="hover:text-white transition-colors cursor-pointer hover:border-b hover:border-[#FEF08A] pb-0.5"
          >
            03 RAG Tech
          </button>
          <button 
            onClick={() => onNavigateSection('faq')} 
            className="hover:text-white transition-colors cursor-pointer hover:border-b hover:border-[#FEF08A] pb-0.5"
          >
            04 FAQ
          </button>
        </nav>

        {/* CTA & User Profile Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 bg-[#121212] border border-white/10 p-1 px-2.5 hover:border-[#FEF08A]/50 transition-colors cursor-pointer text-left"
              title="View Profile & Settings"
            >
              <div className="w-6 h-6 rounded-full bg-[#FEF08A] text-[#0A0A0A] font-black text-[10px] flex items-center justify-center uppercase shrink-0">
                {user.displayName?.[0] || 'U'}
              </div>
              <span className="text-xs font-mono text-white max-w-[100px] sm:max-w-[140px] truncate hidden xs:inline">
                {user.displayName || 'Student'}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-300 hover:text-white border border-white/20 hover:border-white transition-colors cursor-pointer"
            >
              Sign In / Register
            </button>
          )}

          <button
            onClick={onGetStarted}
            className="px-4 sm:px-5 py-2.5 text-xs font-black uppercase tracking-wider text-[#0A0A0A] bg-[#FEF08A] hover:bg-[#FDE047] transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(254,240,138,0.25)] rounded-none border border-[#FEF08A]"
          >
            <Zap className="w-3.5 h-3.5 fill-[#0A0A0A]" />
            <span className="hidden sm:inline">Launch Studio</span>
            <span className="sm:hidden">Studio</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};


