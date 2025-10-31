'use client';

import { useAuth, useDocument, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { CircleDollarSign } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { User } from '@/lib/types';

export default function UserCredits() {
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();

  const userRef = useMemo(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : undefined),
    [firestore, user]
  );

  const { data: userData, loading: userLoading } = useDocument<User>(userRef);

  const isLoading = authLoading || userLoading;
  const credits = userData?.articleGenerationCredits ?? 0;

  if (isLoading) {
    return <Skeleton className="h-8 w-20" />;
  }

  if (!user) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">
            <CircleDollarSign className="h-4 w-4" />
            <span>{credits}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Créditos para generar artículos.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
