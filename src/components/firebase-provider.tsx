'use client';
import { ReactNode } from 'react';
import { initializeFirebase } from '@/lib/firebase';
import { AuthProvider } from '@/components/providers';
import { FirestoreProvider } from '@/hooks/use-firebase';

// Initialize Firebase once
const { app, auth, firestore } = initializeFirebase();

export function FirebaseProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider auth={auth}>
      <FirestoreProvider firestore={firestore}>{children}</FirestoreProvider>
    </AuthProvider>
  );
}
