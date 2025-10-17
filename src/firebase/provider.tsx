'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  type Auth,
  type User as FirebaseUser,
  getIdTokenResult,
} from 'firebase/auth';
import { type Firestore } from 'firebase/firestore';
import { type FirebaseStorage } from 'firebase/storage';
import { type FirebaseApp } from 'firebase/app';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

// Main Firebase Context
interface FirebaseContextType {
    auth: Auth;
    firestore: Firestore;
    storage: FirebaseStorage;
    app: FirebaseApp;
}
const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

// Auth Context
interface AuthContextType {
  user: FirebaseUser | null;
  userRoles: string[];
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { displayName?: string | null; photoURL?: string | null; }) => Promise<void>;
  auth: Auth;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  auth,
}: {
  children: ReactNode;
  auth: Auth;
}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // FOR TESTING: Assign admin role to any logged in user
        // In production, roles should be managed securely via custom claims set on the backend.
        setUserRoles(['admin']); 
        
        // PRODUCTION-READY CODE:
        // const tokenResult = await getIdTokenResult(firebaseUser);
        // const roles = (tokenResult.claims.roles as string[]) || [];
        // setUserRoles(roles);
      } else {
        setUserRoles([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Don't log the error if the user cancelled the popup
      if (error.code !== 'auth/cancelled-popup-request') {
        console.error('Error al iniciar sesión con Google:', error);
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const updateProfile = useCallback(async (updates: { displayName?: string | null; photoURL?: string | null; }) => {
    if (auth.currentUser) {
      try {
        await firebaseUpdateProfile(auth.currentUser, updates);
        // Manually update the user state to trigger a re-render in consumers
        setUser(auth.currentUser);
      } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
    }
  }, [auth]);

  return (
    <AuthContext.Provider value={{ user, userRoles, loading, signInWithGoogle, signOut, updateProfile, auth }}>
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

// Generic Context Hook
function createFirebaseHook<T>(context: React.Context<T | undefined>): () => T {
    return () => {
      const ctx = useContext(context);
      if (ctx === undefined) {
        throw new Error('use-context must be used within a provider');
      }
      return ctx;
    };
}

export const useFirebase = createFirebaseHook(FirebaseContext);

export const useFirebaseApp = (): FirebaseApp => useFirebase().app;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useStorage = (): FirebaseStorage => useFirebase().storage;


// Combined Firebase Provider
export function FirebaseProvider({
    children,
    auth,
    firestore,
    storage,
}: {
    children: ReactNode;
    auth: Auth;
    firestore: Firestore;
    storage: FirebaseStorage;
}) {
    const app = auth.app;
    return (
        <FirebaseContext.Provider value={{ app, auth, firestore, storage }}>
            <AuthProvider auth={auth}>
                <FirebaseErrorListener />
                {children}
            </AuthProvider>
        </FirebaseContext.Provider>
    );
}
