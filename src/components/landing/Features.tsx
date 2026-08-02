import React from 'react';
import { Files, Layers, Brain, Database, BookmarkCheck, History } from 'lucide-react';

export const Features: React.FC = () => {
  const featuresList = [
    {
      icon: Files,
      number: '01',
      title: 'Multi-Document Synthesis',
      description: 'Upload multiple study documents (PDF, DOCX, TXT) into a single workspace for cross-document learning.',
    },
    {
      icon: Layers,
      number: '02',
      title: 'Isolated Workspaces',
      description: 'Keep subjects organized in dedicated chats with 100% document vector isolation between conversations.',
    },
    {
      icon: Brain,
      number: '03',
      title: 'Context-Grounded Answers',
      description: 'Answers are generated strictly from study materials in your active session — zero outside assumptions.',
    },
    {
      icon: Database,
      number: '04',
      title: 'Advanced RAG Pipeline',
      description: 'Structure-aware chunking, BGE vector embeddings, Qdrant retrieval, and cross-encoder reranking.',
    },
    {
      icon: BookmarkCheck,
      number: '05',
      title: 'Verifiable Citations',
      description: 'Every answer highlights exact supporting document names, page numbers, and section headers.',
    },
    {
      icon: History,
      number: '06',
      title: 'Persistent Session State',
      description: 'Return to previous study sessions anytime. Add new documents or continue right where you left off.',
    },
  ];

  return (
    <section id="features" className="py-24 bg-[#0A0A0A] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#FEF08A] block mb-2">
              Capabilities // 01
            </span>
            <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
              BUILT FOR ACADEMIC <br />
              <span className="text-[#FEF08A]">PRECISION</span>
            </h2>
          </div>
          <p className="text-[#A0A0A0] text-sm sm:text-base max-w-md font-medium leading-relaxed">
            EduMind AI delivers a high-throughput study engine engineered to turn dense coursework into clear, queryable knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresList.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className="bg-[#121212] border border-white/10 p-8 hover:border-[#FEF08A] transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center text-[#FEF08A] group-hover:bg-[#FEF08A] group-hover:text-[#0A0A0A] transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xl font-black font-mono text-white/20 group-hover:text-[#FEF08A] transition-colors">
                      {item.number}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold uppercase tracking-tight text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-[#A0A0A0] leading-relaxed font-medium">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
