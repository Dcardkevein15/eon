'use client';
import { ReactNode } from 'react';
import { initializeFirebase } from '@/lib/firebase';
import { AuthProvider } from '@/components/providers';
import { FirestoreProvider } from '@/hooks/use-firebase';

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const { app, auth, firestore } = initializeFirebase();
  return (
    <AuthProvider auth={auth}>
      <FirestoreProvider firestore={firestore}>{children}</FirestoreProvider>
    </AuthProvider>
  );
}
