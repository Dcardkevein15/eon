'use client';

import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseOptions,
} from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
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
  if (getApps().length > 0) {
    const app = getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const storage = getStorage(app);
    return { app, auth, firestore, storage };
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const storage = getStorage(app);

  if (process.env.NEXT_PUBLIC_EMULATOR_HOST) {
    const host = process.env.NEXT_PUBLIC_EMULATOR_HOST;
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(firestore, host, 8080);
    connectStorageEmulator(storage, host, 9199);
  }

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
