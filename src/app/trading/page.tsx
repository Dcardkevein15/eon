'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Play, BrainCircuit, Bot, Sparkles, ChevronLeft, History, TrendingUp, TrendingDown, PauseCircle } from 'lucide-react';
import type { TradingSignal, CryptoDebateTurn, TradingAnalysisRecord, FullCryptoAnalysis, Coin, MarketData } from '@/lib/types';
import { runCryptoAnalysis, getCoinList } from '@/ai/flows/crypto-analysis-flow';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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

const SignalCard = ({ signal }: { signal: TradingSignal }) => {
    const signalConfig = {
        COMPRAR: {
            icon: TrendingUp,
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
        },
        VENDER: {
            icon: TrendingDown,
            color: 'text-red-400',
            bgColor: 'bg-red-500/10',
        },
        MANTENER: {
            icon: PauseCircle,
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/10',
        },
    };

    const { icon: Icon, color, bgColor } = signalConfig[signal.action];

    return (
        <div className={cn('p-4 rounded-lg border', bgColor, color)}>
            <div className="flex justify-between items-start gap-4">
                <div className='flex items-center gap-3'>
                    <Icon className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-wider">{signal.action}</span>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg text-foreground">
                        {signal.price > 0 ? `$${signal.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`: '-'}
                    </p>
                </div>
            </div>
            <p className="text-xs text-foreground/70 mt-2">{signal.reasoning}</p>
        </div>
    );
};


export default function TradingAnalysisPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FullCryptoAnalysis | null>(null);
    const [analysisHistory, setAnalysisHistory, isHistoryLoading] = useLocalStorage<TradingAnalysisRecord[]>('trading-analysis-history', []);
    
    const [isViewingHistory, setIsViewingHistory] = useState(false);
    const [coins, setCoins] = useState<Coin[]>([]);
    const [selectedCoinId, setSelectedCoinId] = useState('bitcoin');

    useEffect(() => {
        const fetchCoins = async () => {
            try {
                const coinList = await getCoinList();
                setCoins(coinList);
            } catch (e) {
                console.error("Failed to fetch coin list", e);
                setError("No se pudo cargar la lista de criptomonedas.");
            }
        };
        fetchCoins();
    }, []);

    const handleStartAnalysis = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);
        setIsViewingHistory(false);
        
        try {
            const result: FullCryptoAnalysis = await runCryptoAnalysis({
                crypto_id: selectedCoinId,
            });
            
            setAnalysisResult(result);
            
            const newRecord: TradingAnalysisRecord = {
                id: uuidv4(),
                timestamp: new Date().toISOString(),
                crypto_id: selectedCoinId,
                ...result,
            };
            setAnalysisHistory(prev => [newRecord, ...prev].slice(0, 20));

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Error al ejecutar el análisis. Por favor, inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    }, [selectedCoinId, setAnalysisHistory]);
    
    const loadHistoryRecord = (record: TradingAnalysisRecord) => {
        setIsViewingHistory(true);
        setAnalysisResult(record);
        if (Array.isArray(coins)) {
            const coin = coins.find(c => c.id === record.crypto_id);
            if (coin) {
              setSelectedCoinId(coin.id);
            }
        }
    };
    
    const selectedCoin = useMemo(() => Array.isArray(coins) ? coins.find(c => c.id === selectedCoinId) : null, [coins, selectedCoinId]);

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
                            <h1 className="text-xl font-bold tracking-tight">Análisis Pro de Trading</h1>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Select value={selectedCoinId} onValueChange={setSelectedCoinId} disabled={!coins || coins.length === 0}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Seleccionar Cripto" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.isArray(coins) && coins.map(coin => (
                                        <SelectItem key={coin.id} value={coin.id}>{coin.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                                            <CardTitle className="text-sm">Análisis de {record.crypto_id}</CardTitle>
                                                            <CardDescription>
                                                                {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true, locale: es })}
                                                            </CardDescription>
                                                        </CardHeader>
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

                <ScrollArea className="flex-1">
                    <div className="p-4 lg:p-6">
                        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                        
                        {!analysisResult && !isLoading && (
                            <div className="flex items-center justify-center h-full text-center text-muted-foreground py-16">
                                <p>Selecciona una criptomoneda y presiona "Iniciar Análisis" para comenzar.</p>
                            </div>
                        )}

                        {isLoading && (
                            <div className="flex items-center justify-center h-full py-16">
                                <Loader2 className="w-8 h-8 animate-spin text-primary"/>
                            </div>
                        )}

                        {analysisResult && (
                        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 flex flex-col gap-6">
                                <Card className="flex-1 flex flex-col bg-card/50">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-primary"/> Debate de Analistas IA sobre {selectedCoin?.name || ''}</CardTitle>
                                        <CardDescription>Apex (Técnico) y Helios (Fundamental) discuten sus perspectivas.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <ScrollArea className="h-96">
                                            <div className="space-y-6 pr-4">
                                                {analysisResult.debate.map((turn, index) => (
                                                    <div key={index} className={`flex flex-col gap-2 ${turn.analyst === 'Apex' ? 'items-start' : 'items-end'}`}>
                                                        <AnalystAvatar name={turn.analyst}/>
                                                        <div className={`p-3 rounded-lg max-w-xl ${turn.analyst === 'Apex' ? 'bg-blue-900/40 rounded-bl-none' : 'bg-amber-900/40 rounded-br-none'}`}>
                                                            <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                                                                {turn.argument}
                                                            </ReactMarkdown>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                            
                            <div className="flex flex-col gap-6">
                               <Card className="flex-1 flex flex-col bg-card/50">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent"/> Síntesis Estratégica</CardTitle>
                                        <CardDescription>The Synthesizer extrae las conclusiones clave.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1">
                                        <ScrollArea className="h-64">
                                            <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
                                               <ReactMarkdown>{analysisResult.synthesis}</ReactMarkdown>
                                            </div>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                                 <Card className="bg-card/80 border-primary/30">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-primary">Señales del Día</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {analysisResult.signals.map((signal, index) => (
                                                <SignalCard key={index} signal={signal} />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                        )}
                    </div>
                </ScrollArea>
             </main>
        </div>
    );
}
