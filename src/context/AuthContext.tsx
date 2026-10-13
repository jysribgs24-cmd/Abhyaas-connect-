import React, { createContext, useContext, useEffect, useState } from 'react';
import { signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import {
  UserProfile,
  SavedDeviceSession,
  ClassGroup,
} from '../types';
import {
  loginWithUsernameAndPassword,
  getActiveUserSession,
  setActiveUserSession,
  getSavedDeviceSessions,
  saveDeviceSession,
  removeDeviceSession,
  ensureMasterAdminInitialized,
  registerStudentAndLogin,
} from '../lib/authService';
import { startAutomaticRetentionScheduler } from '../lib/dataService';

interface AuthContextType {
  currentUser: UserProfile | null;
  loading: boolean;
  savedSessions: SavedDeviceSession[];
  previewStudentClass: ClassGroup | null;
  setPreviewStudentClass: (cls: ClassGroup | null) => void;
  login: (username: string, pass: string, preferredRole?: 'admin' | 'student') => Promise<UserProfile>;
  registerStudent: (params: {
    name: string;
    username: string;
    password: string;
    className: string;
    section: string;
    rollNo?: string;
  }) => Promise<UserProfile>;
  logout: () => Promise<void>;
  switchAccount: (session: SavedDeviceSession, enteredPassword?: string) => Promise<void>;
  deleteSavedSession: (uid: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load active session immediately from storage so there is no flicker or unexpected logout
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getActiveUserSession());
  const [loading, setLoading] = useState(true);
  const [savedSessions, setSavedSessions] = useState<SavedDeviceSession[]>([]);
  const [previewStudentClass, setPreviewStudentClass] = useState<ClassGroup | null>(null);

  const refreshSessions = () => {
    setSavedSessions(getSavedDeviceSessions());
  };

  useEffect(() => {
    // 1. Ensure master admin and seed data exists in Firestore
    ensureMasterAdminInitialized().catch(console.warn);

    // 2. Load device saved sessions
    refreshSessions();

    // 3. Check active session
    const active = getActiveUserSession();
    if (active) {
      setCurrentUser(active);
    }
    setLoading(false);

    // 4. Synchronize with Firebase Auth if available
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            const profile: UserProfile = {
              uid: firebaseUser.uid,
              role: data.role || 'student',
              name: data.name || 'User',
              username: data.username || '',
              className: data.className || '',
              section: data.section || '',
              rollNo: data.rollNo || '',
              internalEmail: data.internalEmail || firebaseUser.email || '',
              createdAt: data.createdAt || new Date().toISOString(),
            };
            setCurrentUser(profile);
            setActiveUserSession(profile);
          }
        } catch {
          // If Firestore read fails, keep existing active session
        }
      }
    });

    // 5. Start automated 1-week message data retention scheduler
    const stopRetentionScheduler = startAutomaticRetentionScheduler();

    return () => {
      unsubscribe();
      stopRetentionScheduler();
    };
  }, []);

  const login = async (username: string, pass: string, preferredRole?: 'admin' | 'student'): Promise<UserProfile> => {
    setLoading(true);
    try {
      const profile = await loginWithUsernameAndPassword(username, pass, preferredRole);
      setCurrentUser(profile);
      setActiveUserSession(profile);
      refreshSessions();
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const registerStudent = async (params: {
    name: string;
    username: string;
    password: string;
    className: string;
    section: string;
    rollNo?: string;
  }): Promise<UserProfile> => {
    setLoading(true);
    try {
      const profile = await registerStudentAndLogin(params);
      setCurrentUser(profile);
      setActiveUserSession(profile);
      refreshSessions();
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      try {
        await firebaseSignOut(auth);
      } catch {}
      if (currentUser?.uid) {
        removeDeviceSession(currentUser.uid);
      }
      setCurrentUser(null);
      setActiveUserSession(null);
      setPreviewStudentClass(null);
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('active_user_profile');
      }
      refreshSessions();
    } finally {
      setLoading(false);
    }
  };

  const switchAccount = async (session: SavedDeviceSession, enteredPassword?: string) => {
    setLoading(true);
    setPreviewStudentClass(null);
    try {
      const passwordToUse = enteredPassword || session.authPassword;
      if (!passwordToUse) {
        throw new Error('Password required. Please enter your password to sign in.');
      }

      const profile = await loginWithUsernameAndPassword(session.username, passwordToUse, session.role);
      setCurrentUser(profile);
      setActiveUserSession(profile);
      refreshSessions();
    } finally {
      setLoading(false);
    }
  };

  const deleteSavedSession = (uid: string) => {
    removeDeviceSession(uid);
    refreshSessions();
  };

  const refreshProfile = async () => {
    if (!currentUser) return;
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) {
        const data = snap.data();
        const updated = {
          ...currentUser,
          name: data.name || currentUser.name,
          className: data.className || currentUser.className,
          section: data.section || currentUser.section,
          rollNo: data.rollNo || currentUser.rollNo,
        };
        setCurrentUser(updated);
        setActiveUserSession(updated);
      }
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        savedSessions,
        previewStudentClass,
        setPreviewStudentClass,
        login,
        registerStudent,
        logout,
        switchAccount,
        deleteSavedSession,
        refreshProfile,
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
