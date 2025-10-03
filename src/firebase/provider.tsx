'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
} from 'firebase/auth';
import { type Firestore } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { auth as firebaseAuth, firestore as firebaseFirestore } from '@/lib/firebase';

// Auth Context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  auth,
}: {
  children: ReactNode;
  auth: Auth;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


// Firestore Context
const FirestoreContext = createContext<Firestore | null>(null);

export function FirestoreProvider({
  children,
  firestore,
}: {
  children: ReactNode;
  firestore: Firestore;
}) {
  return (
    <FirestoreContext.Provider value={firestore}>
      {children}
    </FirestoreContext.Provider>
  );
}

export const useFirestore = (): Firestore => {
  const firestore = useContext(FirestoreContext);
  if (firestore === null) {
      throw new Error('useFirestore must be used within a FirestoreProvider');
  }
  return firestore;
};

// Firebase Provider
export function FirebaseProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider auth={firebaseAuth}>
      <FirestoreProvider firestore={firebaseFirestore}>
        {children}
      </FirestoreProvider>
    </AuthProvider>
  );
}
