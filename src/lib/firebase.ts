import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyChzwHWlQOFkj_aU8j1KwFNw1UqQm6W9F0",
  authDomain: "studio-3422235219-dd152.firebaseapp.com",
  projectId: "studio-3422235219-dd152",
  storageBucket: "studio-3422235219-dd152.appspot.com",
  messagingSenderId: "535414415577",
  appId: "1:535414415577:web:eef956eb5c4c063892dec8",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
