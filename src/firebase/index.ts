import {
  Query,
  collection,
  onSnapshot,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

// Re-exporting from provider
export { useAuth, useFirestore } from './provider';

// Collection Hook
type DocumentWithId<T> = T & { id: string };

export function useCollection<T>(query: Query | undefined) {
  const [data, setData] = useState<DocumentWithId<T>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(
      query,
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
  }, [query ? query.path : '']);

  return { data, loading, error };
}
