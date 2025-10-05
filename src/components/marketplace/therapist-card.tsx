'use client';

import Image from 'next/image';
import { Star, Languages, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Therapist } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TherapistCardProps {
  therapist: Therapist;
}

export default function TherapistCard({ therapist }: TherapistCardProps) {
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-shrink-0">
            <Image
              src={therapist.photoUrl}
              alt={therapist.name}
              width={128}
              height={128}
              data-ai-hint="therapist portrait"
              className="rounded-lg object-cover w-32 h-32"
            />
            {therapist.verified && (
                <div className="absolute -top-2 -right-2 bg-background rounded-full p-0.5">
                    <BadgeCheck className="h-6 w-6 text-primary" fill="hsl(var(--background))" />
                </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold truncate">{therapist.name}</h3>
                <div className="flex items-center gap-1 text-sm font-semibold text-amber-500 flex-shrink-0">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                    <span>{therapist.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground font-normal">({therapist.reviewsCount})</span>
                </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1 truncate">{therapist.credentials}</p>
            
            <div className="mt-2 flex flex-wrap gap-1">
              {therapist.specialties.slice(0, 3).map((specialty) => (
                <Badge key={specialty} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>

            <div className="mt-3 border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Languages className="w-4 h-4" />
                        <span>{therapist.languages.join(', ')}</span>
                    </div>
                    <div className="text-right">
                        <p className="font-bold text-base text-foreground">${therapist.pricePerSession}</p>
                        <p className="text-xs text-muted-foreground -mt-1">/ sesión</p>
                    </div>
                </div>
            </div>
             <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <Button className="flex-1">Ver Perfil</Button>
              <Button variant="outline" className="flex-1">Reservar</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
