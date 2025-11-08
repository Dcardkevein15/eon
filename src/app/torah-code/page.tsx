

'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wand2, BookOpen, ChevronLeft, Search, History, Brain, Star, Clock, FileText, User, Bot, Atom, Link as LinkIcon, Plus, Calendar, AreaChart, GitMerge } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { runResonanceAnalysis, runClassicAnalysis, runTemporalStrandAnalysis, runHarmonicAnalysis, runCrossMatrixAnalysis } from '@/ai/flows/torah-code-flow';
import type { TorahCodeAnalysis, TorahCodeRecord, TemporalStrandAnalysis, HarmonicAnalysis, CrossMatrixAnalysis } from '@/lib/types';
import TorahCodeMatrix from '@/components/torah-code/TorahCodeMatrix';
import HarmonicChart from '@/components/torah-code/HarmonicChart';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';


type OracleMode = 'resonance' | 'classic' | 'temporal' | 'harmonic' | 'destiny';
type AnalysisResult = TorahCodeAnalysis | TemporalStrandAnalysis | HarmonicAnalysis | CrossMatrixAnalysis | null;

export default function TorahCodePage() {
    const { user, loading: authLoading } = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();

    // State for inputs
    const [conceptA, setConceptA] = useState('');
    const [conceptB, setConceptB] = useState('');
    const [classicConcept, setClassicConcept] = useState('');
    const [harmonicConcept, setHarmonicConcept] = useState('');
    const [destinyConceptA, setDestinyConceptA] = useState('');
    const [destinyConceptB, setDestinyConceptB] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());

    // Generic state for results and loading
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult>(null);
    const [activeTab, setActiveTab] = useState<OracleMode>('resonance');

    const historyQuery = useMemo(
        () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/torahCodeHistory`), orderBy('timestamp', 'desc')) : undefined),
        [user?.uid, firestore]
    );
    const { data: analysisHistory, loading: isHistoryLoading } = useCollection<TorahCodeRecord>(historyQuery);

    const handleAnalysis = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Acceso denegado', description: 'Debes iniciar sesión para realizar un análisis.' });
            return;
        }

        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            let result: AnalysisResult;
            let dataToSave: any;

            switch (activeTab) {
                case 'resonance':
                    if (!conceptA.trim() || !conceptB.trim()) throw new Error('Ambos conceptos son requeridos.');
                    result = await runResonanceAnalysis({ conceptA, conceptB });
                    dataToSave = { ...result, conceptA, conceptB };
                    break;
                case 'classic':
                    if (!classicConcept.trim()) throw new Error('El concepto es requerido.');
                    result = await runClassicAnalysis({ concept: classicConcept });
                    dataToSave = { ...result, concept: classicConcept };
                    break;
                case 'temporal':
                    if (!date) throw new Error('La fecha es requerida.');
                    result = await runTemporalStrandAnalysis({ date: date.toISOString() });
                    dataToSave = { ...result, date: date.toISOString() };
                    break;
                case 'harmonic':
                    if (!harmonicConcept.trim()) throw new Error('El concepto es requerido.');
                    result = await runHarmonicAnalysis({ concept: harmonicConcept });
                    dataToSave = { ...result, concept: harmonicConcept };
                    break;
                case 'destiny':
                    if (!destinyConceptA.trim() || !destinyConceptB.trim()) throw new Error('Ambos conceptos son requeridos.');
                    result = await runCrossMatrixAnalysis({ conceptA: destinyConceptA, conceptB: destinyConceptB });
                    dataToSave = { ...result, conceptA: destinyConceptA, conceptB: destinyConceptB };
                    break;
                default:
                    throw new Error('Modo de oráculo no válido.');
            }
            
            setAnalysisResult(result);
            
            // Normalize matrix for saving if it exists
            if ('matrix' in dataToSave && Array.isArray(dataToSave.matrix)) {
                dataToSave.matrix = { rows: dataToSave.matrix.map((row: string[]) => row.join('')) };
            }

            await addDoc(collection(firestore, `users/${user.uid}/torahCodeHistory`), {
                ...dataToSave,
                type: activeTab,
                timestamp: serverTimestamp(),
                userId: user.uid,
            });

        } catch (e: any) {
            console.error(`Error en el análisis (${activeTab}):`, e);
            setError(e.message || "Ocurrió un error desconocido durante el análisis.");
            toast({ variant: 'destructive', title: 'Análisis Fallido', description: e.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const loadHistoryRecord = (record: TorahCodeRecord) => {
        const recordType = (record as any).type as OracleMode;
        setActiveTab(recordType);
        
        let result: AnalysisResult = null;

        if (recordType === 'temporal') {
            result = record as unknown as TemporalStrandAnalysis;
            setDate(new Date((record as any).date));
        } else if(recordType === 'harmonic') {
            result = record as unknown as HarmonicAnalysis;
            setHarmonicConcept((record as any).concept || '');
        } else if (recordType === 'destiny') {
            result = record as unknown as CrossMatrixAnalysis;
            setDestinyConceptA((record as any).conceptA || '');
            setDestinyConceptB((record as any).conceptB || '');
        } else if (record.matrix) { // Classic or Resonance
             let matrix: string[][];
            if (Array.isArray(record.matrix)) {
                matrix = record.matrix;
            } else if (record.matrix && Array.isArray((record.matrix as any).rows)) {
                matrix = (record.matrix as any).rows.map((row: string) => row.split(''));
            } else {
                matrix = Array(21).fill(Array(21).fill('?'));
            }
            result = { ...record, matrix } as TorahCodeAnalysis;

            if (recordType === 'resonance') {
                setConceptA((record as any).conceptA || '');
                setConceptB((record as any).conceptB || '');
            } else { // Classic
                setClassicConcept((record as any).concept || '');
            }
        }
        setAnalysisResult(result);
    };

    const getFormattedDate = (timestamp: any) => {
        if (!timestamp) return 'Fecha desconocida';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return formatDistanceToNow(date, { addSuffix: true, locale: es });
        } catch { return 'Fecha inválida'; }
    };
    
    const isTorahCodeAnalysis = (res: AnalysisResult): res is TorahCodeAnalysis => res !== null && 'matrix' in res && 'revelation' in res;
    const isTemporalAnalysis = (res: AnalysisResult): res is TemporalStrandAnalysis => res !== null && 'temporalStrand' in res;
    const isHarmonicAnalysis = (res: AnalysisResult): res is HarmonicAnalysis => res !== null && 'resonanceData' in res;
    const isDestinyAnalysis = (res: AnalysisResult): res is CrossMatrixAnalysis => res !== null && 'catalystEvent' in res;

    const renderRevelationCards = (revelation: any) => {
        const cards = [
            { key: 'prophetic', icon: Atom, data: revelation.prophetic, color: "text-primary", main: true },
            { key: 'past', icon: Clock, data: revelation.past, color: "text-blue-400" },
            { key: 'present', icon: Brain, data: revelation.present, color: "text-amber-400" },
            { key: 'future', icon: Wand2, data: revelation.future, color: "text-purple-400" },
            { key: 'archetype', icon: User, data: revelation.archetype, color: "text-green-400" },
            { key: 'esoteric', icon: Star, data: revelation.esoteric, color: "text-teal-400" },
            { key: 'therapeutic', icon: Bot, data: revelation.therapeutic, color: "text-pink-400" },
        ].filter(card => card.data); // Filter out cards with no data

        return (
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {cards.map((card, index) => (
                    <motion.div
                        key={card.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className={card.main ? 'md:col-span-2' : ''}
                    >
                        <Card className={`h-full ${card.main ? 'bg-primary/5 border-primary/20' : 'bg-card/50'}`}>
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
        );
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
                                <h1 className="text-xl font-bold tracking-tight">Biblioteca de Oráculos</h1>
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
                                                        <CardTitle className="text-sm">
                                                             {record.type === 'resonance' ? `${record.conceptA} ∩ ${record.conceptB}` :
                                                              record.type === 'temporal' ? `Fecha: ${format(new Date(record.date as string), 'dd/MM/yyyy')}` :
                                                              record.type === 'destiny' ? `${record.conceptA} ⤧ ${record.conceptB}` :
                                                              record.concept}
                                                        </CardTitle>
                                                        <CardDescription>
                                                            {getFormattedDate(record.timestamp)} - {record.type}
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

                <ScrollArea className="flex-1">
                    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
                        <Tabs value={activeTab} onValueChange={(v) => { setAnalysisResult(null); setError(null); setActiveTab(v as OracleMode) }} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 max-w-4xl mx-auto">
                                <TabsTrigger value="resonance">Resonancia</TabsTrigger>
                                <TabsTrigger value="classic">Clásico</TabsTrigger>
                                <TabsTrigger value="temporal">Temporal</TabsTrigger>
                                <TabsTrigger value="harmonic">Armonía</TabsTrigger>
                                <TabsTrigger value="destiny">Destino</TabsTrigger>
                            </TabsList>
                            <TabsContent value="resonance" className="text-center">
                                <header className="text-center my-8">
                                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
                                        Oráculo de Resonancia Conceptual
                                    </h2>
                                    <p className="text-muted-foreground mt-2 max-w-3xl mx-auto">
                                        Introduce dos conceptos para encontrar su punto de colisión en la Torá y revelar la ley universal que los conecta.
                                    </p>
                                </header>
                                <div className="flex w-full max-w-2xl mx-auto items-center space-x-2 mb-12">
                                    <Input value={conceptA} onChange={(e) => setConceptA(e.target.value)} placeholder="Concepto A (Ej: Amor)" disabled={isLoading} className="h-12 text-base" />
                                    <Plus className="text-muted-foreground" />
                                    <Input value={conceptB} onChange={(e) => setConceptB(e.target.value)} placeholder="Concepto B (Ej: Guerra)" disabled={isLoading} className="h-12 text-base" />
                                    <Button type="button" onClick={handleAnalysis} disabled={isLoading || authLoading} className="h-12 px-6">
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </TabsContent>
                             <TabsContent value="classic" className="text-center">
                                <header className="text-center my-8">
                                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
                                        Oráculo Clásico
                                    </h2>
                                    <p className="text-muted-foreground mt-2 max-w-3xl mx-auto">
                                        Introduce un solo concepto para realizar un análisis multidimensional de su presencia y significado en la Torá.
                                    </p>
                                </header>
                                <div className="flex w-full max-w-lg mx-auto items-center space-x-2 mb-12">
                                    <Input value={classicConcept} onChange={(e) => setClassicConcept(e.target.value)} placeholder="Concepto (Ej: Sabiduría)" disabled={isLoading} className="h-12 text-base" />
                                    <Button type="button" onClick={handleAnalysis} disabled={isLoading || authLoading} className="h-12 px-6">
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </TabsContent>
                             <TabsContent value="temporal" className="text-center">
                                <header className="text-center my-8">
                                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
                                        Oráculo de la Hebra Temporal
                                    </h2>
                                    <p className="text-muted-foreground mt-2 max-w-3xl mx-auto">
                                        Elige una fecha para decodificar la energía arquetípica de ese día según su posición codificada en la Torá.
                                    </p>
                                </header>
                                <div className="flex w-full max-w-lg mx-auto items-center space-x-2 mb-12">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn("w-full justify-start text-left font-normal h-12 text-base", !date && "text-muted-foreground")}
                                            disabled={isLoading}
                                        >
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                        </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                        <CalendarIcon
                                            mode="single"
                                            selected={date}
                                            onSelect={setDate}
                                            initialFocus
                                        />
                                        </PopoverContent>
                                    </Popover>
                                    <Button type="button" onClick={handleAnalysis} disabled={isLoading || authLoading} className="h-12 px-6">
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </TabsContent>
                             <TabsContent value="harmonic" className="text-center">
                                <header className="text-center my-8">
                                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
                                        Análisis de Resonancia Armónica
                                    </h2>
                                    <p className="text-muted-foreground mt-2 max-w-3xl mx-auto">
                                        Visualiza la "vibración" o frecuencia de un concepto a lo largo de los cinco libros de la Torá.
                                    </p>
                                </header>
                                <div className="flex w-full max-w-lg mx-auto items-center space-x-2 mb-12">
                                    <Input value={harmonicConcept} onChange={(e) => setHarmonicConcept(e.target.value)} placeholder="Concepto (Ej: Justicia)" disabled={isLoading} className="h-12 text-base" />
                                    <Button type="button" onClick={handleAnalysis} disabled={isLoading || authLoading} className="h-12 px-6">
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <AreaChart className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </TabsContent>
                            <TabsContent value="destiny" className="text-center">
                                <header className="text-center my-8">
                                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
                                        Oráculo del Destino
                                    </h2>
                                    <p className="text-muted-foreground mt-2 max-w-3xl mx-auto">
                                       Explora la causa y efecto cósmico analizando la trayectoria que sigue a la intersección de dos conceptos.
                                    </p>
                                </header>
                                <div className="flex w-full max-w-2xl mx-auto items-center space-x-2 mb-12">
                                    <Input value={destinyConceptA} onChange={(e) => setDestinyConceptA(e.target.value)} placeholder="Concepto Causa (Ej: Poder)" disabled={isLoading} className="h-12 text-base" />
                                    <GitMerge className="text-muted-foreground" />
                                    <Input value={destinyConceptB} onChange={(e) => setDestinyConceptB(e.target.value)} placeholder="Concepto Efecto (Ej: Corrupción)" disabled={isLoading} className="h-12 text-base" />
                                    <Button type="button" onClick={handleAnalysis} disabled={isLoading || authLoading} className="h-12 px-6">
                                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <AnimatePresence mode="wait">
                            {isLoading ? (
                                <motion.div key="loader" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="text-center">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                    <p className="mt-2 text-muted-foreground">Descifrando el código cósmico...</p>
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
                                     {isTorahCodeAnalysis(analysisResult) && (
                                        <>
                                            <header className="text-center">
                                                <h2 className="text-2xl md:text-3xl font-bold text-primary">{analysisResult.revelation.overallTitle}</h2>
                                                <div className="text-muted-foreground mt-1 max-w-3xl mx-auto text-sm">
                                                    <ReactMarkdown>{analysisResult.revelation.context}</ReactMarkdown>
                                                </div>
                                            </header>
                                            <div className="grid lg:grid-cols-5 gap-8 items-start">
                                                <div className="lg:col-span-2">
                                                    <h3 className="font-semibold text-lg mb-2 text-center text-primary">Matriz de Resonancia</h3>
                                                    <TorahCodeMatrix result={analysisResult} />
                                                    <div className="prose dark:prose-invert max-w-none text-center mt-6">
                                                        <h4 className="font-semibold text-primary">Conexión con Gematria</h4>
                                                        <ReactMarkdown>{analysisResult.revelation.gematriaConnection}</ReactMarkdown>
                                                    </div>
                                                </div>
                                                {renderRevelationCards(analysisResult.revelation)}
                                            </div>
                                            <div className="text-center p-6 bg-card/30 rounded-lg mt-8 border-t border-dashed border-border/50">
                                                <h4 className="font-semibold text-primary mb-2">Pregunta para tu Reflexión</h4>
                                                <p className="text-lg italic text-foreground/80">"{analysisResult.revelation.reflection}"</p>
                                            </div>
                                        </>
                                     )}
                                     {isTemporalAnalysis(analysisResult) && (
                                        <Card className="max-w-3xl mx-auto bg-card/50">
                                            <CardHeader className="text-center">
                                                <CardTitle className="text-2xl md:text-3xl font-bold text-primary">{analysisResult.title}</CardTitle>
                                                <CardDescription>Revelación para el {format(new Date(analysisResult.date), "PPP", { locale: es })}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="prose prose-lg dark:prose-invert max-w-none text-center">
                                                <p className="font-hebrew text-4xl text-foreground mb-6">
                                                    {analysisResult.temporalStrand.join(' ')}
                                                </p>
                                                 <ReactMarkdown>{analysisResult.interpretation}</ReactMarkdown>
                                            </CardContent>
                                        </Card>
                                     )}
                                     {isHarmonicAnalysis(analysisResult) && (
                                        <Card className="max-w-5xl mx-auto bg-card/50">
                                             <CardHeader>
                                                <CardTitle className="text-2xl md:text-3xl font-bold text-primary">{analysisResult.title}</CardTitle>
                                                <CardDescription>{analysisResult.description}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <HarmonicChart data={analysisResult.resonanceData} />
                                                <div className="mt-6 prose dark:prose-invert max-w-none">
                                                   <ReactMarkdown>{analysisResult.peakAnalysis}</ReactMarkdown>
                                                </div>
                                            </CardContent>
                                        </Card>
                                     )}
                                     {isDestinyAnalysis(analysisResult) && (
                                         <Card className="max-w-4xl mx-auto bg-card/50">
                                            <CardHeader className="text-center">
                                                <CardTitle className="text-2xl md:text-3xl font-bold text-primary">{analysisResult.title}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div className="text-center p-4 rounded-lg bg-background">
                                                    <p className="text-sm text-muted-foreground">Evento Catalizador en la Intersección</p>
                                                    <p className="text-xl font-bold font-hebrew">{analysisResult.catalystEvent}</p>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-6">
                                                    <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg border border-border/50">
                                                        <h4 className="text-primary">Trayectoria A: {analysisResult.trajectoryA.concept}</h4>
                                                         <ReactMarkdown>{analysisResult.trajectoryA.analysis}</ReactMarkdown>
                                                    </div>
                                                     <div className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-lg border border-border/50">
                                                        <h4 className="text-primary">Trayectoria B: {analysisResult.trajectoryB.concept}</h4>
                                                         <ReactMarkdown>{analysisResult.trajectoryB.analysis}</ReactMarkdown>
                                                    </div>
                                                </div>
                                                 <div className="prose dark:prose-invert max-w-none p-6 rounded-lg bg-primary/5 border border-primary/20 text-center">
                                                    <h3 className="text-primary">Punto de Destino</h3>
                                                     <ReactMarkdown>{analysisResult.destinyPoint}</ReactMarkdown>
                                                </div>
                                            </CardContent>
                                         </Card>
                                     )}
                                </motion.div>
                            ) : (
                                 <motion.div key="initial" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="text-center py-10 border-2 border-dashed border-border/50 rounded-lg">
                                    <p className="text-muted-foreground">La revelación del Oráculo aparecerá aquí.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </ScrollArea>
            </main>
        </div>
    );
}
