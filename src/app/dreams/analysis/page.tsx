
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { DreamInterpretationDoc } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Loader2, Wand2, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useAuth, useFirestore, useDocument } from '@/firebase';
import { doc } from 'firebase/firestore';


export default function DreamAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();

  const dreamId = useMemo(() => searchParams.get('id'), [searchParams]);

  const dreamRef = useMemo(
      () => (user && firestore && dreamId ? doc(firestore, `users/${user.uid}/dreams`, dreamId) : undefined),
      [user, firestore, dreamId]
  );
  
  const { data: dreamDoc, loading } = useDocument<DreamInterpretationDoc>(dreamRef);


  useEffect(() => {
    if (!loading && !dreamDoc && dreamId) {
      toast({ variant: "destructive", title: "Análisis no encontrado", description: "No pudimos encontrar este sueño en tu diario." });
      router.push('/dreams');
    }
  }, [loading, dreamDoc, dreamId, router, toast]);

  const interpretationText = dreamDoc?.interpretation?.interpretationText;

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
  
  if (!interpretationText) {
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
        <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                 <Button asChild variant="ghost" className="-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
                    <Link href="/dreams">
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Volver al Portal
                    </Link>
                </Button>
            </motion.div>

            <motion.div 
                className="my-8 prose prose-lg dark:prose-invert max-w-none"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
            >
               <ReactMarkdown
                 components={{
                    h1: ({node, ...props}) => <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2 !mb-4" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-8 mb-4 border-b border-border pb-2" {...props} />,
                    p: ({node, ...props}) => <p className="text-foreground/80 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-none p-0" {...props} />,
                    li: ({node, ...props}) => <li className="mb-4" {...props} />,
                 }}
               >{interpretationText}</ReactMarkdown>
            </motion.div>

            <motion.div
                className="text-center pt-8 mt-12 border-t border-dashed border-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
            >
                <h3 className="text-2xl font-semibold tracking-tight text-foreground/90">Continúa la Exploración</h3>
                <p className="mt-2 text-muted-foreground">Usa este espacio para escribir tus propias reflexiones sobre la interpretación.</p>
                <div className="max-w-2xl mx-auto mt-6">
                    <Textarea 
                        placeholder="Mis pensamientos sobre esto son..."
                        className="min-h-[120px] bg-card/80 border-border rounded-xl p-4 text-base ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-0"
                    />
                </div>
            </motion.div>
        </div>
      </ScrollArea>
    </div>
  );
}
