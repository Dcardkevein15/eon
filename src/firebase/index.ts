'use client';
import {
  Query,
  onSnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useMemoCompare } from './use-memo-compare';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from './errors';


// Re-exporting from provider
export { useAuth, useFirestore, useFirebaseApp, useStorage } from './provider';

// Collection Hook
type DocumentWithId<T> = T & { id: string };

export function useCollection<T>(query: Query | undefined) {
  const [data, setData] = useState<DocumentWithId<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const queryMemo = useMemoCompare(query, (prev, next) => {
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
    setError(null);
    const unsubscribe = onSnapshot(
      queryMemo,
      (snapshot) => {
        const docs = snapshot.docs.map(
          (doc) => ({ ...doc.data(), id: doc.id } as DocumentWithId<T>)
        );
        setData(docs);
        setLoading(false);
      },
      async (err) => {
        setLoading(false);
        setError(err);
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            // @ts-ignore internal property
            path: queryMemo._query.path.toString(),
            operation: 'list',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
      }
    );

    return () => unsubscribe();
  }, [queryMemo]);

  return { data, loading, error };
}
