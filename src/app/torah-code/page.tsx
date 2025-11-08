'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wand2, BookOpen, ChevronLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { runTorahCodeAnalysis } from '@/ai/flows/torah-code-flow';
import type { TorahCodeAnalysis } from '@/lib/types';
import TorahCodeMatrix from '@/components/torah-code/TorahCodeMatrix';
import { motion, AnimatePresence } from 'framer-motion';

export default function TorahCodePage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<TorahCodeAnalysis | null>(null);
    const { toast } = useToast();

    const handleAnalysis = async () => {
        if (!searchTerm.trim()) {
            toast({ variant: 'destructive', title: 'Término vacío', description: 'Por favor, introduce una palabra o concepto para analizar.' });
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const result = await runTorahCodeAnalysis({ searchTerm });
            if (!result || !result.foundTerm) {
                throw new Error("No se encontró el término en el texto de la Torá con la ecuación de salto actual.");
            }
            setAnalysisResult(result);
        } catch (e: any) {
            console.error("Error en el análisis del código de la Torá:", e);
            setError(e.message || "Ocurrió un error desconocido durante el análisis.");
            toast({ variant: 'destructive', title: 'Análisis Fallido', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex h-screen bg-background text-foreground">
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b p-4 z-10">
                    <div className="flex flex-wrap items-center justify-between gap-4 max-w-7xl mx-auto">
                        <div className='flex items-center gap-2'>
                             <Button asChild variant="ghost" size="icon" className="-ml-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
                                <Link href="/">
                                    <ChevronLeft className="h-5 w-5" />
                                </Link>
                            </Button>
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-6 h-6 text-primary" />
                                <h1 className="text-xl font-bold tracking-tight">Oráculo de la Torá</h1>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <div className="max-w-4xl mx-auto">
                        <header className="text-center mb-8">
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
                                Descifra los Mensajes Ocultos
                            </h2>
                            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
                                Introduce un concepto clave. La IA diseñará una ecuación, buscará secuencias equidistantes en el texto sagrado y revelará las conexiones ocultas.
                            </p>
                        </header>

                        <div className="flex w-full max-w-lg mx-auto items-center space-x-2 mb-12">
                            <Input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Ej: amor, futuro, éxito..."
                                disabled={isLoading}
                                onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleAnalysis()}
                                className="h-12 text-base"
                            />
                            <Button type="button" onClick={handleAnalysis} disabled={isLoading} className="h-12 px-6">
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                <span className="sr-only">Analizar</span>
                            </Button>
                        </div>
                        
                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div key="loader" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                    <p className="mt-2 text-muted-foreground">Analizando las escrituras...</p>
                                </motion.div>
                            ) : error ? (
                                <motion.div key="error" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                                     <Alert variant="destructive">
                                        <AlertTitle>Error en el Análisis</AlertTitle>
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                </motion.div>
                            ) : analysisResult ? (
                                <motion.div key="result" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}} className="grid md:grid-cols-2 gap-8">
                                    <div className="md:col-span-1">
                                        <h3 className="font-semibold text-lg mb-2 text-primary">Matriz de Revelación</h3>
                                        <TorahCodeMatrix result={analysisResult} />
                                    </div>
                                    <div className="md:col-span-1">
                                         <h3 className="font-semibold text-lg mb-2 text-primary">Interpretación del Oráculo</h3>
                                        <div className="prose dark:prose-invert max-w-none text-sm">
                                            <p>La búsqueda de <strong>"{analysisResult.searchTerm}"</strong> (en hebreo: {analysisResult.hebrewTerm}) con un salto de <strong>{analysisResult.skip}</strong> letras reveló lo siguiente:</p>
                                            <p>{analysisResult.revelation}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                 <motion.div key="initial" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="text-center py-10 border-2 border-dashed border-border/50 rounded-lg">
                                    <p className="text-muted-foreground">Los resultados de tu búsqueda aparecerán aquí.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
        </div>
    );
}
