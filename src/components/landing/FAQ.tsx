import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

export const FAQ: React.FC = () => {
  const faqData = [
    {
      q: 'Which file types are supported?',
      a: 'EduMind AI supports PDF documents (.pdf), Word documents (.docx), and Plain Text notes (.txt). Files can be up to 20MB each.',
    },
    {
      q: 'Can I upload multiple documents to a single study session?',
      a: 'Yes! You can upload multiple study materials to one chat. EduMind AI indexes all uploaded files into the current chat workspace so you can ask queries across all your documents simultaneously.',
    },
    {
      q: 'Are documents isolated between chats?',
      a: 'Absolutely. Every study chat possesses a completely independent knowledge space. Vector searches strictly apply a mandatory chat_id filter, guaranteeing that documents from Chat A are never retrieved or seen in Chat B.',
    },
    {
      q: 'Are answers based directly on my uploaded content?',
      a: 'Yes. EduMind AI uses Retrieval-Augmented Generation (RAG). It retrieves relevant chunks from your documents first, then prompts Gemini to generate a response grounded strictly in those excerpts.',
    },
    {
      q: 'What happens when information is not found in my uploaded documents?',
      a: 'If your query cannot be answered by the uploaded documents, EduMind AI will respond cleanly: "I couldn\'t find this information in the documents uploaded to this study chat." It will never invent or hallucinate facts.',
    },
    {
      q: 'Can I delete a document from an existing chat?',
      a: 'Yes. You can delete individual documents from a chat at any time. Deleting a document removes its original file and purges all associated vector embeddings immediately.',
    },
    {
      q: 'Can I delete a chat and all its associated data?',
      a: 'Yes. Deleting a chat permanently purges all chat messages, document records, saved files, and vector embeddings belonging to that chat ID.',
    },
  ];

  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-[#0A0A0A] border-b border-white/10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#FEF08A] block mb-2">
            Knowledge Base // 04
          </span>
          <h2 className="text-4xl sm:text-5xl font-black uppercase tracking-tight text-white">
            FREQUENTLY ASKED
          </h2>
        </div>

        <div className="space-y-3">
          {faqData.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-[#121212] border border-white/10 overflow-hidden transition-colors hover:border-[#FEF08A]"
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full text-left p-5 flex items-center justify-between text-white font-bold text-sm sm:text-base uppercase tracking-tight hover:text-[#FEF08A] transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[#FEF08A]">0{index + 1}.</span>
                    {item.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#FEF08A] shrink-0 ml-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#808080] shrink-0 ml-4" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs text-[#A0A0A0] leading-relaxed border-t border-white/10 font-medium">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
