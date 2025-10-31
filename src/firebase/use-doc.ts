'use client';

import { DocumentReference, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useMemoCompare } from './use-memo-compare';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from './errors';

type DocumentWithId<T> = T & { id: string };

export function useDocument<T>(ref: DocumentReference | undefined) {
  const [data, setData] = useState<DocumentWithId<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refMemo = useMemoCompare(ref, (prev, next) => {
    return prev && next && prev.path === next.path;
  });

  useEffect(() => {
    if (!refMemo) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const unsubscribe = onSnapshot(
      refMemo,
      (snapshot) => {
        if (snapshot.exists()) {
          const docData = { ...snapshot.data(), id: snapshot.id } as DocumentWithId<T>;
          setData(docData);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => { // <<< ASYNC REMOVED HERE
        setLoading(false);
        setError(err);
        if (err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: refMemo.path,
            operation: 'get',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
      }
    );

    return () => unsubscribe();
  }, [refMemo]);

  return { data, loading, error };
}
