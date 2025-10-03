'use client';
import { createContext, useContext, ReactNode } from 'react';
import { Firestore } from 'firebase/firestore';

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

export const useFirestore = (): Firestore | null => {
  return useContext(FirestoreContext);
};
