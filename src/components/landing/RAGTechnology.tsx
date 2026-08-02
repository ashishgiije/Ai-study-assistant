import React from 'react';
import { FileText, Cpu, Database, Filter, Sliders, Sparkles, CheckCircle2 } from 'lucide-react';

export const RAGTechnology: React.FC = () => {
  const pipelineSteps = [
    { title: 'Document Ingestion', sub: 'PDF, DOCX, TXT', icon: FileText },
    { title: 'Text Extraction', sub: 'PDF-Parse & Mammoth', icon: Cpu },
    { title: 'Structure Chunking', sub: 'Context Enrichment', icon: Sliders },
    { title: 'Vector Embeddings', sub: 'BGE Semantic Vectors', icon: Database },
    { title: 'Qdrant Search', sub: 'Mandatory chat_id Filter', icon: Filter },
    { title: 'Rerank & Score', sub: 'Top Cross-Encoder', icon: CheckCircle2 },
    { title: 'Gemini 3.6 Engine', sub: 'Grounded + Citations', icon: Sparkles },
  ];

  return (
    <section id="rag-tech" className="py-24 bg-[#0A0A0A] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FEF08A] block mb-2">
            RAG System Specs // 03
          </span>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
            ENTERPRISE PIPELINE
          </h2>
          <p className="mt-3 text-sm text-[#A0A0A0] font-medium">
            High-throughput vector extraction, semantic reranking, and strict isolation guaranteed.
          </p>
        </div>

        {/* Pipeline Diagram */}
        <div className="max-w-5xl mx-auto bg-[#121212] border border-white/10 p-6 sm:p-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {pipelineSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="p-4 bg-[#0A0A0A] border border-white/10 flex flex-col items-center text-center group hover:border-[#FEF08A] transition-colors">
                  <div className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-[#FEF08A] group-hover:bg-[#FEF08A] group-hover:text-[#0A0A0A] transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold uppercase text-white mb-1 tracking-tight">{step.title}</h4>
                  <p className="text-[10px] font-mono text-[#A0A0A0]">{step.sub}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-5 bg-[#0A0A0A] border border-[#FEF08A]/40 text-xs text-[#CCCCCC] flex items-start gap-4">
            <Filter className="w-5 h-5 text-[#FEF08A] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white uppercase tracking-wider text-[11px] block mb-1">
                ISOLATION GUARANTEE:
              </span>
              <p className="text-xs text-[#A0A0A0] leading-relaxed">
                Vector retrieval strict filtering enforces <code className="text-[#FEF08A] font-mono">chat_id == current_session_id</code>. Documents uploaded in one study workspace never leak into another workspace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
