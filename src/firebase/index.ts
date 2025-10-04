'use client';
import {
  Query,
  onSnapshot,
  isEqual,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useMemoCompare } from './use-memo-compare';


// Re-exporting from provider
export { useAuth, useFirestore, useFirebaseApp } from './provider';

// Collection Hook
type DocumentWithId<T> = T & { id: string };

export function useCollection<T>(query: Query | undefined) {
  const [data, setData] = useState<DocumentWithId<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const queryMemo = useMemoCompare(query, (prev, next) => {
    // isEqual is a Firestore function to compare queries
    return prev && next ? isEqual(prev, next) : prev === next;
  });

  useEffect(() => {
    if (!queryMemo) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      queryMemo,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as DocumentWithId<T>)
        );
        setData(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Error in useCollection:", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryMemo]);

  return { data, loading, error };
}
