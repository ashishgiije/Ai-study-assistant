import React from 'react';
import { PlusCircle, UploadCloud, Cpu, HelpCircle, Search, Sparkles } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Create Study Session',
      desc: 'Start a dedicated study workspace for your subject or exam topic.',
      icon: PlusCircle,
    },
    {
      step: '02',
      title: 'Upload Materials',
      desc: 'Drag & drop PDFs, DOCX files, or plain text notes.',
      icon: UploadCloud,
    },
    {
      step: '03',
      title: 'Vector Parsing',
      desc: 'Text is parsed with structure-aware chunking and embedded into Qdrant.',
      icon: Cpu,
    },
    {
      step: '04',
      title: 'Inquire Naturally',
      desc: 'Ask about concepts, formulas, summaries, or specific definitions.',
      icon: HelpCircle,
    },
    {
      step: '05',
      title: 'Isolated Vector Search',
      desc: 'Qdrant strictly retrieves vector chunks bound to the active session ID.',
      icon: Search,
    },
    {
      step: '06',
      title: 'Grounded Output',
      desc: 'Gemini generates a structured answer backed by verified page citations.',
      icon: Sparkles,
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#0A0A0A] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FEF08A] block mb-2">
            Execution Blueprint // 02
          </span>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
            6-STEP RAG WORKFLOW
          </h2>
          <p className="mt-3 text-sm text-[#A0A0A0] font-medium">
            From raw study documents to verified, cited answers in milliseconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div 
                key={idx} 
                className="bg-[#121212] border border-white/10 p-6 flex flex-col justify-between hover:border-[#FEF08A] transition-colors relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono font-bold tracking-widest text-[#FEF08A] bg-[#FEF08A]/10 px-2.5 py-1 border border-[#FEF08A]/30">
                      STEP {s.step}
                    </span>
                    <div className="w-9 h-9 bg-white/5 border border-white/10 flex items-center justify-center text-[#FEF08A]">
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold uppercase text-white mb-2 tracking-tight">{s.title}</h3>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed font-medium">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
