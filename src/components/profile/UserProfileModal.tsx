import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Cpu,
  Database,
  Sparkles,
  FileText,
  MessageSquare,
  Key,
  LogOut,
  Edit3,
  Check,
  X,
  Activity,
  HardDrive,
  Layers,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Chat } from '../../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, chats }) => {
  const { user, updateProfileName, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'ai_usability'>('profile');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen || !user) return null;

  // Compute user statistics
  const totalChats = chats.length;
  const totalDocs = chats.reduce((acc, c) => acc + (c.documents?.length || 0), 0);
  const totalMessages = chats.reduce((acc, c) => acc + (c.messages?.length || 0), 0);

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await updateProfileName(newName.trim());
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update name', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0F0F0F] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Account & Profile Settings</h2>
              <p className="text-xs text-neutral-400">Manage user profile, account details, and AI system metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/40 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-emerald-500 text-white bg-white/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile Details</span>
          </button>
          <button
            onClick={() => setActiveTab('ai_usability')}
            className={`flex items-center space-x-2 py-3 px-4 border-b-2 text-sm font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === 'ai_usability'
                ? 'border-emerald-500 text-white bg-white/5'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>AI Usability & Telemetry</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* User Identity Card */}
              <div className="p-5 bg-neutral-900/60 border border-white/10 rounded-xl flex items-center space-x-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-16 h-16 rounded-full border-2 border-emerald-500/30 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    {isEditingName ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className="px-3 py-1 bg-black border border-emerald-500/50 rounded text-sm text-white focus:outline-none"
                        />
                        <button
                          onClick={handleSaveName}
                          disabled={saving}
                          className="p-1 bg-emerald-500 text-black rounded hover:bg-emerald-400 transition cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          className="p-1 bg-neutral-800 text-neutral-300 rounded hover:bg-neutral-700 transition cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-bold text-white truncate">
                          {user.displayName || 'Student User'}
                        </h3>
                        <button
                          onClick={() => {
                            setNewName(user.displayName || '');
                            setIsEditingName(true);
                          }}
                          className="text-neutral-400 hover:text-emerald-400 p-1 cursor-pointer"
                          title="Edit Name"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active User
                    </span>
                  </div>
                  <p className="text-sm text-neutral-400 truncate mt-0.5">{user.email}</p>
                  <p className="text-xs text-neutral-500 font-mono mt-1">UID: {user.uid}</p>
                </div>
              </div>

              {/* Account Details Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-900/40 border border-white/5 rounded-lg">
                  <div className="flex items-center space-x-2 text-xs text-neutral-400 mb-1">
                    <Key className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Authentication Method</span>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {user.email?.includes('gmail') || user.photoURL ? 'Google SSO Account' : 'EduMind Secure Auth'}
                  </p>
                </div>

                <div className="p-4 bg-neutral-900/40 border border-white/5 rounded-lg">
                  <div className="flex items-center space-x-2 text-xs text-neutral-400 mb-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Data Privacy Guarantee</span>
                  </div>
                  <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> Strictly Isolated Storage
                  </p>
                </div>
              </div>

              {/* Isolation Notice */}
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-xs text-neutral-300 space-y-1">
                <p className="font-semibold text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Multi-Tenant Data Isolation Active
                </p>
                <p className="text-neutral-400 leading-relaxed">
                  Your chat history, uploaded document vault, and AI memory indexes are isolated to your unique user ID (<code className="text-emerald-300">{user.uid}</code>). No other user can view or query your documents.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* AI Usability Metrics Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-neutral-900/80 border border-white/10 rounded-xl text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-white">{totalChats}</p>
                  <p className="text-xs text-neutral-400 mt-1">Study Sessions</p>
                </div>

                <div className="p-4 bg-neutral-900/80 border border-white/10 rounded-xl text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-white">{totalDocs}</p>
                  <p className="text-xs text-neutral-400 mt-1">Vault Documents</p>
                </div>

                <div className="p-4 bg-neutral-900/80 border border-white/10 rounded-xl text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-white">{totalMessages}</p>
                  <p className="text-xs text-neutral-400 mt-1">AI Interactions</p>
                </div>
              </div>

              {/* System Architecture Specifications */}
              <div className="bg-neutral-900/40 border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" /> AI Engine Configuration
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    STATUS: OPERATIONAL
                  </span>
                </div>
                <div className="p-4 space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-neutral-400 flex items-center gap-2">
                      <Cpu className="w-3.5 h-3.5 text-neutral-500" /> Primary AI Model
                    </span>
                    <span className="text-white font-mono font-medium">Gemini 1.5 Flash</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-neutral-400 flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-neutral-500" /> Knowledge RAG Pipeline
                    </span>
                    <span className="text-emerald-400 font-mono font-medium">FastAPI Python + Vector Index</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                    <span className="text-neutral-400 flex items-center gap-2">
                      <HardDrive className="w-3.5 h-3.5 text-neutral-500" /> Document Vector Store
                    </span>
                    <span className="text-white font-mono font-medium">TF-IDF + Cosine Similarity Search</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-neutral-400 flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-neutral-500" /> User Context Scope
                    </span>
                    <span className="text-neutral-300 font-mono">Scoped to <code className="text-emerald-400">{user.uid}</code></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-white/10 bg-white/[0.02]">
          <button
            onClick={async () => {
              await logout();
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/50 hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white text-black hover:bg-neutral-200 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};


