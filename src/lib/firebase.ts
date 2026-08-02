import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore, Firestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

export interface CustomFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
  databaseId?: string;
}

const getStoredFirebaseConfig = (): CustomFirebaseConfig => {
  try {
    const saved = localStorage.getItem('edumind_custom_firebase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectId || parsed.apiKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading saved Firebase config:', e);
  }

  return {
    apiKey: appletConfig.apiKey,
    authDomain: appletConfig.authDomain,
    projectId: appletConfig.projectId,
    storageBucket: appletConfig.storageBucket,
    messagingSenderId: appletConfig.messagingSenderId,
    appId: appletConfig.appId,
    firestoreDatabaseId: appletConfig.firestoreDatabaseId,
    databaseId: appletConfig.firestoreDatabaseId,
  };
};

export const activeFirebaseConfig = getStoredFirebaseConfig();

const isFirebaseConfigured = Boolean(
  activeFirebaseConfig.apiKey &&
  activeFirebaseConfig.projectId
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

try {
  app = getApps().length === 0 ? initializeApp(activeFirebaseConfig) : getApp();
  auth = getAuth(app);
  const dbId = activeFirebaseConfig.firestoreDatabaseId || activeFirebaseConfig.databaseId;
  db = dbId ? getFirestore(app, dbId) : getFirestore(app);
} catch (err) {
  console.warn('Firebase initialization notice:', err);
}

export function updateCustomFirebaseConfig(config: CustomFirebaseConfig) {
  try {
    localStorage.setItem('edumind_custom_firebase_config', JSON.stringify(config));
    window.location.reload();
  } catch (err) {
    console.error('Failed to save Firebase config:', err);
  }
}

export function resetCustomFirebaseConfig() {
  localStorage.removeItem('edumind_custom_firebase_config');
  window.location.reload();
}

export { app, auth, db, googleProvider, isFirebaseConfigured };

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  createdAt?: any;
}

// Sync user profile to Firestore
export async function syncUserProfile(user: FirebaseUser): Promise<UserProfile> {
  const profile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Student User',
    photoURL: user.photoURL || null,
  };

  if (db) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          ...profile,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.warn('Firestore user profile sync warning:', err);
    }
  }

  return profile;
}

