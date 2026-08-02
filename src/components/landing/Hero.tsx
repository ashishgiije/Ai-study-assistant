import React from 'react';
import { ArrowRight, FileText, ShieldCheck, Zap, BookOpen } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
  onExploreFeatures: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetStarted, onExploreFeatures }) => {
  return (
    <section id="hero" className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden bg-[#0A0A0A] border-b border-white/10">
      {/* Structural Corner Accents */}
      <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-[#FEF08A]" />
      <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-[#FEF08A]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          {/* Studio Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/5 border border-white/15 text-[10px] uppercase tracking-[0.3em] font-bold text-[#FEF08A] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FEF08A] animate-ping" />
            01 / Isolated Vector RAG Workspace
          </div>

          {/* Main Oversized Typography Heading */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-[-0.04em] leading-[0.88] text-white text-center">
            CRAFTING <br />
            <span className="text-white relative inline-block">
              INTELLIGENT <span className="hidden sm:inline-block w-16 h-3 bg-[#FEF08A] align-middle ml-2"></span>
            </span> <br />
            <span className="text-[#FEF08A]">STUDY FUTURES</span>
          </h1>

          {/* Supporting Subtext */}
          <p className="mt-8 text-base sm:text-lg text-[#A0A0A0] max-w-2xl mx-auto font-medium leading-relaxed">
            Transform dense textbooks and class notes into an interactive, isolated study engine. Grounded answers generated strictly from your uploaded files with zero halluncinations.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 bg-[#FEF08A] text-[#0A0A0A] font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_25px_rgba(254,240,138,0.3)] hover:bg-[#FDE047] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#FEF08A]"
            >
              Start Session Now
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
            <button
              onClick={onExploreFeatures}
              className="w-full sm:w-auto px-8 py-4 bg-transparent text-white font-bold uppercase text-xs tracking-[0.2em] border border-white/20 hover:border-white hover:bg-white/5 transition-all cursor-pointer"
            >
              Explore Capabilities
            </button>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-[#808080]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#FEF08A]" />
              <span>Isolated Workspace</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FEF08A]" />
              <span>Gemini 3.6 Flash</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#FEF08A]" />
              <span>Exact Page Citations</span>
            </div>
          </div>
        </div>

        {/* Hero Illustration Graphic - Bold Studio Window */}
        <div className="mt-16 relative max-w-4xl mx-auto bg-[#121212] border border-white/15 p-4 sm:p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#FEF08A]">
                AXON™ / DEMO SESSION
              </span>
              <span className="text-xs text-[#808080]">|</span>
              <span className="text-[11px] font-mono text-[#A0A0A0]">Machine Learning Unit 1</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-[#FEF08A] bg-[#FEF08A]/10 px-3 py-1 border border-[#FEF08A]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FEF08A]" />
              RAG Active
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {/* Sidebar Mock */}
            <div className="bg-[#0A0A0A] p-3.5 border border-white/10">
              <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#808080] mb-3">
                Knowledge Core (2)
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 bg-[#181818] border border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[#FEF08A] shrink-0" />
                    <span className="text-white truncate text-xs font-mono">ML_Notes.pdf</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase text-[#FEF08A] bg-[#FEF08A]/10 px-1.5 py-0.5">
                    Indexed
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#181818] border border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[#FEF08A] shrink-0" />
                    <span className="text-white truncate text-xs font-mono">Deep_Learning.docx</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase text-[#FEF08A] bg-[#FEF08A]/10 px-1.5 py-0.5">
                    Indexed
                  </span>
                </div>
              </div>
            </div>

            {/* Chat Thread Mock */}
            <div className="md:col-span-2 space-y-3">
              {/* User Question */}
              <div className="p-3.5 bg-[#181818] border border-white/10 text-xs text-white">
                <span className="font-bold text-[#FEF08A] uppercase tracking-wider text-[10px] block mb-1">
                  QUERY:
                </span>
                What is overfitting and how do we prevent it in neural networks?
              </div>

              {/* AI Answer */}
              <div className="p-4 bg-[#0A0A0A] border border-[#FEF08A]/40 text-xs text-[#F5F5F5]">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#FEF08A] mb-2">
                  <Zap className="w-3.5 h-3.5 fill-[#FEF08A]" />
                  EduMind Answer Engine
                </div>
                <p className="text-xs text-[#CCCCCC] leading-relaxed">
                  Overfitting occurs when a machine learning model learns the training data too closely, including noise, resulting in poor generalization on unseen validation data.
                </p>
                <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#A0A0A0]">
                  <span className="text-[#FEF08A]">SOURCE: ML_Notes.pdf (Page 12 • Section: Model Evaluation)</span>
                  <span className="text-[#808080]">SIMILARITY: 0.98</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
