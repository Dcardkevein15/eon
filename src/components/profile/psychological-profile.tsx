'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { Chat, Message } from '@/lib/types';
import { generateUserProfile } from '@/ai/flows/generate-user-profile';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BrainCircuit, UserCheck, ShieldCheck, ListChecks, ChevronLeft, Sparkles, Filter, ShieldQuestion, Info, RefreshCcw, LineChart, Target, Repeat, Star, Shield, AlertTriangle, GitCommit } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import EmotionalChart from './EmotionalChart';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';


const EmotionalConstellation = dynamic(() => import('./EmotionalConstellation'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

type EmotionalStatePoint = {
  date: string;
  sentiment: number;
  summary: string;
  keyEvents: string[];
};

type EmotionalConstellationData = {
  nodes: { id: string; val: number }[];
  links: { source: string; target: string; sentiment: number }[];
};

type CoreArchetypeData = {
  title: string;
  description: string;
  strengths: string;
  challenges: string;
};

type HabitLoopData = {
  trigger: string;
  thought: string;
  action: string;
  result: string;
};

type ProfileData = {
  diagnosis: string;
  personality: string;
  recommendations: string[];
  strengths: string;
  cognitiveBiases: string[];
  defenseMechanisms: string[];
  emotionalJourney: EmotionalStatePoint[];
  emotionalConstellation: EmotionalConstellationData;
  coreArchetype?: CoreArchetypeData;
  coreConflict?: string;
  habitLoop?: HabitLoopData;
};

type CachedProfile = {
  profile: ProfileData;
  lastMessageTimestamp: number; // Store as epoch time for easy comparison
};

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

  // Function to fetch latest message timestamp to check for new conversations
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
    if (timestamp instanceof Timestamp) {
      return timestamp.toMillis();
    }
    // Fallback for different timestamp formats if needed
    return new Date(timestamp as any).getTime();
  }, [user, firestore]);

  // Main generation function
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
      setProgress(prev => {
        if (prev >= 99) {
          clearInterval(progressInterval);
          return 99;
        }
        const increment = Math.random() * 0.5;
        return Math.min(prev + increment, 99);
      });
    }, 400);

    try {
      const chatsQuery = query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'asc'));
      const chatsSnapshot = await getDocs(chatsQuery);
      const chats = chatsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));

      if (chats.length === 0) {
        setLoading(false);
        setGenerating(false);
        clearInterval(progressInterval);
        setError('No hay conversaciones para analizar. ¡Inicia un chat para generar tu perfil!');
        return;
      }
      
      let fullChatHistory = '';
      let latestTimestamp = 0;

      for (const chat of chats) {
        fullChatHistory += `--- INICIO DEL CHAT: ${chat.title} ---\n`;
        const messagesQuery = query(collection(firestore, `users/${user.uid}/chats/${chat.id}/messages`), orderBy('timestamp', 'asc'));
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages = messagesSnapshot.docs.map(doc => doc.data() as Message);
        
        messages.forEach(msg => {
          let dateStr: string;
          let msgTimestamp: number;

          if (msg.timestamp && typeof (msg.timestamp as any).toDate === 'function') {
              const date = (msg.timestamp as Timestamp).toDate();
              dateStr = date.toISOString();
              msgTimestamp = date.getTime();
          } else {
              // Fallback for cases where timestamp might not be a Firestore Timestamp
              const date = new Date(msg.timestamp as any);
              dateStr = date.toISOString();
              msgTimestamp = date.getTime();
          }
          
          const role = msg.role === 'user' ? 'Usuario' : 'Asistente';
          fullChatHistory += `[${dateStr}] ${role}: ${msg.content}\n`;

          if (msgTimestamp > latestTimestamp) {
            latestTimestamp = msgTimestamp;
          }
        });
        fullChatHistory += `--- FIN DEL CHAT ---\n\n`;
      }

      if (!fullChatHistory.trim()) {
        setLoading(false);
        setGenerating(false);
        clearInterval(progressInterval);
        setError('Tus conversaciones están vacías. No se puede generar un perfil.');
        return;
      }
      
      const result = await generateUserProfile({ fullChatHistory });
      
      clearInterval(progressInterval);
      
      const newCachedData: CachedProfile = { profile: result, lastMessageTimestamp: latestTimestamp };
      localStorage.setItem(storageKey, JSON.stringify(newCachedData));
      
      setProfile(result);
      setCachedData(newCachedData);
      setIsOutdated(false);
      setProgress(100);

    } catch (e) {
      console.error('Error generating psychological profile:', e);
      setError('Ocurrió un error al generar tu perfil. Por favor, inténtalo de nuevo más tarde.');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setGenerating(false);
      }, 500);
    }
  }, [user, firestore, storageKey]);

  useEffect(() => {
    setIsClient(true);
    // Ensure the theme is set for graph colors
    setTheme('dark');
  }, [setTheme]);

  useEffect(() => {
    if (!isClient || !user || !storageKey) {
        setLoading(false);
        return;
    };

    const loadInitialData = async () => {
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
            if(latestTimestamp === null) {
                setLoading(false);
                setError('No hay conversaciones para analizar. ¡Inicia un chat para generar tu perfil!');
            } else {
                fetchAndGenerateProfile();
            }
        }
    };
    loadInitialData();
  }, [storageKey, getLatestMessageTimestamp, fetchAndGenerateProfile, isClient, user]);

  const handleGenerateNew = () => {
    fetchAndGenerateProfile(true);
  };
  
  const handleViewCached = () => {
      setIsOutdated(false);
  };

  const lastConversationDate = cachedData?.lastMessageTimestamp
      ? format(new Date(cachedData.lastMessageTimestamp), "d 'de' MMMM 'de' yyyy", { locale: es })
      : null;


  if (!isClient || loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-semibold mb-4">Generando tu perfil...</h2>
          <p className="text-muted-foreground mb-8 text-center">La IA está analizando tu historial de conversaciones para crear un informe detallado.</p>
          <div className='w-full max-w-md space-y-4'>
            <Progress value={progress} className="w-full h-3" />
            <p className='text-center text-sm font-medium'>{Math.round(progress)}%</p>
          </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
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
             <Button onClick={handleGenerateNew} className="mt-4">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Intentar de nuevo
            </Button>
        </div>
    );
  }

  if (!profile) {
     return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
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
            <Button onClick={handleGenerateNew} className="mt-4">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Generar perfil ahora
            </Button>
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
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
                <p>Tu última conversación analizada es del {lastConversationDate}.</p>
                <div className="flex gap-2 flex-shrink-0">
                    <Button onClick={handleGenerateNew} size="sm">
                       <RefreshCcw className='mr-2 h-4 w-4'/>
                       Generar ahora
                    </Button>
                    <Button onClick={handleViewCached} variant="ghost" size="sm">Ver versión guardada</Button>
                </div>
            </AlertDescription>
          </Alert>
        )}

        <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">Perfil Psicológico de IA</h1>
            <p className="text-muted-foreground mt-2">
                Un análisis integral generado por IA basado en tu historial de conversaciones. 
                Recuerda, esto no reemplaza un diagnóstico profesional.
            </p>
        </header>

        <div className="space-y-6">

            {/* FASE 3: DINAMICA SUBYACENTE */}
            { (profile.coreArchetype || profile.coreConflict || profile.habitLoop) && (
              <Card className="border-accent/50 bg-accent/5">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-accent">Dinámica Subyacente</CardTitle>
                  <CardDescription>El motor de tus patrones de comportamiento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profile.coreArchetype && (
                    <Card>
                      <CardHeader>
                        <CardTitle className='flex items-center gap-3'><UserCheck className="w-6 h-6 text-accent"/> Arquetipo Central: {profile.coreArchetype.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className='prose prose-sm dark:prose-invert max-w-none text-foreground/80'>{profile.coreArchetype.description}</p>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold flex items-center gap-2"><Star className="w-4 h-4 text-green-400"/> Luces (Fortalezas)</h4>
                            <p className="text-sm text-muted-foreground mt-1">{profile.coreArchetype.strengths}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400"/> Sombras (Desafíos)</h4>
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
                      <CardContent>
                        <p className='text-lg font-medium text-center italic p-4 bg-background rounded-lg'>"{profile.coreConflict}"</p>
                      </CardContent>
                    </Card>
                  )}
                   {profile.habitLoop && (
                     <Card>
                      <CardHeader>
                        <CardTitle className='flex items-center gap-3'><Repeat className="w-6 h-6 text-accent"/> El Bucle del Hábito</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-start gap-3 p-3 bg-background/50 rounded-md">
                          <GitCommit className="w-5 h-5 text-red-400 mt-1 -rotate-90"/>
                          <div>
                            <h4 className="font-semibold">Disparador</h4>
                            <p className="text-sm text-muted-foreground">{profile.habitLoop.trigger}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-background/50 rounded-md">
                          <BrainCircuit className="w-5 h-5 text-amber-400 mt-1"/>
                           <div>
                            <h4 className="font-semibold">Pensamiento (Sesgo)</h4>
                            <p className="text-sm text-muted-foreground">{profile.habitLoop.thought}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-background/50 rounded-md">
                          <ShieldQuestion className="w-5 h-5 text-blue-400 mt-1"/>
                           <div>
                            <h4 className="font-semibold">Acción (Defensa)</h4>
                            <p className="text-sm text-muted-foreground">{profile.habitLoop.action}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-background/50 rounded-md">
                          <AlertTriangle className="w-5 h-5 text-purple-400 mt-1"/>
                           <div>
                            <h4 className="font-semibold">Resultado</h4>
                            <p className="text-sm text-muted-foreground">{profile.habitLoop.result}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}


            {/* FASE 1 Y 2: ITEMS EXISTENTES */}
            <Accordion type="multiple" defaultValue={['item-1']} className="w-full space-y-4">
                <AccordionItem value="item-1">
                    <Card>
                        <AccordionTrigger className="w-full text-left p-6 hover:no-underline [&>svg]:ml-auto">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <BrainCircuit className="w-6 h-6 text-accent"/>
                                Diagnóstico Descriptivo
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown className="text-foreground/80 whitespace-pre-wrap">{profile.diagnosis}</ReactMarkdown>
                            </CardContent>
                        </AccordionContent>
                    </Card>
                </AccordionItem>
                
                <AccordionItem value="item-2">
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
                
                <AccordionItem value="item-3">
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

                <AccordionItem value="item-4">
                    <Card>
                        <AccordionTrigger className="w-full text-left p-6 hover:no-underline [&>svg]:ml-auto">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <Filter className="w-6 h-6 text-accent"/>
                                Sesgos Cognitivos Potenciales
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent>
                            {profile.cognitiveBiases && profile.cognitiveBiases.length > 0 ? (
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
                
                <AccordionItem value="item-5">
                    <Card>
                        <AccordionTrigger className="w-full text-left p-6 hover:no-underline [&>svg]:ml-auto">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <ShieldQuestion className="w-6 h-6 text-accent"/>
                                Mecanismos de Defensa
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent>
                              {profile.defenseMechanisms && profile.defenseMechanisms.length > 0 ? (
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

                <AccordionItem value="item-6">
                    <Card>
                        <AccordionTrigger className="w-full text-left p-6 hover:no-underline [&>svg]:ml-auto">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <ListChecks className="w-6 h-6 text-accent"/>
                                Recomendaciones
                            </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                            <CardContent>
                              {profile.recommendations && profile.recommendations.length > 0 ? (
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
            
            {/* FASE DE DATOS VISUALES */}
             {profile.emotionalConstellation && profile.emotionalConstellation.nodes.length > 0 && isClient && (
              <EmotionalConstellation data={profile.emotionalConstellation} />
            )}

            {profile.emotionalJourney && profile.emotionalJourney.length > 0 && (
                <Card>
                    <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-xl">
                        <LineChart className="w-6 h-6 text-accent"/>
                        Evolución Emocional
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    {isClient && <EmotionalChart data={profile.emotionalJourney} />}
                    </CardContent>
                </Card>
            )}

        </div>
    </div>
  );
}
