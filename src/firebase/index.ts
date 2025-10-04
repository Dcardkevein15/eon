'use client';
import {
  Query,
  onSnapshot,
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
    // Firestore queries are complex objects. `isEqual` is the official way but is causing issues.
    // A pragmatic approach for many cases is to compare the query's internal path and constraints.
    // This is not foolproof for all possible queries, but robust for common cases like the one in this app.
    return (
      prev &&
      next &&
      // @ts-ignore internal property
      prev._query.path.isEqual(next._query.path) &&
      // @ts-ignore internal property
      JSON.stringify(prev._query.explicitOrderBy) === JSON.stringify(next._query.explicitOrderBy) &&
      // @ts-ignore internal property
      JSON.stringify(prev._query.filters) === JSON.stringify(next._query.filters) &&
      // @ts-ignore internal property
      prev._query.limit === next._query.limit
    );
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
