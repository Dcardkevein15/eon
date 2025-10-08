'use client';
import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';

// This is a client-side only component that will listen for errors
// and log them to the console in a structured way that Next.js can pick up.
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: any) => {
      // Throw the error so Next.js can catch it and display the overlay.
      // The error object has a rich `toString()` method for good formatting.
      throw error;
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null; // This component does not render anything.
}
