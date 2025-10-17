'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Languages, BadgeCheck, Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { Therapist } from '@/lib/types';
import { Separator } from '../ui/separator';

interface TherapistCardProps {
  therapist: Therapist;
  onEdit: (therapist: Therapist) => void;
  isAdmin: boolean;
}

export default function TherapistCard({ therapist, onEdit, isAdmin }: TherapistCardProps) {
  return (
    <Card className="flex flex-col h-full overflow-hidden transition-all duration-300 bg-card/50 hover:bg-card/80 hover:shadow-primary/10 hover:shadow-lg hover:border-border">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <div className="relative flex-shrink-0">
            <Image
              src={therapist.photoUrl}
              alt={therapist.name}
              width={80}
              height={80}
              data-ai-hint="therapist portrait"
              className="rounded-lg object-cover w-20 h-20 border"
            />
            {therapist.verified && (
                <div className="absolute -top-2 -right-2 bg-background rounded-full p-0.5">
                    <BadgeCheck className="h-6 w-6 text-primary" fill="hsl(var(--background))" />
                </div>
            )}
        </div>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-lg truncate">{therapist.name}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1 truncate">{therapist.credentials}</p>
          <div className="flex items-center gap-1 text-sm font-semibold text-amber-400 mt-2">
              <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
              <span>{therapist.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground font-normal">({therapist.reviewsCount})</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 flex-grow">
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Especialidades</h4>
            <div className="flex flex-wrap gap-1 h-12 overflow-hidden">
              {therapist.specialties.map((specialty) => (
                <Badge key={specialty} variant="secondary" className="text-xs">
                  {specialty}
                </Badge>
              )).slice(0,3)}
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                  <Languages className="w-4 h-4" />
                  <span>{therapist.languages.join(', ')}</span>
              </div>
              <div className="text-right">
                  <p className="font-bold text-lg text-foreground">${therapist.pricePerSession}</p>
                  <p className="text-xs text-muted-foreground -mt-1">/ sesión</p>
              </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button asChild className="w-full">
          <Link href={`/marketplace/${therapist.id}`}>Ver Perfil</Link>
        </Button>
        <div className='flex w-full gap-2'>
            <Button variant="outline" className="w-full">Reservar</Button>
            {isAdmin && (
              <Button variant="secondary" size="icon" onClick={() => onEdit(therapist)} className="flex-shrink-0">
                <Edit className="w-4 h-4" />
                <span className="sr-only">Editar</span>
              </Button>
            )}
        </div>
      </CardFooter>
    </Card>
  );
}
