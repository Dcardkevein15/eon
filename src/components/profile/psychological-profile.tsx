

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, getDocs, query, orderBy, limit, Timestamp, doc, setDoc } from 'firebase/firestore';
import type { Chat, Message, ProfileData, CachedProfile } from '@/lib/types';
import { generateUserProfile } from '@/ai/flows/generate-user-profile';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrainCircuit, UserCheck, ShieldCheck, ListChecks, ChevronLeft, Sparkles, Filter, ShieldQuestion, Info, RefreshCcw, LineChart, Target, Repeat, Star, Shield, AlertTriangle, GitCommit, LayoutDashboard, BarChart3, Search } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import EmotionalChart from './EmotionalChart';
import BreakdownExerciseGenerator from './BreakdownExerciseGenerator';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';

const EmotionalConstellation = dynamic(() => import('./EmotionalConstellation'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

export default function PsychologicalProfile() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const { setTheme } = useTheme();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isOutdated, setIsOutdated] = useState(false);
  const [cachedData, setCachedData] = useState<CachedProfile | null>(null);
  const [isClient, setIsClient] = useState(false);

  const storageKey = useMemo(() => user ? `psych-profile-${user.uid}` : null, [user]);

  const getLatestMessageTimestamp = useCallback(async (): Promise<number | null> => {
    if (!user || !firestore) return null;
    
    const lastChatQuery = query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'desc'), limit(1));
    const lastChatSnap = await getDocs(lastChatQuery);

    if (lastChatSnap.empty) return null;

    const lastChatId = lastChatSnap.docs[0].id;
    const lastMessageQuery = query(collection(firestore, `users/${user.uid}/chats/${lastChatId}/messages`), orderBy('timestamp', 'desc'), limit(1));
    const lastMessageSnap = await getDocs(lastMessageQuery);

    if (lastMessageSnap.empty) return null;

    const timestamp = lastMessageSnap.docs[0].data().timestamp;
    return timestamp instanceof Timestamp ? timestamp.toMillis() : new Date(timestamp as any).getTime();
  }, [user, firestore]);

  const fetchAndGenerateProfile = useCallback(async (forceGeneration: boolean = false) => {
    if (!user || !firestore || !storageKey) {
      setLoading(false);
      setError('Debes iniciar sesión para ver tu perfil.');
      return;
    }

    setGenerating(true);
    setLoading(false);
    setError(null);
    
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 0.5, 99));
    }, 400);

    try {
      const chatsQuery = query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'asc'));
      const chatsSnapshot = await getDocs(chatsQuery);
      const chats = chatsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));

      if (chats.length === 0) {
        throw new Error('No hay conversaciones para analizar. ¡Inicia un chat para generar tu perfil!');
      }
      
      let fullChatHistory = '';
      let latestTimestamp = 0;

      for (const chat of chats) {
        fullChatHistory += `--- INICIO DEL CHAT: ${chat.title} ---\n`;
        const messagesQuery = query(collection(firestore, `users/${user.uid}/chats/${chat.id}/messages`), orderBy('timestamp', 'asc'));
        const messagesSnapshot = await getDocs(messagesQuery);
        
        messagesSnapshot.forEach(doc => {
          const msg = doc.data() as Message;
          const date = msg.timestamp instanceof Timestamp ? msg.timestamp.toDate() : new Date(msg.timestamp as any);
          const msgTimestamp = date.getTime();
          
          fullChatHistory += `[${date.toISOString()}] ${msg.role}: ${msg.content}\n`;
          if (msgTimestamp > latestTimestamp) latestTimestamp = msgTimestamp;
        });
        fullChatHistory += `--- FIN DEL CHAT ---\n\n`;
      }

      if (!fullChatHistory.trim()) {
        throw new Error('Tus conversaciones están vacías. No se puede generar un perfil.');
      }
      
      const profileDocsQuery = query(collection(firestore, `users/${user.uid}/profileHistory`), orderBy('generatedAt', 'desc'), limit(2));
      const profileDocsSnap = await getDocs(profileDocsQuery);
      const previousProfilesContext = profileDocsSnap.docs.map(d => JSON.stringify(d.data().profile)).join('\n\n---\n\n');
      
      const result = await generateUserProfile({ fullChatHistory, previousProfilesContext });
      
      const newProfileDoc = {
        profile: result,
        generatedAt: serverTimestamp()
      };
      const newDocRef = doc(collection(firestore, `users/${user.uid}/profileHistory`));
      await setDoc(newDocRef, newProfileDoc);

      const newCachedData: CachedProfile = { profile: result, lastMessageTimestamp: latestTimestamp };
      localStorage.setItem(storageKey, JSON.stringify(newCachedData));
      
      setProfile(result);
      setCachedData(newCachedData);
      setIsOutdated(false);
      setProgress(100);

    } catch (e: any) {
      console.error('Error generating psychological profile:', e);
      setError(e.message || 'Ocurrió un error al generar tu perfil. Por favor, inténtalo de nuevo más tarde.');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => setGenerating(false), 500);
    }
  }, [user, firestore, storageKey]);

  useEffect(() => {
    setIsClient(true);
    setTheme('dark');
  }, [setTheme]);

  useEffect(() => {
    if (!isClient || !user || !storageKey) {
      if (!user && isClient) setError('Debes iniciar sesión para ver tu perfil.');
      setLoading(false);
      return;
    };

    const loadInitialData = async () => {
      try {
        const cachedItem = localStorage.getItem(storageKey);
        const latestTimestamp = await getLatestMessageTimestamp();

        if (cachedItem) {
          const data: CachedProfile = JSON.parse(cachedItem);
          setCachedData(data);
          setProfile(data.profile);
          if (latestTimestamp && data.lastMessageTimestamp < latestTimestamp) {
            setIsOutdated(true);
          }
          setLoading(false);
        } else {
          if (latestTimestamp === null) {
            setError('No hay conversaciones para analizar. ¡Inicia un chat para generar tu perfil!');
            setLoading(false);
          } else {
            fetchAndGenerateProfile();
          }
        }
      } catch (e) {
         setError('No se pudo cargar la información inicial.');
         setLoading(false);
      }
    };
    loadInitialData();
  }, [storageKey, getLatestMessageTimestamp, fetchAndGenerateProfile, isClient, user]);

  const lastConversationDate = cachedData?.lastMessageTimestamp
      ? format(new Date(cachedData.lastMessageTimestamp), "d 'de' MMMM 'de' yyyy", { locale: es })
      : null;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-semibold mb-4">Generando tu perfil...</h2>
          <p className="text-muted-foreground mb-8 text-center">La IA está analizando tu historial para crear un informe evolutivo.</p>
          <div className='w-full max-w-md space-y-4'>
            <Progress value={progress} className="w-full h-3" />
            <p className='text-center text-sm font-medium'>{Math.round(progress)}%</p>
          </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <Button asChild variant="ghost" className="-ml-4 mb-4">
          <Link href="/">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver al Chat
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => fetchAndGenerateProfile(true)} className="mt-4">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Intentar de nuevo
        </Button>
      </div>
    );
  }

  if (!profile) {
     return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
            <Button asChild variant="ghost" className="-ml-4 mb-4">
              <Link href="/">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Volver al Chat
              </Link>
            </Button>
            <Alert>
              <AlertTitle>Perfil no encontrado</AlertTitle>
              <AlertDescription>
                No se pudo cargar tu perfil. Es posible que aún no se haya generado.
              </AlertDescription>
            </Alert>
            <Button onClick={() => fetchAndGenerateProfile(true)} className="mt-4">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Generar perfil ahora
            </Button>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        <div className="mb-6">
           <Button asChild variant="ghost" className='-ml-4'>
                <Link href="/">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Volver al Chat
                </Link>
            </Button>
        </div>

        {isOutdated && (
          <Alert className="mb-6 bg-blue-900/20 border-blue-500/30">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-blue-300">Nueva versión disponible</AlertTitle>
            <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                <p>Tu última conversación analizada es del {lastConversationDate}. Hay nuevas conversaciones disponibles para analizar.</p>
                <div className="flex gap-2 flex-shrink-0">
                    <Button onClick={() => fetchAndGenerateProfile(true)} size="sm">
                       <RefreshCcw className='mr-2 h-4 w-4'/>
                       Generar ahora
                    </Button>
                </div>
            </AlertDescription>
          </Alert>
        )}

        <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">Dashboard de Autoconocimiento</h1>
            <p className="text-muted-foreground mt-2">
                Un análisis integral generado por IA basado en tu historial. Esto no reemplaza un diagnóstico profesional.
            </p>
        </header>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:inline-flex md:w-auto">
             <TabsTrigger value="overview" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden md:inline">Métricas</span>
            </TabsTrigger>
            <TabsTrigger value="deep-dive" className="gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden md:inline">Análisis Profundo</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                        <BrainCircuit className="w-6 h-6 text-accent"/>
                        Diagnóstico Descriptivo
                    </CardTitle>
                </CardHeader>
                <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown className="text-foreground/80 whitespace-pre-wrap">{profile.diagnosis}</ReactMarkdown>
                </CardContent>
              </Card>

              { (profile.coreArchetype || profile.coreConflict) && (
                <div className="grid md:grid-cols-2 gap-6">
                    {profile.coreArchetype && (
                    <Card>
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
                     <Card>
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
                 <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-3'><Repeat className="w-6 h-6 text-accent"/> El Bucle del Hábito</CardTitle>
                    <CardDescription>Un patrón recurrente en tu comportamiento. Identificarlo es el primer paso para poder cambiarlo.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 mb-2">
                                <GitCommit className="w-6 h-6 -rotate-90" />
                            </div>
                            <h4 className="font-semibold">Disparador</h4>
                            <p className="text-sm text-muted-foreground px-2">{profile.habitLoop.trigger}</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                                <BrainCircuit className="w-6 h-6" />
                            </div>
                            <h4 className="font-semibold">Pensamiento</h4>
                            <p className="text-sm text-muted-foreground px-2">{profile.habitLoop.thought}</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
                                <ShieldQuestion className="w-6 h-6" />
                            </div>
                            <h4 className="font-semibold">Acción</h4>
                            <p className="text-sm text-muted-foreground px-2">{profile.habitLoop.action}</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-2">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <h4 className="font-semibold">Resultado</h4>
                            <p className="text-sm text-muted-foreground px-2">{profile.habitLoop.result}</p>
                        </div>
                    </div>
                    {profile.habitLoop.trigger && <BreakdownExerciseGenerator habitLoop={profile.habitLoop} />}
                  </CardContent>
                </Card>
              )}
          </TabsContent>

          <TabsContent value="metrics" className="mt-6 space-y-6">
              {profile.emotionalJourney?.length > 0 && (
                  <Card>
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
                <EmotionalConstellation data={profile.emotionalConstellation} />
              )}
          </TabsContent>
          
          <TabsContent value="deep-dive" className="mt-6">
             <Accordion type="multiple" className="w-full space-y-4">
                <AccordionItem value="item-1">
                    <Card>
                        <AccordionTrigger className="w-full text-left p-6 hover:no-underline [&>svg]:ml-auto">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <UserCheck className="w-6 h-6 text-accent"/>
                                Caracterización de la Personalidad
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown className="text-foreground/80 whitespace-pre-wrap">{profile.personality}</ReactMarkdown>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                    <Card>
                        <AccordionTrigger className="w-full text-left p-6 hover:no-underline [&>svg]:ml-auto">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <Sparkles className="w-6 h-6 text-accent"/>
                                Fortalezas Psicológicas
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown className="text-foreground/80 whitespace-pre-wrap">{profile.strengths}</ReactMarkdown>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>

                <AccordionItem value="item-3">
                    <Card>
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
                    <Card>
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
                    <Card>
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
        </Tabs>
    </div>
  );
}
