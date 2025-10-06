'use client';

import { useContext, createContext } from 'react';
import { type FirebaseStorage } from 'firebase/storage';
import { useFirebase } from './provider';

// Create a new context for just the storage instance
const StorageContext = createContext<FirebaseStorage | undefined>(undefined);

// Custom hook to access storage
export const useStorage = (): FirebaseStorage => {
  const context = useFirebase();
  if (context === undefined) {
    throw new Error('useStorage must be used within a FirebaseProvider');
  }
  return context.storage;
};
