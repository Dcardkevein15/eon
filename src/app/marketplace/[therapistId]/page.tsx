'use client';

import { THERAPISTS_DATA } from '@/lib/placeholder-data';
import Image from 'next/image';
import { notFound, useParams } from 'next/navigation';
import { Star, BadgeCheck, Languages, BrainCircuit, MessageSquare, CalendarPlus, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProfileSection from '@/components/marketplace/profile-section';
import Link from 'next/link';

export default function TherapistProfilePage() {
  const params = useParams();
  const therapistId = params.therapistId as string;

  // In a real app, you would fetch this data from your API/database
  const therapist = THERAPISTS_DATA.find((t) => t.id === therapistId);

  if (!therapist) {
    notFound();
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
           <Button asChild variant="ghost" className='-ml-4'>
                <Link href="/marketplace">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Volver al Marketplace
                </Link>
            </Button>
        </div>

        {/* Hero Section */}
        <Card className="overflow-hidden mb-6">
            <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="relative flex-shrink-0">
                        <Image
                        src={therapist.photoUrl}
                        alt={therapist.name}
                        width={160}
                        height={160}
                        data-ai-hint="therapist portrait"
                        className="rounded-xl object-cover w-40 h-40 border"
                        />
                        {therapist.verified && (
                        <div className="absolute -top-3 -right-3 bg-background rounded-full p-1">
                            <BadgeCheck className="h-8 w-8 text-primary" fill="hsl(var(--background))" />
                        </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-3xl font-bold tracking-tight">{therapist.name}</h1>
                        <p className="text-md text-muted-foreground mt-1">{therapist.credentials}</p>
                        <div className="flex items-center gap-2 mt-3">
                            <div className="flex items-center gap-1 text-amber-500">
                                <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                                <span className="text-lg font-bold">{therapist.rating.toFixed(1)}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">({therapist.reviewsCount} reseñas)</span>
                        </div>
                         <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <Button size="lg" className="flex-1">
                               <CalendarPlus className="mr-2 h-4 w-4" />
                                Reservar una Sesión
                            </Button>
                            <Button size="lg" variant="outline" className="flex-1">
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Enviar Mensaje
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* About Section */}
        <ProfileSection title="Sobre mí">
          <p className="text-foreground/80 whitespace-pre-wrap">{therapist.bio}</p>
        </ProfileSection>

        {/* Specialties & Languages */}
        <div className="grid md:grid-cols-2 gap-6">
            <ProfileSection title="Especialidades" icon={<BrainCircuit className='w-5 h-5 text-primary' />}>
                <div className="flex flex-wrap gap-2">
                    {therapist.specialties.map(specialty => (
                        <Badge key={specialty} variant="secondary">{specialty}</Badge>
                    ))}
                </div>
            </ProfileSection>
            <ProfileSection title="Idiomas" icon={<Languages className='w-5 h-5 text-primary' />}>
                <div className="flex flex-wrap gap-2">
                    {therapist.languages.map(lang => (
                        <Badge key={lang} variant="secondary">{lang}</Badge>
                    ))}
                </div>
            </ProfileSection>
        </div>

        {/* TODO: Add sections for Services, Availability Calendar, and Reviews */}

      </div>
    </div>
  );
}
