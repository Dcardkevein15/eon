'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Play, BrainCircuit, Bot, Sparkles, ChevronLeft, History } from 'lucide-react';
import type { TradingSignal, CryptoDebateTurn, TradingAnalysisRecord, FullCryptoAnalysis, MarketChartData } from '@/lib/types';
import { runCryptoAnalysis } from '@/ai/flows/crypto-analysis-flow';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { useTypingEffect } from '@/hooks/use-typing-effect';
import { ResponsiveContainer, LineChart, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Line, Bar, ComposedChart, Legend } from 'recharts';

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

// Custom hook for managing state in localStorage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.log(error);
    } finally {
        setLoading(false);
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue, loading] as const;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-background/80 border rounded-lg shadow-xl text-xs">
          <p className="font-bold">{format(new Date(label), "d MMM, HH:mm", { locale: es })}</p>
          {payload.map((pld: any, index: number) => (
            <p key={index} style={{ color: pld.color }}>
              {`${pld.name}: ${pld.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
};

const calculateSMA = (data: any[], period: number) => {
    const sma = [];
    for (let i = period - 1; i < data.length; i++) {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.price, 0);
        sma.push({ time: data[i].time, SMA: sum / period });
    }
    return sma;
};

const MarketChart = ({ data }: { data: MarketChartData }) => {
    if (!data || data.prices.length === 0) {
        return <div className="h-full flex items-center justify-center text-muted-foreground">Esperando datos del mercado...</div>;
    }

    const chartData = data.prices.map((pricePoint, index) => ({
        time: pricePoint[0],
        price: pricePoint[1],
        volume: data.volumes[index] ? data.volumes[index][1] : 0,
    }));
    
    const smaData = calculateSMA(chartData, 3);
    
    const combinedData = chartData.map(d => {
        const smaPoint = smaData.find(s => s.time === d.time);
        return { ...d, SMA: smaPoint ? smaPoint.SMA : null };
    });

    const yAxisDomain = [
        Math.min(...chartData.map(d => d.price)) * 0.98,
        Math.max(...chartData.map(d => d.price)) * 1.02,
    ];

    return (
        <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={combinedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.5)"/>
                <XAxis 
                    dataKey="time" 
                    tickFormatter={(time) => format(new Date(time), 'd MMM')}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis 
                    yAxisId="left" 
                    domain={yAxisDomain}
                    tickFormatter={(price) => `$${(price / 1000).toFixed(0)}k`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                 <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tickFormatter={(volume) => `${(volume / 1_000_000_000).toFixed(1)}B`}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="right" dataKey="volume" fill="hsl(var(--secondary))" name="Volumen" barSize={20} />
                <Line yAxisId="left" type="monotone" dataKey="price" stroke="hsl(var(--primary))" name="Precio" dot={false} strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="SMA" stroke="hsl(var(--accent))" name="SMA (3 días)" dot={false} strokeWidth={2} strokeDasharray="5 5" />
            </ComposedChart>
        </ResponsiveContainer>
    );
};


export default function TradingAnalysisPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [debate, setDebate] = useState<CryptoDebateTurn[]>([]);
    const [synthesis, setSynthesis] = useState<string>('');
    const [signals, setSignals] = useState<TradingSignal[]>([]);
    const [alphaState, setAlphaState] = useState<string>('Sin análisis previo. Empezando desde cero.');
    const [analysisHistory, setAnalysisHistory, isHistoryLoading] = useLocalStorage<TradingAnalysisRecord[]>('trading-analysis-history', []);
    const [marketData, setMarketData] = useState<MarketChartData | null>(null);
    
    // State to differentiate between live generation and viewing history
    const [isViewingHistory, setIsViewingHistory] = useState(false);

    // States for typing effect (only for live generation)
    const displayedDebate = useTypingEffect(debate.map(t => `${t.analyst}: ${t.argument}`).join('\n\n'), 30);
    const displayedSynthesis = useTypingEffect(synthesis, 30);


    const debateEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        debateEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [displayedDebate]);

    const handleStartAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setIsViewingHistory(false); // Switch to live generation mode

        // Reset display states
        setDebate([]);
        setSynthesis('');
        setSignals([]);
        setMarketData(null);
        
        try {
            const result: FullCryptoAnalysis = await runCryptoAnalysis({ previousAlphaState: alphaState });
            
            // Set final data directly
            setDebate(result.debate);
            setSynthesis(result.synthesis);
            setSignals(result.signals);
            setMarketData(result.marketData || null);

            const newAlphaState = `El último análisis generó ${result.signals.length} señales. La principal fue ${result.signals[0]?.action} ${result.signals[0]?.crypto} a ${result.signals[0]?.price}. Conclusión general: ${result.synthesis.substring(0, 100)}...`;
            setAlphaState(newAlphaState);
            
            // Save to history after completion
            const newRecord: TradingAnalysisRecord = {
                id: uuidv4(),
                timestamp: new Date().toISOString(),
                ...result,
            };
            setAnalysisHistory(prev => [newRecord, ...prev].slice(0, 20)); // Keep last 20 records

        } catch (e: any) {
            console.error(e);
            setError("Error al ejecutar el análisis. Por favor, inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    }, [alphaState, setAnalysisHistory]);
    
    const loadHistoryRecord = (record: TradingAnalysisRecord) => {
        setIsViewingHistory(true); // Switch to history viewing mode
        setDebate(record.debate);
        setSynthesis(record.synthesis);
        setSignals(record.signals);
        setMarketData(record.marketData || null);
    };

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
                        <div className="flex items-center gap-2">
                            <Sheet>
                                <SheetTrigger asChild>
                                     <Button variant="outline" disabled={isHistoryLoading}>
                                        <History className="mr-2 h-4 w-4" />
                                        Historial
                                    </Button>
                                </SheetTrigger>
                                <SheetContent className="w-full sm:max-w-md p-0">
                                    <SheetHeader className="p-4 border-b">
                                        <SheetTitle>Historial de Análisis</SheetTitle>
                                    </SheetHeader>
                                    <ScrollArea className="h-[calc(100%-4rem)]">
                                        {analysisHistory.length > 0 ? (
                                            <div className="p-4 space-y-3">
                                                {analysisHistory.map(record => (
                                                    <Card key={record.id} className="cursor-pointer hover:border-primary" onClick={() => loadHistoryRecord(record)}>
                                                        <CardHeader>
                                                            <CardTitle className="text-sm">Análisis del {new Date(record.timestamp).toLocaleDateString()}</CardTitle>
                                                            <CardDescription>
                                                                {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true, locale: es })}
                                                            </CardDescription>
                                                        </CardHeader>
                                                        <CardContent>
                                                            <p className="text-xs text-muted-foreground">{record.signals.length} señales generadas.</p>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-center text-sm text-muted-foreground p-8">No hay análisis en el historial.</p>
                                        )}
                                    </ScrollArea>
                                </SheetContent>
                            </Sheet>
                            <Button onClick={handleStartAnalysis} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                                {isLoading ? 'Analizando...' : 'Iniciar Análisis'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                    {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                    <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6 h-full">
                        {/* Main Debate Area */}
                        <div className="lg:col-span-2 h-full flex flex-col gap-6">
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
                                             {isLoading && debate.length === 0 && (
                                                <div className="flex items-center justify-center h-full">
                                                    <Loader2 className="w-8 h-8 animate-spin text-primary"/>
                                                </div>
                                            )}
                                            {debate.map((turn, index) => (
                                                <div key={index} className={`flex flex-col gap-2 ${turn.analyst === 'Apex' ? 'items-start' : 'items-end'}`}>
                                                    <AnalystAvatar name={turn.analyst}/>
                                                    <div className={`p-3 rounded-lg max-w-xl ${turn.analyst === 'Apex' ? 'bg-blue-900/40 rounded-bl-none' : 'bg-amber-900/40 rounded-br-none'}`}>
                                                        <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                                                            {isViewingHistory ? turn.argument : displayedDebate.split(`${turn.analyst}: `)[index+1] || ''}
                                                        </ReactMarkdown>
                                                    </div>
                                                </div>
                                            ))}
                                            <div ref={debateEndRef} />
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Gráfico de Mercado (BTC/USD - 7 Días)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <MarketChart data={marketData!} />
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
                                            <ReactMarkdown>{isViewingHistory ? synthesis : displayedSynthesis}</ReactMarkdown>
                                            {isLoading && synthesis.length === 0 && <span className="animate-pulse">.</span>}
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
                                                {signals.map((signal, index) => (
                                                    <TableRow key={`${signal.crypto}-${index}`}>
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
