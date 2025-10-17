'use client';

import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyChzwHWlQOFkj_aU8j1KwFNw1UqQm6W9F0",
  authDomain: "studio-3422235219-dd152.firebaseapp.com",
  projectId: "studio-3422235219-dd152",
  storageBucket: "studio-3422235219-dd152.appspot.com",
  messagingSenderId: "535414415577",
  appId: "1:535414415577:web:eef956eb5c4c063892dec8",
};

function initializeFirebase() {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  auth.setPersistence({type: 'SESSION'});
  const firestore = getFirestore(app);
  const storage = getStorage(app);
  return { app, auth, firestore, storage };
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const { auth, firestore, storage } = useMemo(() => initializeFirebase(), []);

  return (
    <FirebaseProvider auth={auth} firestore={firestore} storage={storage}>
      {children}
    </FirebaseProvider>
  );
}
