
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Chat, Message, ProfileData, CachedProfile, TorahCodeAnalysis } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainCircuit, UserCheck, ShieldCheck, ListChecks, ChevronLeft, Sparkles, Filter, ShieldQuestion, Info, RefreshCcw, LineChart, Target, Repeat, Star, Shield, AlertTriangle, GitCommit, LayoutDashboard, BarChart3, Search, Cog, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import EmotionalChart from '@/components/profile/EmotionalChart';
import BreakdownExerciseGenerator from '@/components/profile/BreakdownExerciseGenerator';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import { generateUserProfile } from '@/ai/flows/generate-user-profile';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import TextSizeControl from '@/components/profile/TextSizeControl';
import { cn } from '@/lib/utils';
import ProfileCryptoAnalysis from '@/components/profile/ProfileCryptoAnalysis';

const EmotionalConstellation = dynamic(() => import('@/components/profile/EmotionalConstellation'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

type TextSize = 'sm' | 'base' | 'lg';

export default function PsychologicalProfile() {
  const { user, loading: authLoadingFromHook } = useAuth();
  const firestore = useFirestore();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('Iniciando...');
  const [error, setError] = useState<string | null>(null);
  const [isOutdated, setIsOutdated] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [diagnosisTextSize, setDiagnosisTextSize] = useState<TextSize>('base');
  const [personalityTextSize, setPersonalityTextSize] = useState<TextSize>('base');
  const [strengthsTextSize, setStrengthsTextSize] = useState<TextSize>('base');

  const storageKey = useMemo(() => user ? `psych-profile-${user.uid}` : null, [user]);

  const chatsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'asc')) : undefined),
    [user?.uid, firestore]
  );
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);

 const fetchAndGenerateProfile = useCallback(async () => {
    if (!user || !firestore || !storageKey ) {
      setLoading(false);
      setError('Datos insuficientes o no has iniciado sesión.');
      return;
    }

    setGenerating(true);
    setLoading(false);
    setError(null);
    setGenerationStatus('Iniciando proceso...');
    
    try {
      setProgress(10);
      setGenerationStatus('Recopilando historial de conversaciones...');
      let fullChatHistory = '';
      if (chats && chats.length > 0) {
        for (const chat of chats) {
          fullChatHistory += `--- INICIO DEL CHAT: ${chat.title} ---\n`;
          const messagesQuery = query(collection(firestore, `users/${user.uid}/chats/${chat.id}/messages`), orderBy('timestamp', 'asc'));
          const messagesSnapshot = await getDocs(messagesQuery);
          
          messagesSnapshot.forEach(doc => {
            const msg = doc.data() as Message;
            const date = msg.timestamp && typeof (msg.timestamp as any).toDate === 'function'
                ? (msg.timestamp as Timestamp).toDate()
                : new Date(msg.timestamp as any);
            fullChatHistory += `[${date.toISOString()}] ${msg.role}: ${msg.content}\n`;
          });
          fullChatHistory += `--- FIN DEL CHAT ---\n\n`;
        }
      }
      setProgress(50);
      
      if (!fullChatHistory.trim()) {
        throw new Error('Tus conversaciones están vacías. No se puede generar un perfil.');
      }
      
      const cachedItem = localStorage.getItem(storageKey);
      const previousProfilesContext = cachedItem ? JSON.stringify(JSON.parse(cachedItem).profile, null, 2) : '';
      
      setProgress(60);
      setGenerationStatus('La IA está analizando tu perfil...');

      const result = await generateUserProfile({ fullChatHistory, previousProfilesContext });
      setProgress(90);
      setGenerationStatus('Finalizando el informe...');

      if (!result) {
        throw new Error('La generación del perfil falló en el servidor.');
      }
      
      const newCachedData: CachedProfile = { profile: result, lastMessageTimestamp: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(newCachedData));
      
      setProfile(result);
      setIsOutdated(false);
      setProgress(100);

    } catch (e: any) {
      console.error('Error in fetchAndGenerateProfile:', e);
      setError(e.message || 'Ocurrió un error al generar tu perfil. Por favor, inténtalo de nuevo más tarde.');
      toast({
        variant: "destructive",
        title: "Error de Generación",
        description: e.message || 'No se pudo generar el perfil.',
      });
    } finally {
      setTimeout(() => setGenerating(false), 500);
    }
  }, [user, firestore, storageKey, chats, toast]);


  useEffect(() => {
    setIsClient(true);
  }, []);

  const authLoading = authLoadingFromHook || !isClient;

  useEffect(() => {
    if (authLoading || chatsLoading) {
      return;
    }
    if (!user) {
      setError('Debes iniciar sesión para ver tu perfil.');
      setLoading(false);
      return;
    }

    const loadInitialData = async () => {
      try {
        const cachedItem = localStorage.getItem(storageKey!);
        
        let latestConversationTimestamp = 0;
        if (chats && chats.length > 0) {
            latestConversationTimestamp = Math.max(...chats.map(c => 
                (c.latestMessageAt ? (c.latestMessageAt as Timestamp).toMillis() : 0) || 
                (c.createdAt ? (c.createdAt as Timestamp).toMillis() : 0)
            ));
        }

        if (cachedItem) {
          const data: CachedProfile = JSON.parse(cachedItem);
          setProfile(data.profile);
          if (latestConversationTimestamp > data.lastMessageTimestamp) {
            setIsOutdated(true);
          }
          setLoading(false);
        } else {
          if (latestConversationTimestamp > 0) {
            fetchAndGenerateProfile();
          } else {
            setError('No hay conversaciones para analizar. ¡Inicia un chat para generar tu perfil!');
            setLoading(false);
          }
        }
      } catch (e: any) {
         setError(e.message || 'No se pudo cargar la información inicial.');
         setLoading(false);
      }
    };
    
    loadInitialData();
    
  }, [user, storageKey, isClient, fetchAndGenerateProfile, chats, chatsLoading, authLoading]);


  if (loading || chatsLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="mb-6">
           <Button asChild variant="ghost" className='-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground'>
                <Link href="/">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Volver al Chat
                </Link>
            </Button>
        </div>
        <Skeleton className="h-10 w-1/3 bg-muted" />
        <Skeleton className="h-8 w-1/2 bg-muted" />
        <div className="space-y-4">
            <Skeleton className="h-32 w-full bg-muted" />
            <Skeleton className="h-32 w-full bg-muted" />
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center text-center overflow-hidden">
          {/* Fondo de engranajes animados */}
          <div className="absolute inset-0 z-0 opacity-10">
              <motion.div
                  className="absolute"
                  style={{ top: '10%', left: '15%', width: '20vw', height: '20vw' }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
              >
                  <Cog className="w-full h-full text-foreground" />
              </motion.div>
              <motion.div
                  className="absolute"
                  style={{ bottom: '5%', right: '10%', width: '30vw', height: '30vw' }}
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
              >
                  <Cog className="w-full h-full text-foreground" />
              </motion.div>
              <motion.div
                  className="absolute"
                  style={{ top: '50%', left: '5%', width: '15vw', height: '15vw' }}
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
              >
                  <Cog className="w-full h-full text-foreground" />
              </motion.div>
              <motion.div
                  className="absolute"
                  style={{ top: '20%', right: '25%', width: '10vw', height: '10vw' }}
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
              >
                  <Cog className="w-full h-full text-foreground" />
              </motion.div>
          </div>
          
          {/* Engranaje central y texto */}
          <div className="relative z-10 p-4">
              <motion.div
                  className="relative w-48 h-48 md:w-64 md:h-64 mx-auto mb-8"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
              >
                  <Cog className="w-full h-full text-primary/50" />
              </motion.div>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="w-full max-w-md bg-background/50 backdrop-blur-sm p-6 rounded-xl">
                      <h2 className="text-2xl font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">Generando tu Cianotipo Psicológico...</h2>
                      <p className="text-muted-foreground mb-4">La IA está analizando tu historial para crear un informe evolutivo.</p>
                      <div className='w-full max-w-sm mx-auto space-y-2'>
                          <Progress value={progress} className="w-full h-2" />
                          <p className='text-center text-xs font-medium text-primary'>{generationStatus} ({Math.round(progress)}%)</p>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <Button asChild variant="ghost" className="-ml-4 mb-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
          <Link href="/">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver al Chat
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        {error.includes("permisos") === false &&
          <Button onClick={() => fetchAndGenerateProfile()} className="mt-4">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Intentar de nuevo
          </Button>
        }
      </div>
    );
  }

  if (!profile) {
     return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
            <Button asChild variant="ghost" className="-ml-4 mb-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
              <Link href="/">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Volver al Chat
              </Link>
            </Button>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Perfil no encontrado</AlertTitle>
              <AlertDescription>
                Aún no tienes un perfil generado o no hemos podido cargarlo.
              </AlertDescription>
            </Alert>
            <Button onClick={() => fetchAndGenerateProfile()} className="mt-4">
              <Sparkles className="mr-2 h-4 w-4" />
              Generar mi perfil ahora
            </Button>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
           <Button asChild variant="ghost" className='-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground'>
                <Link href="/">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Volver al Chat
                </Link>
            </Button>
        </div>

        {isOutdated && (
          <Alert className="mb-6 bg-primary/10 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary/90">Tu perfil ha evolucionado</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                <p className="text-primary/70">Has tenido nuevas conversaciones desde el último análisis. ¡Actualiza tu perfil para ver qué ha cambiado!</p>
                <div className="flex gap-2 flex-shrink-0">
                    <Button onClick={() => fetchAndGenerateProfile()} size="sm">
                       <RefreshCcw className='mr-2 h-4 w-4'/>
                       Actualizar ahora
                    </Button>
                </div>
            </AlertDescription>
          </Alert>
        )}

        <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">Dashboard de Autoconocimiento</h1>
            <p className="text-muted-foreground mt-2">
                Un análisis integral generado por IA basado en tu historial. Esto no reemplaza un diagnóstico profesional.
            </p>
        </header>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:inline-flex md:w-auto mb-6 bg-card/50">
            <TabsTrigger value="overview" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline">Resumen</span>
                <span className="md:hidden">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2" data-tour-id="profile-metrics">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden md:inline">Métricas</span>
                <span className="md:hidden">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="deep-dive" className="gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden md:inline">Análisis Profundo</span>
                <span className="md:hidden">Análisis</span>
            </TabsTrigger>
             <TabsTrigger value="oracle" className="gap-2" data-tour-id="profile-oracle">
                <BookOpen className="h-4 w-4" />
                <span className="hidden md:inline">Oráculo</span>
                <span className="md:hidden">Oráculo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
              <Card className="bg-card/50 border-border/50" data-tour-id="profile-diagnosis">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="flex items-center gap-3 text-xl">
                        <BrainCircuit className="w-6 h-6 text-accent"/>
                        Diagnóstico Descriptivo
                    </CardTitle>
                    <TextSizeControl size={diagnosisTextSize} onSizeChange={setDiagnosisTextSize} />
                </CardHeader>
                <CardContent>
                    <ReactMarkdown className={cn(
                        "prose dark:prose-invert max-w-none text-foreground/80 leading-relaxed",
                        {
                            'text-sm': diagnosisTextSize === 'sm',
                            'text-base': diagnosisTextSize === 'base',
                            'text-lg': diagnosisTextSize === 'lg',
                        }
                    )}>{profile.diagnosis}</ReactMarkdown>
                </CardContent>
              </Card>

              { (profile.coreArchetype || profile.coreConflict) && (
                <div className="grid md:grid-cols-2 gap-6">
                    {profile.coreArchetype && (
                    <Card className="bg-card/50 border-border/50" data-tour-id="profile-archetype">
                      <CardHeader>
                        <CardTitle className='flex items-center gap-3'><UserCheck className="w-6 h-6 text-accent"/> Arquetipo: {profile.coreArchetype.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className='prose prose-sm dark:prose-invert max-w-none text-muted-foreground'>{profile.coreArchetype.description}</p>
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-xs uppercase tracking-wider flex items-center gap-2"><Star className="w-4 h-4 text-green-400"/> Fortalezas</h4>
                            <p className="text-sm text-muted-foreground mt-1">{profile.coreArchetype.strengths}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-xs uppercase tracking-wider flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400"/> Desafíos</h4>
                            <p className="text-sm text-muted-foreground mt-1">{profile.coreArchetype.challenges}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    )}
                    {profile.coreConflict && (
                     <Card className="bg-card/50 border-border/50">
                      <CardHeader>
                        <CardTitle className='flex items-center gap-3'><Target className="w-6 h-6 text-accent"/> Conflicto Nuclear</CardTitle>
                      </CardHeader>
                      <CardContent className="flex items-center justify-center h-full">
                        <p className='text-lg font-medium text-center italic p-4 bg-background/50 rounded-lg'>"{profile.coreConflict}"</p>
                      </CardContent>
                    </Card>
                    )}
                </div>
              )}

              {profile.habitLoop && (
                 <Card className="bg-card/50 border-border/50" data-tour-id="profile-habit-loop">
                  <CardHeader>
                    <CardTitle className='flex items-center gap-3'><Repeat className="w-6 h-6 text-accent"/> El Bucle del Hábito</CardTitle>
                    <CardDescription>Un patrón recurrente en tu comportamiento. Identificarlo es el primer paso para poder cambiarlo.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="flex flex-col items-center overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 mb-2">
                                <GitCommit className="w-6 h-6 -rotate-90" />
                            </div>
                            <h4 className="font-semibold">Disparador</h4>
                            <p className="text-sm text-muted-foreground px-2 break-words">{profile.habitLoop.trigger}</p>
                        </div>
                        <div className="flex flex-col items-center overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                                <BrainCircuit className="w-6 h-6" />
                            </div>
                            <h4 className="font-semibold">Pensamiento</h4>
                            <p className="text-sm text-muted-foreground px-2 break-words">{profile.habitLoop.thought}</p>
                        </div>
                        <div className="flex flex-col items-center overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                                <ShieldQuestion className="w-6 h-6" />
                            </div>
                            <h4 className="font-semibold">Acción</h4>
                            <p className="text-sm text-muted-foreground px-2 break-words">{profile.habitLoop.action}</p>
                        </div>
                        <div className="flex flex-col items-center overflow-hidden">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h4 className="font-semibold">Resultado</h4>
                            <p className="text-sm text-muted-foreground px-2 break-words">{profile.habitLoop.result}</p>
                        </div>
                    </div>
                    {profile.habitLoop.trigger && <BreakdownExerciseGenerator habitLoop={profile.habitLoop} />}
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          <TabsContent value="metrics" className="mt-6 space-y-6">
              {profile.emotionalJourney?.length > 0 && (
                  <Card className="bg-card/50 border-border/50">
                      <CardHeader>
                          <CardTitle className="flex items-center gap-3 text-xl">
                              <LineChart className="w-6 h-6 text-accent"/>
                              Evolución Emocional
                          </CardTitle>
                          <CardDescription>Tu línea de tiempo de sentimientos basada en las conversaciones.</CardDescription>
                      </CardHeader>
                      <CardContent>
                          {isClient && <EmotionalChart data={profile.emotionalJourney} />}
                      </CardContent>
                  </Card>
              )}
              {profile.emotionalConstellation?.nodes?.length > 0 && isClient && (
                <Card className="bg-card/50 border-border/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <BrainCircuit className="w-6 h-6 text-accent" />
                            Constelador Emocional
                        </CardTitle>
                        <CardDescription>
                            Una red de tus temas y emociones más recurrentes. El tamaño del círculo representa la importancia del tema. El color del enlace muestra el sentimiento de la conexión (verde para positivo, rojo para negativo).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 h-[400px]">
                        <EmotionalConstellation data={profile.emotionalConstellation} />
                    </CardContent>
                </Card>
              )}
          </TabsContent>
          
          <TabsContent value="deep-dive" className="mt-6">
             <Accordion type="multiple" className="w-full space-y-4">
                <AccordionItem value="item-1">
                    <Card className="bg-card/50 border-border/50">
                        <CardHeader className="flex flex-row justify-between items-center pr-6">
                             <CardTitle className="flex items-center gap-3 text-xl">
                                <UserCheck className="w-6 h-6 text-accent"/>
                                Caracterización de la Personalidad
                            </CardTitle>
                            <TextSizeControl size={personalityTextSize} onSizeChange={setPersonalityTextSize} />
                        </CardHeader>
                        <AccordionTrigger className="w-full text-left p-6 pt-0 text-sm text-primary hover:no-underline [&>svg]:ml-auto">
                           <span>Mostrar/Ocultar Análisis</span>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="pt-0">
                                <ReactMarkdown className={cn(
                                    "prose dark:prose-invert max-w-none text-foreground/80 leading-relaxed",
                                    {
                                        'text-sm': personalityTextSize === 'sm',
                                        'text-base': personalityTextSize === 'base',
                                        'text-lg': personalityTextSize === 'lg',
                                    }
                                )}>{profile.personality}</ReactMarkdown>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                     <Card className="bg-card/50 border-border/50">
                        <CardHeader className="flex flex-row justify-between items-center pr-6">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <Sparkles className="w-6 h-6 text-accent"/>
                                Fortalezas Psicológicas
                            </CardTitle>
                            <TextSizeControl size={strengthsTextSize} onSizeChange={setStrengthsTextSize} />
                        </CardHeader>
                        <AccordionTrigger className="w-full text-left p-6 pt-0 text-sm text-primary hover:no-underline [&>svg]:ml-auto">
                           <span>Mostrar/Ocultar Análisis</span>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="pt-0">
                                <ReactMarkdown className={cn(
                                     "prose dark:prose-invert max-w-none text-foreground/80 leading-relaxed",
                                    {
                                        'text-sm': strengthsTextSize === 'sm',
                                        'text-base': strengthsTextSize === 'base',
                                        'text-lg': strengthsTextSize === 'lg',
                                    }
                                )}>{profile.strengths}</ReactMarkdown>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>

                <AccordionItem value="item-3">
                    <Card className="bg-card/50 border-border/50">
                        <AccordionTrigger className="w-full text-left p-6 hover:no-underline [&>svg]:ml-auto">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <Filter className="w-6 h-6 text-accent"/>
                                Sesgos Cognitivos Potenciales
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent>
                            {profile.cognitiveBiases?.length > 0 ? (
                               <ul className="space-y-3">
                                {profile.cognitiveBiases.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1"/>
                                        <ReactMarkdown className="text-foreground/80 prose prose-sm dark:prose-invert max-w-none prose-p:m-0">{rec}</ReactMarkdown>
                                    </li>
                                ))}
                               </ul>
                               ) : (
                                <p className="text-muted-foreground text-sm">No se identificaron sesgos cognitivos significativos.</p>
                               )}
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                    <Card className="bg-card/50 border-border/50">
                        <AccordionTrigger className="w-full text-left p-6 hover:no-underline [&>svg]:ml-auto">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <ShieldQuestion className="w-6 h-6 text-accent"/>
                                Mecanismos de Defensa
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent>
                              {profile.defenseMechanisms?.length > 0 ? (
                               <ul className="space-y-3">
                                {profile.defenseMechanisms.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1"/>
                                        <ReactMarkdown className="text-foreground/80 prose prose-sm dark:prose-invert max-w-none prose-p:m-0">{rec}</ReactMarkdown>
                                    </li>
                                ))}
                               </ul>
                               ) : (
                                <p className="text-muted-foreground text-sm">No se identificaron mecanismos de defensa significativos.</p>
                               )}
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>

                <AccordionItem value="item-5">
                    <Card className="bg-card/50 border-border/50">
                        <AccordionTrigger className="w-full text-left p-6 hover:no-underline [&>svg]:ml-auto">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <ListChecks className="w-6 h-6 text-accent"/>
                                Recomendaciones
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent>
                              {profile.recommendations?.length > 0 ? (
                               <ul className="space-y-3">
                                {profile.recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-3">
                                        <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-1"/>
                                        <ReactMarkdown className="text-foreground/80 prose prose-sm dark:prose-invert max-w-none prose-p:m-0">{rec}</ReactMarkdown>
                                    </li>
                                ))}
                               </ul>
                               ) : (
                                <p className="text-muted-foreground text-sm">No hay recomendaciones específicas en este momento.</p>
                               )}
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            </Accordion>
          </TabsContent>
           <TabsContent value="oracle" className="mt-6">
                <ProfileCryptoAnalysis profile={profile} />
           </TabsContent>
        </Tabs>
    </div>
  );
}

    