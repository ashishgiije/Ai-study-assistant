import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  syncUserProfile,
  UserProfile,
  db,
} from '../lib/firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebaseConfigured: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const local = localStorage.getItem('edumind_user');
      return local ? JSON.parse(local) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await syncUserProfile(firebaseUser);
          setUser(profile);
          localStorage.setItem('edumind_user', JSON.stringify(profile));
        } catch (err) {
          console.error('Error syncing user profile:', err);
        }
      } else {
        setUser(null);
        localStorage.removeItem('edumind_user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      const profile = await syncUserProfile(result.user);
      setUser(profile);
      localStorage.setItem('edumind_user', JSON.stringify(profile));
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    const result = await signInWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      const profile = await syncUserProfile(result.user);
      setUser(profile);
      localStorage.setItem('edumind_user', JSON.stringify(profile));
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    if (!auth) throw new Error('Firebase Auth is not initialized');
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (result.user) {
      if (name.trim()) {
        await updateProfile(result.user, { displayName: name.trim() });
      }
      const profile = await syncUserProfile(result.user);
      setUser(profile);
      localStorage.setItem('edumind_user', JSON.stringify(profile));
    }
  };

  const logout = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    setUser(null);
    localStorage.removeItem('edumind_user');
  };

  const updateProfileName = async (newName: string) => {
    if (!user) return;
    const updatedUser: UserProfile = {
      ...user,
      displayName: newName,
    };
    setUser(updatedUser);
    localStorage.setItem('edumind_user', JSON.stringify(updatedUser));

    if (auth?.currentUser) {
      await updateProfile(auth.currentUser, { displayName: newName });
    }

    if (db) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { displayName: newName });
      } catch (e) {
        console.warn('Error updating Firestore name:', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebaseConfigured,
        loginWithGoogle,
        loginWithEmail,
        signupWithEmail,
        logout,
        updateProfileName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


