
'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wand2, BookOpen, ChevronLeft, Search, History, Clock, FileText, BarChart, User, Bot, Brain, Star } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { runTorahCodeAnalysis } from '@/ai/flows/torah-code-flow';
import type { TorahCodeAnalysis, TorahCodeRecord } from '@/lib/types';
import TorahCodeMatrix from '@/components/torah-code/TorahCodeMatrix';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';


export default function TorahCodePage() {
    const { user, loading: authLoading } = useAuth();
    const firestore = useFirestore();

    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<TorahCodeAnalysis | null>(null);
    const [isViewingHistory, setIsViewingHistory] = useState(false);
    
    const { toast } = useToast();

    // Fetch history from Firestore
    const historyQuery = useMemo(
        () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/torahCodeHistory`), orderBy('timestamp', 'desc')) : undefined),
        [user?.uid, firestore]
    );
    const { data: analysisHistory, loading: isHistoryLoading } = useCollection<TorahCodeRecord>(historyQuery);

    const handleAnalysis = async () => {
        if (!searchTerm.trim()) {
            toast({ variant: 'destructive', title: 'Término vacío', description: 'Por favor, introduce una palabra o concepto para analizar.' });
            return;
        }
         if (!user) {
            toast({ variant: 'destructive', title: 'Acceso denegado', description: 'Debes iniciar sesión para realizar un análisis.' });
            return;
        }
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setIsViewingHistory(false);

        try {
            const result = await runTorahCodeAnalysis({ searchTerm });
            setAnalysisResult(result);
            
            const dataToSave = {
              ...result,
              matrix: { rows: result.matrix.map(row => row.join('')) }, // Flatten array
              timestamp: serverTimestamp(),
              userId: user.uid,
            };

            const historyCollection = collection(firestore, `users/${user.uid}/torahCodeHistory`);
            await addDoc(historyCollection, dataToSave);

        } catch (e: any) {
            console.error("Error en el análisis del código de la Torá:", e);
            setError(e.message || "Ocurrió un error desconocido durante el análisis.");
            toast({ variant: 'destructive', title: 'Análisis Fallido', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const loadHistoryRecord = (record: TorahCodeRecord) => {
        setIsViewingHistory(true);
        
        let matrix: string[][];
        if (Array.isArray(record.matrix)) {
            matrix = record.matrix;
        } else if (record.matrix && Array.isArray((record.matrix as any).rows)) {
            matrix = (record.matrix as any).rows.map((row: string) => row.split(''));
        } else {
            console.error("Malformed matrix data in history record:", record);
            matrix = Array(21).fill(Array(21).fill('?'));
        }

        setAnalysisResult({ ...record, matrix });
        setSearchTerm(record.searchTerm);
    };
    
    const getFormattedDate = (timestamp: any) => {
        if (!timestamp) return 'Fecha desconocida';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true, locale: es });
        } catch {
            return 'Fecha inválida';
        }
    };

    const revelationCards = analysisResult ? [
      { key: 'past', icon: Clock, data: analysisResult.revelation.past, color: "text-blue-400" },
      { key: 'present', icon: Brain, data: analysisResult.revelation.present, color: "text-amber-400" },
      { key: 'future', icon: Wand2, data: analysisResult.revelation.future, color: "text-purple-400" },
      { key: 'archetype', icon: User, data: analysisResult.revelation.archetype, color: "text-green-400" },
      { key: 'esoteric', icon: Star, data: analysisResult.revelation.esoteric, color: "text-teal-400" },
      { key: 'therapeutic', icon: Bot, data: analysisResult.revelation.therapeutic, color: "text-pink-400" },
    ] : [];


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
                        <Sheet>
                            <SheetTrigger asChild>
                                 <Button variant="outline" disabled={isHistoryLoading || authLoading}>
                                    <History className="mr-2 h-4 w-4" />
                                    Historial
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-md p-0">
                                <SheetHeader className="p-4 border-b">
                                    <SheetTitle>Historial de Búsquedas</SheetTitle>
                                </SheetHeader>
                                <ScrollArea className="h-[calc(100%-4rem)]">
                                    {!user ? (
                                        <p className="text-center text-sm text-muted-foreground p-8">Inicia sesión para ver tu historial.</p>
                                    ) : isHistoryLoading ? (
                                        <div className="p-4 space-y-3">
                                            {[...Array(3)].map((_, i) => <Card key={i} className="h-20 bg-muted/50 animate-pulse"/>)}
                                        </div>
                                    ) : analysisHistory && analysisHistory.length > 0 ? (
                                        <div className="p-4 space-y-3">
                                            {analysisHistory.map(record => (
                                                <SheetTrigger asChild key={record.id}>
                                                <Card className="cursor-pointer hover:border-primary" onClick={() => loadHistoryRecord(record)}>
                                                    <CardHeader>
                                                        <CardTitle className="text-sm">Búsqueda: "{record.searchTerm}"</CardTitle>
                                                        <CardDescription>
                                                            {getFormattedDate(record.timestamp)}
                                                        </CardDescription>
                                                    </CardHeader>
                                                </Card>
                                                </SheetTrigger>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-center text-sm text-muted-foreground p-8">No hay búsquedas en el historial.</p>
                                    )}
                                </ScrollArea>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <div className="max-w-7xl mx-auto">
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
                            <Button type="button" onClick={handleAnalysis} disabled={isLoading || authLoading} className="h-12 px-6">
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
                                <motion.div key="result" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}} className="space-y-8">
                                     <header className="text-center">
                                         <h2 className="text-2xl md:text-3xl font-bold text-primary">{analysisResult.revelation.overallTitle}</h2>
                                         <div className="text-muted-foreground mt-1 max-w-2xl mx-auto text-sm">
                                            <ReactMarkdown>{analysisResult.revelation.context}</ReactMarkdown>
                                         </div>
                                     </header>
                                    
                                     <div className="grid lg:grid-cols-5 gap-8 items-start">
                                        <div className="lg:col-span-2">
                                            <h3 className="font-semibold text-lg mb-2 text-center text-primary">Matriz de Revelación</h3>
                                            <TorahCodeMatrix result={analysisResult} />
                                             <div className="prose dark:prose-invert max-w-none text-center mt-6">
                                                <h4 className="font-semibold text-primary">Conexión con Gematria</h4>
                                                <ReactMarkdown>{analysisResult.revelation.gematriaConnection}</ReactMarkdown>
                                             </div>
                                        </div>
                                         <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {revelationCards.map((card, index) => (
                                                <motion.div
                                                    key={card.key}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.1 * index }}
                                                >
                                                    <Card className='bg-card/50 h-full'>
                                                        <CardHeader>
                                                            <CardTitle className={`flex items-center gap-2 ${card.color}`}>
                                                                <card.icon className="w-5 h-5"/>
                                                                {card.data.title}
                                                            </CardTitle>
                                                        </CardHeader>
                                                        <CardContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                                                             <ReactMarkdown>{card.data.analysis}</ReactMarkdown>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            ))}
                                        </div>
                                     </div>
                                     <div className="text-center p-6 bg-card/30 rounded-lg mt-8 border-t border-dashed border-border/50">
                                         <h4 className="font-semibold text-primary mb-2">Pregunta para tu Reflexión</h4>
                                         <p className="text-lg italic text-foreground/80">"{analysisResult.revelation.reflection}"</p>
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

