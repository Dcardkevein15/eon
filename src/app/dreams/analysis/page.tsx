'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { DreamInterpretationDoc, DreamInterpretation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { getDreamAction } from '@/app/actions';

const SymbolCard = ({ symbol, personalMeaning, universalMeaning, icon, delay }: { symbol: string; personalMeaning: string; universalMeaning: string; icon: string, delay: number }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + delay * 0.15 }}
      style={{ perspective: 1000 }}
    >
      <motion.div
        className="relative w-full h-48 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Front of Card */}
        <div className="absolute w-full h-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex flex-col items-center justify-center text-center" style={{ backfaceVisibility: 'hidden' }}>
          <div className="text-4xl mb-2">{icon}</div>
          <p className="font-semibold text-slate-200">{symbol}</p>
          <p className="text-xs text-slate-400 mt-2">(Toca para revelar)</p>
        </div>
        
        {/* Back of Card */}
        <div className="absolute w-full h-full p-4 rounded-xl bg-slate-800 border border-primary/50 flex flex-col justify-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
            <ScrollArea className="h-full">
              <p className="text-xs text-slate-400 font-semibold uppercase">Significado Personal:</p>
              <p className="text-sm text-slate-200 mb-2">{personalMeaning}</p>
              <p className="text-xs text-slate-500 font-semibold uppercase mt-3">Significado Universal:</p>
              <p className="text-xs text-slate-400">{universalMeaning}</p>
            </ScrollArea>
        </div>
      </motion.div>
    </motion.div>
  );
};


export default function DreamAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [dreamDoc, setDreamDoc] = useState<DreamInterpretationDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const dreamId = useMemo(() => searchParams.get('id'), [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        router.push('/dreams');
        return;
    }
    if (!dreamId) {
      toast({ variant: "destructive", title: "ID de sueño no encontrado", description: "Vuelve al portal para seleccionar un sueño." });
      router.push('/dreams');
      return;
    }

    const fetchDream = async () => {
        try {
            const token = await user.getIdToken();
            const result = await getDreamAction(dreamId, token);
            if (result) {
                setDreamDoc(result);
            } else {
                toast({ variant: "destructive", title: "Análisis no encontrado", description: "No pudimos encontrar este sueño en tu historial." });
                router.push('/dreams');
            }
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message || "No se pudo cargar el análisis del sueño." });
            router.push('/dreams');
        } finally {
            setLoading(false);
        }
    };
    
    fetchDream();

  }, [dreamId, user, authLoading, router, toast]);

  const analysis = dreamDoc?.interpretation;

  if (loading || !analysis) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <div className="text-center text-white">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-lg">Cargando tu universo interior...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black text-white">
      <ScrollArea className="h-screen">
        <div className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                 <Button asChild variant="ghost" className="-ml-4 hover:bg-white/10">
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
             <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-200 to-slate-400">
                {analysis.dreamTitle}
            </h1>
            <p className="mt-3 text-lg text-slate-400">
                Atmósfera del sueño: <span className="font-semibold text-slate-300">{analysis.dominantFeeling}</span>
            </p>
           </motion.header>

          <div className="space-y-8">
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="bg-slate-900/50 border border-slate-700/80 shadow-2xl shadow-primary/10">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl text-primary">
                            <Sparkles className="w-6 h-6" />
                            Interpretación Narrativa
                        </CardTitle>
                        <CardDescription className="text-slate-400 pt-2">
                            Así es como la trama de tu sueño refleja tu viaje psicológico actual.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="prose prose-base prose-invert max-w-none text-slate-300">
                       <p>{analysis.narrativeInterpretation}</p>
                    </CardContent>
                </Card>
            </motion.div>

            <div>
                <motion.h2 
                    className="text-2xl font-bold text-center mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                >
                    Símbolos Clave
                </motion.h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {analysis.symbolAnalysis.map((s, i) => (
                        <SymbolCard key={i} {...s} delay={i} />
                    ))}
                </div>
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
                <Card className="bg-slate-900/50 border border-slate-700/80">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl text-amber-300">
                            <BrainCircuit className="w-6 h-6" />
                            Arquetipo Dominante: {analysis.coreArchetype}
                        </CardTitle>
                        <CardDescription className="text-slate-400 pt-2">
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
                <h3 className="text-2xl font-semibold tracking-tight text-slate-300">Para tu Reflexión</h3>
                <p className="mt-4 text-xl text-primary/90 italic max-w-3xl mx-auto">
                    "{analysis.reflectiveQuestion}"
                </p>
                <div className="max-w-2xl mx-auto mt-6">
                    <Textarea 
                        placeholder="Usa este espacio para continuar la conversación con tu subconsciente..."
                        className="min-h-[120px] bg-slate-900/50 border-slate-700 rounded-xl p-4 text-base ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-0"
                    />
                </div>
            </motion.div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
