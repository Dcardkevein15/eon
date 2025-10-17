'use client';

import type { Therapist } from '@/lib/types';
import TherapistCard from './therapist-card';
import { Skeleton } from '../ui/skeleton';

interface TherapistListProps {
  therapists: Therapist[];
  onEdit: (therapist: Therapist) => void;
  isAdmin: boolean;
  isLoading: boolean;
}

export default function TherapistList({ therapists, onEdit, isAdmin, isLoading }: TherapistListProps) {
  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    )
  }
  
  if (therapists.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-muted-foreground">
          No se encontraron terapeutas
        </h3>
        <p className="text-sm text-muted-foreground">
          Intenta ajustar los filtros para ampliar tu búsqueda.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {therapists.map((therapist) => (
        <TherapistCard key={therapist.id} therapist={therapist} onEdit={onEdit} isAdmin={isAdmin} />
      ))}
    </div>
  );
}
