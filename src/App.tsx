import React, { useState, useEffect } from 'react';
import { Navbar } from './components/landing/Navbar';
import { Hero } from './components/landing/Hero';
import { Features } from './components/landing/Features';
import { HowItWorks } from './components/landing/HowItWorks';
import { RAGTechnology } from './components/landing/RAGTechnology';
import { FAQ } from './components/landing/FAQ';
import { Footer } from './components/landing/Footer';
import { StudySidebar } from './components/study/StudySidebar';
import { ChatWindow } from './components/study/ChatWindow';
import { UserProfileModal } from './components/profile/UserProfileModal';
import { AuthModal } from './components/auth/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useChats } from './hooks/useChats';
import { useDocuments } from './hooks/useDocuments';
import { useChat } from './hooks/useChat';

function AppContent() {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'landing' | 'study'>('landing');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const { chats, createChat, renameChat, deleteChat, loadChats } = useChats();
  const { documents, uploading, uploadFiles, deleteDocument } = useDocuments(activeChatId);
  const { chat, messages, loading: chatLoading, sending, askQuestion } = useChat(activeChatId);

  // Reload user-scoped chats whenever user changes
  useEffect(() => {
    loadChats();
  }, [user?.uid, loadChats]);

  // Reset document filter when chat changes
  useEffect(() => {
    setSelectedDocumentId(null);
  }, [activeChatId]);

  // Handle auth state changes and URL protection
  useEffect(() => {
    if (!user) {
      setCurrentView('landing');
      if (window.location.pathname.startsWith('/study')) {
        window.history.pushState({}, '', '/');
      }
    } else {
      const path = window.location.pathname;
      if (path.startsWith('/study')) {
        setCurrentView('study');
        const parts = path.split('/study/');
        if (parts[1]) {
          setActiveChatId(parts[1]);
        }
      }
    }
  }, [user]);

  // Update address bar path when view or active chat changes
  const navigateTo = (view: 'landing' | 'study', chatId?: string | null) => {
    if (view === 'study' && !user) {
      setIsAuthModalOpen(true);
      return;
    }

    setCurrentView(view);
    if (view === 'landing') {
      window.history.pushState({}, '', '/');
    } else {
      const targetId = chatId || activeChatId;
      if (targetId) {
        setActiveChatId(targetId);
        window.history.pushState({}, '', `/study/${targetId}`);
      } else {
        window.history.pushState({}, '', '/study');
      }
    }
  };

  const handleGetStarted = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      let targetChatId: string | null = null;
      if (chats.length > 0) {
        targetChatId = chats[0].id;
      } else {
        const newChat = await createChat('My First Study Session');
        targetChatId = newChat.id;
      }
      navigateTo('study', targetChatId);
    } catch (err) {
      console.error('Error starting chat session:', err);
      navigateTo('study');
    }
  };

  const handleNewChat = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const newChat = await createChat('New Study Session');
      navigateTo('study', newChat.id);
    } catch (err) {
      console.error('Error creating new chat:', err);
    }
  };

  const handleUploadDocuments = async (files: File[]) => {
    let targetChatId = activeChatId;
    if (!targetChatId) {
      const newChat = await createChat('My Study Session');
      targetChatId = newChat.id;
      setActiveChatId(targetChatId);
      window.history.pushState({}, '', `/study/${targetChatId}`);
    }
    return uploadFiles(files, targetChatId);
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await deleteChat(id);
      if (activeChatId === id) {
        const remaining = chats.filter(c => c.id !== id);
        if (remaining.length > 0) {
          setActiveChatId(remaining[0].id);
          window.history.pushState({}, '', `/study/${remaining[0].id}`);
        } else {
          setActiveChatId(null);
          window.history.pushState({}, '', '/study');
        }
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (currentView !== 'landing') {
      setCurrentView('landing');
      window.history.pushState({}, '', '/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col font-sans antialiased selection:bg-[#7C3AED]/30 selection:text-white">
      {/* Auth Registration & Sign In Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          handleGetStarted();
        }}
      />

      {/* User Profile & AI Telemetry Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        chats={chats}
      />

      {currentView === 'landing' ? (
        <>
          <Navbar
            onGetStarted={handleGetStarted}
            onNavigateSection={scrollToSection}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenAuth={() => setIsAuthModalOpen(true)}
          />
          <main className="flex-1">
            <Hero
              onGetStarted={handleGetStarted}
              onExploreFeatures={() => scrollToSection('features')}
            />
            <Features />
            <HowItWorks />
            <RAGTechnology />
            <FAQ />
          </main>
          <Footer />
        </>
      ) : (
        <div className="relative flex flex-col lg:flex-row h-screen overflow-hidden">
          <StudySidebar
            chats={chats}
            activeChatId={activeChatId}
            documents={documents}
            uploading={uploading}
            selectedDocumentId={selectedDocumentId}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onSelectDocument={setSelectedDocumentId}
            onNewChat={handleNewChat}
            onSelectChat={id => navigateTo('study', id)}
            onRenameChat={renameChat}
            onDeleteChat={handleDeleteChat}
            onUploadDocuments={handleUploadDocuments}
            onDeleteDocument={deleteDocument}
            onNavigateHome={() => navigateTo('landing')}
            onOpenProfile={() => setIsProfileModalOpen(true)}
          />
          <ChatWindow
            chat={chat}
            messages={messages}
            documents={documents}
            loading={chatLoading}
            sending={sending}
            selectedDocumentId={selectedDocumentId}
            onSelectDocument={setSelectedDocumentId}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onSendMessage={(text, docId) => askQuestion(text, docId || selectedDocumentId || undefined)}
            onRenameChat={renameChat}
            onOpenUpload={() => {
              // Trigger upload file picker in sidebar
              const el = document.querySelector('input[type="file"]') as HTMLInputElement;
              el?.click();
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}


