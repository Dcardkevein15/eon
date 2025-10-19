
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Play, BrainCircuit, Bot, Sparkles, ChevronLeft } from 'lucide-react';
import type { TradingSignal, CryptoDebateTurn } from '@/lib/types';
import { runCryptoAnalysis } from '@/ai/flows/crypto-analysis-flow';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const AnalystAvatar = ({ name }: { name: string }) => {
    const isApex = name === 'Apex';
    return (
        <div className={`flex items-center gap-2 ${isApex ? 'justify-start' : 'justify-end'}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isApex ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
                <Bot className="h-5 w-5" />
            </div>
            <span className="font-bold">{name}</span>
        </div>
    )
}

export default function TradingAnalysisPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debate, setDebate] = useState<CryptoDebateTurn[]>([]);
    const [synthesis, setSynthesis] = useState<string>('');
    const [signals, setSignals] = useState<TradingSignal[]>([]);
    const [alphaState, setAlphaState] = useState<string>('Sin análisis previo. Empezando desde cero.');
    const debateEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        debateEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [debate]);

    const handleStartAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setDebate([]);
        setSynthesis('');
        setSignals([]);

        try {
            const stream = await runCryptoAnalysis({ previousAlphaState: alphaState });
            
            for await (const chunk of stream) {
                if (chunk.type === 'debateTurn') {
                    setDebate(prev => [...prev, chunk.turn]);
                } else if (chunk.type === 'synthesisChunk') {
                    setSynthesis(prev => prev + chunk.chunk);
                } else if (chunk.type === 'finalSignals') {
                    setSignals(chunk.signals);
                    const newAlphaState = `El último análisis generó ${chunk.signals.length} señales. La principal fue ${chunk.signals[0]?.action} ${chunk.signals[0]?.crypto} a ${chunk.signals[0]?.price}. Conclusión general: ${synthesis}`;
                    setAlphaState(newAlphaState);
                }
            }

        } catch (e: any) {
            console.error(e);
            setError("Error al ejecutar el análisis. Por favor, inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    }, [alphaState, synthesis]);

    return (
        <div className="flex h-screen bg-background text-foreground">
             <main className="flex-1 flex flex-col overflow-hidden">
                <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b p-4 z-10">
                    <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto">
                        <div className='flex items-center gap-2'>
                             <Button asChild variant="ghost" size="icon" className="-ml-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
                                <Link href="/">
                                    <ChevronLeft className="h-5 w-5" />
                                </Link>
                            </Button>
                            <h1 className="text-xl font-bold tracking-tight">Análisis Pro de Trading</h1>
                        </div>
                        <Button onClick={handleStartAnalysis} disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                            {isLoading ? 'Analizando Mercado...' : 'Iniciar Análisis'}
                        </Button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                    <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6 h-full">
                        {/* Main Debate Area */}
                        <div className="lg:col-span-2 h-full flex flex-col">
                            <Card className="flex-1 flex flex-col bg-card/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-primary"/> Debate de Analistas IA</CardTitle>
                                    <CardDescription>Apex (Técnico) y Helios (Fundamental) discuten en tiempo real.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-hidden relative">
                                    <ScrollArea className="h-full">
                                        <div className="space-y-6 pr-4">
                                            {debate.length === 0 && !isLoading && (
                                                <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                                                    <p>El debate aparecerá aquí cuando inicie el análisis.</p>
                                                </div>
                                            )}
                                            {debate.map((turn, index) => (
                                                <div key={index} className={`flex flex-col gap-2 ${turn.analyst === 'Apex' ? 'items-start' : 'items-end'}`}>
                                                    <AnalystAvatar name={turn.analyst}/>
                                                    <div className={`p-3 rounded-lg max-w-xl ${turn.analyst === 'Apex' ? 'bg-blue-900/40 rounded-bl-none' : 'bg-amber-900/40 rounded-br-none'}`}>
                                                        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">{turn.argument}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            ))}
                                            {isLoading && debate.length > 0 && <Loader2 className="w-6 h-6 animate-spin mx-auto mt-4" />}
                                            <div ref={debateEndRef} />
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                        
                        {/* Synthesis and Signals */}
                        <div className="h-full flex flex-col gap-6">
                           <Card className="flex-1 flex flex-col bg-card/50">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent"/> Síntesis Estratégica</CardTitle>
                                    <CardDescription>The Synthesizer extrae las conclusiones clave del debate.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-hidden relative">
                                    <ScrollArea className="h-full">
                                        <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                                            <ReactMarkdown>{synthesis}</ReactMarkdown>
                                            {isLoading && debate.length > 0 && !signals.length && <span className="animate-pulse">...</span>}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                             <Card className="bg-card/80 border-primary/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-primary">Señales del Día</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoading && signals.length === 0 ? (
                                        <div className="text-center text-muted-foreground text-sm">Generando señales...</div>
                                    ) : signals.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Cripto</TableHead>
                                                    <TableHead>Acción</TableHead>
                                                    <TableHead className="text-right">Precio</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {signals.map(signal => (
                                                    <TableRow key={signal.crypto}>
                                                        <TableCell className="font-medium">{signal.crypto}</TableCell>
                                                        <TableCell className={signal.action === 'COMPRAR' ? 'text-green-400' : 'text-red-400'}>{signal.action}</TableCell>
                                                        <TableCell className="text-right font-mono">${signal.price.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                         <div className="text-center text-muted-foreground text-sm">Las señales aparecerán aquí al finalizar el análisis.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
             </main>
        </div>
    );
}
