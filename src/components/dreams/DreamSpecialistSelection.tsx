
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { BrainCircuit, Sparkles, Sprout, Footprints, Loader2 } from 'lucide-react';
import type { DreamSpecialist } from '@/lib/types';
import { useState } from 'react';

const specialists: DreamSpecialist[] = [
  {
    name: 'El Psicólogo Junguiano',
    title: 'Análisis Profundo',
    description: 'Explora arquetipos, sombras y el lenguaje del subconsciente para un entendimiento psicológico.',
    perspective: 'psychological',
    icon: BrainCircuit,
  },
  {
    name: 'El Intérprete Simbólico',
    title: 'Diccionario Personal',
    description: 'Decodifica cada símbolo de tu sueño, conectándolo con tu vida y tus emociones personales.',
    perspective: 'symbolic',
    icon: Sparkles,
  },
  {
    name: 'El Guía Espiritual',
    title: 'Mensaje del Alma',
    description: 'Descubre las lecciones, advertencias y guías que tu ser superior o el universo te envían.',
    perspective: 'spiritual',
    icon: Sprout,
  },
  {
    name: 'El Onironauta Chamánico',
    title: 'Viaje Energético',
    description: 'Interpreta el sueño como un viaje a otros planos para recuperar energía y encontrar animales de poder.',
    perspective: 'shamanic',
    icon: Footprints,
  },
];

interface DreamSpecialistSelectionProps {
  onSelectSpecialist: (specialist: DreamSpecialist) => void;
  isLoading: boolean;
}

export default function DreamSpecialistSelection({ onSelectSpecialist, isLoading }: DreamSpecialistSelectionProps) {
  const [selected, setSelected] = useState<DreamSpecialist | null>(null);
  
  const handleSelect = (specialist: DreamSpecialist) => {
    setSelected(specialist);
    onSelectSpecialist(specialist);
  }

  return (
    <div className="w-full max-w-4xl mx-auto text-center my-auto">
       <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
        >
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Elige tu Guía Onírico</h2>
        <p className="text-lg text-muted-foreground mt-2">¿Desde qué perspectiva quieres interpretar tu sueño?</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {specialists.map((specialist, index) => {
          const Icon = specialist.icon;
          const isThisLoading = isLoading && selected?.perspective === specialist.perspective;
          return (
            <motion.div
              key={specialist.perspective}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
            >
              <Card 
                className="text-left h-full flex flex-col bg-card/50 hover:bg-card/80 hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => !isLoading && handleSelect(specialist)}
              >
                <CardHeader>
                  <div className="mb-4 text-primary group-hover:scale-110 transition-transform">
                    <Icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-base">{specialist.name}</CardTitle>
                  <CardDescription className="text-xs">{specialist.title}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">{specialist.description}</p>
                </CardContent>
                <div className="p-4 pt-0">
                    <Button 
                        className="w-full"
                        variant={isThisLoading ? "secondary" : "default"}
                        disabled={isLoading}
                    >
                       {isThisLoading ? (
                           <>
                             <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                             Analizando...
                           </>
                       ) : 'Elegir'}
                    </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
