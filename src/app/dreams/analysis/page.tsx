
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { DreamInterpretationDoc } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';

const SymbolCard = ({ symbol, personalMeaning, universalMeaning, icon, delay }: { symbol: string; personalMeaning: string; universalMeaning: string; icon: string, delay: number }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + delay * 0.15 }}
      className="[perspective:1000px] h-48"
    >
      <motion.div
        className="relative w-full h-full cursor-pointer [transform-style:preserve-3d]"
        onClick={() => setIsFlipped(!isFlipped)}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Front of Card */}
        <div className="absolute w-full h-full p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm flex flex-col items-center justify-center text-center [backface-visibility:hidden]">
          <div className="text-4xl mb-2">{icon}</div>
          <p className="font-semibold text-foreground">{symbol}</p>
          <p className="text-xs text-muted-foreground mt-2">(Toca para revelar)</p>
        </div>
        
        {/* Back of Card */}
        <div className="absolute w-full h-full p-4 rounded-xl bg-card border border-primary/30 flex flex-col justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <ScrollArea className="h-full">
              <p className="text-xs text-primary font-semibold uppercase tracking-wider">Significado Personal:</p>
              <p className="text-sm text-foreground/90 mb-2">{personalMeaning}</p>
              <p className="text-xs text-muted-foreground font-semibold uppercase mt-3 tracking-wider">Significado Universal:</p>
              <p className="text-xs text-muted-foreground">{universalMeaning}</p>
            </ScrollArea>
        </div>
      </motion.div>
    </motion.div>
  );
};


export default function DreamAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [dreamDoc, setDreamDoc] = useState<DreamInterpretationDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const dreamId = useMemo(() => searchParams.get('id'), [searchParams]);

  useEffect(() => {
    if (!dreamId) {
      toast({ variant: "destructive", title: "ID de sueño no encontrado", description: "Vuelve al portal para seleccionar un sueño." });
      router.push('/dreams');
      return;
    }

    try {
      const storedDreams = localStorage.getItem('dream-journal');
      if (storedDreams) {
        const dreams: DreamInterpretationDoc[] = JSON.parse(storedDreams);
        const foundDream = dreams.find(d => d.id === dreamId);
        if (foundDream) {
          setDreamDoc(foundDream);
        } else {
          toast({ variant: "destructive", title: "Análisis no encontrado", description: "No pudimos encontrar este sueño en tu diario local." });
          router.push('/dreams');
        }
      } else {
        toast({ variant: "destructive", title: "Diario de sueños no encontrado", description: "No se encontraron sueños guardados." });
        router.push('/dreams');
      }
    } catch (e) {
      console.error("Error loading dream from localStorage", e);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el análisis del sueño desde tu dispositivo." });
      router.push('/dreams');
    } finally {
      setLoading(false);
    }
  }, [dreamId, router, toast]);

  const analysis = dreamDoc?.interpretation;

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center text-foreground">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg">Cargando tu universo interior...</p>
        </div>
      </div>
    );
  }
  
  if (!analysis) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center text-white">
            <p className="mt-4 text-lg">No se encontró el análisis del sueño.</p>
             <Button asChild variant="ghost" className="mt-4 text-primary">
                <Link href="/dreams">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Volver al Portal
                </Link>
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ScrollArea className="h-screen">
        <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                 <Button asChild variant="ghost" className="-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
                    <Link href="/dreams">
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Volver al Portal
                    </Link>
                </Button>
            </motion.div>

           <motion.header 
                className="text-center my-12"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
           >
             <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
                {analysis.dreamTitle}
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
                Atmósfera del sueño: <span className="font-semibold text-foreground/80">{analysis.dominantFeeling}</span>
            </p>
           </motion.header>

          <div className="space-y-8">
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="bg-card/50 border-border/50 shadow-2xl shadow-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl text-primary">
                            <Sparkles className="w-6 h-6" />
                            Interpretación Narrativa
                        </CardTitle>
                        <CardDescription className="text-muted-foreground pt-2">
                            Así es como la trama de tu sueño refleja tu viaje psicológico actual.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="prose prose-base prose-invert max-w-none text-foreground/80">
                       <p>{analysis.narrativeInterpretation}</p>
                    </CardContent>
                </Card>
            </motion.div>

            <div>
                <motion.h2 
                    className="text-2xl font-bold text-center mb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    Símbolos Clave
                </motion.h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {analysis.symbolAnalysis.map((s, i) => (
                        <SymbolCard key={uuidv4()} {...s} delay={i} />
                    ))}
                </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl text-accent">
                            <BrainCircuit className="w-6 h-6" />
                            Arquetipo Dominante: {analysis.coreArchetype}
                        </CardTitle>
                        <CardDescription className="text-muted-foreground pt-2">
                           Esta es la energía o patrón de personalidad que tu subconsciente está explorando a través de este sueño.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </motion.div>
            
             <motion.div
                className="text-center pt-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
             >
                <h3 className="text-2xl font-semibold tracking-tight text-foreground/90">Para tu Reflexión</h3>
                <p className="mt-4 text-xl text-primary/90 italic max-w-3xl mx-auto">
                    "{analysis.reflectiveQuestion}"
                </p>
                <div className="max-w-2xl mx-auto mt-6">
                    <Textarea 
                        placeholder="Usa este espacio para continuar la conversación con tu subconsciente..."
                        className="min-h-[120px] bg-card/80 border-border rounded-xl p-4 text-base ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-0"
                    />
                </div>
            </motion.div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
