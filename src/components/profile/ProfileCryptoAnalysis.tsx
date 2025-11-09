
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, BookOpen, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runProfileAnalysis } from '@/app/actions';
import type { ProfileData, TorahCodeAnalysis } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import TorahCodeMatrix from '@/components/torah-code/TorahCodeMatrix';
import ReactMarkdown from 'react-markdown';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface ProfileCryptoAnalysisProps {
  profile: ProfileData;
}

const RevelationCard = ({ title, analysis, icon, color, main = false, delay = 0 }: { title: string, analysis: string, icon: React.ElementType, color: string, main?: boolean, delay?: number }) => {
    const Icon = icon;
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={main ? 'md:col-span-2' : ''}
        >
            <Card className={`h-full ${main ? 'bg-primary/5 border-primary/20' : 'bg-card/50'}`}>
                <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${color}`}>
                        <Icon className="w-5 h-5"/>
                        {title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                     <ReactMarkdown>{analysis}</ReactMarkdown>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function ProfileCryptoAnalysis({ profile }: ProfileCryptoAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ analysis: TorahCodeAnalysis, concepts: { conceptA: string, conceptB: string } } | null>(null);
  const { toast } = useToast();

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const analysisResult = await runProfileAnalysis(JSON.stringify(profile));
      setResult(analysisResult);
    } catch (e: any) {
      console.error("Error running profile analysis:", e);
      setError(e.message || 'Ocurrió un error desconocido durante el análisis.');
      toast({
        variant: 'destructive',
        title: 'Análisis Fallido',
        description: e.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const revelation = result?.analysis.revelation;
  const cards = revelation ? [
    { key: 'prophetic', icon: Sparkles, data: revelation.prophetic, color: "text-primary", main: true },
    { key: 'past', icon: BookOpen, data: revelation.past, color: "text-blue-400" },
    { key: 'present', icon: Sparkles, data: revelation.present, color: "text-amber-400" },
    { key: 'future', icon: Sparkles, data: revelation.future, color: "text-purple-400" },
    { key: 'archetype', icon: Sparkles, data: revelation.archetype, color: "text-green-400" },
    { key: 'esoteric', icon: Sparkles, data: revelation.esoteric, color: "text-teal-400" },
    { key: 'therapeutic', icon: Sparkles, data: revelation.therapeutic, color: "text-pink-400" },
  ].filter(card => card.data) : [];

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <BookOpen className="w-6 h-6 text-accent" />
          Oráculo del Alma
        </CardTitle>
        <CardDescription>
          Ejecuta un análisis criptográfico de tu perfil psicológico en la Torá para revelar una resonancia mística y personal.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        {!result && !isLoading && !error && (
            <Button onClick={handleRunAnalysis}>
              <Sparkles className="mr-2 h-4 w-4" />
              Revelar el Código de mi Alma
            </Button>
        )}

        <AnimatePresence mode="wait">
            {isLoading && (
                <motion.div key="loader" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Destilando tu esencia... Buscando resonancia...</p>
                </motion.div>
            )}
            {error && (
                <motion.div key="error" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                     <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4"/>
                        <AlertTitle>Error en el Oráculo</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                    <Button onClick={handleRunAnalysis} className="mt-4">
                        Intentar de nuevo
                    </Button>
                </motion.div>
            )}
            {result && (
                <motion.div key="result" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="space-y-8 text-left">
                     <header className="text-center">
                        <h2 className="text-2xl md:text-3xl font-bold text-primary">{revelation?.overallTitle}</h2>
                        <div className="text-muted-foreground mt-1 max-w-3xl mx-auto text-sm">
                             <p>Análisis de los conceptos nucleares <strong className="text-primary/90">{result.concepts.conceptA}</strong> y <strong className="text-primary/90">{result.concepts.conceptB}</strong>, extraídos de tu perfil.</p>
                            <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">{revelation?.context || ''}</ReactMarkdown>
                        </div>
                    </header>
                    <div className="grid lg:grid-cols-5 gap-8 items-start">
                        <div className="lg:col-span-2">
                            <h3 className="font-semibold text-lg mb-2 text-center text-primary">Matriz de Resonancia</h3>
                            <TorahCodeMatrix result={result.analysis} />
                             <div className="prose prose-sm dark:prose-invert max-w-none text-center mt-6">
                                <h4 className="font-semibold text-primary">Conexión con Gematria</h4>
                                <ReactMarkdown>{revelation?.gematriaConnection || ''}</ReactMarkdown>
                            </div>
                        </div>
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                           {cards.map((card, index) => card.data && (
                                <RevelationCard 
                                    key={card.key}
                                    title={card.data.title}
                                    analysis={card.data.analysis}
                                    icon={card.icon}
                                    color={card.color}
                                    main={card.main}
                                    delay={index * 0.1}
                                />
                            ))}
                        </div>
                    </div>
                     <div className="text-center p-6 bg-background/50 rounded-lg mt-8 border-t border-dashed border-border/50">
                        <h4 className="font-semibold text-primary mb-2">Pregunta para tu Reflexión</h4>
                        <p className="text-lg italic text-foreground/80">"{revelation?.reflection}"</p>
                    </div>
                     <div className="text-center mt-6">
                        <Button onClick={handleRunAnalysis} variant="outline">
                            <Sparkles className="mr-2 h-4 w-4" />
                            Ejecutar un nuevo análisis de mi alma
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
