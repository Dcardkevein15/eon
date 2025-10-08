'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import type { Chat, Message } from '@/lib/types';
import { generateUserProfile } from '@/ai/flows/generate-user-profile';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BrainCircuit, UserCheck, ShieldCheck, ListChecks, ChevronLeft, Sparkles, Filter, ShieldQuestion, Info, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ProfileData = {
  diagnosis: string;
  personality: string;
  recommendations: string[];
  strengths: string;
  cognitiveBiases: string[];
  defenseMechanisms: string[];
};

type CachedProfile = {
  profile: ProfileData;
  lastMessageTimestamp: number; // Store as epoch time for easy comparison
};

export default function PsychologicalProfile() {
  const { user } = useAuth();
  const firestore = useFirestore();
  
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

    return lastMessageSnap.docs[0].data().timestamp.toMillis();
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
    setProgress(0);
    
    // Simulate progress for preloader
    const progressInterval = setInterval(() => {
        setProgress(prev => {
            if (prev >= 95) {
                clearInterval(progressInterval);
                return 95;
            }
            return prev + 5;
        });
    }, 500);

    try {
      const chatsQuery = query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'asc'));
      const chatsSnapshot = await getDocs(chatsQuery);
      const chats = chatsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));

      if (chats.length === 0) {
        setLoading(false);
        setGenerating(false);
        setError('No hay conversaciones para analizar. ¡Inicia un chat para generar tu perfil!');
        return;
      }
      setProgress(15);

      let fullChatHistory = '';
      let latestTimestamp = 0;
      for (const chat of chats) {
        fullChatHistory += `--- INICIO DEL CHAT: ${chat.title} ---\n`;
        const messagesQuery = query(collection(firestore, `users/${user.uid}/chats/${chat.id}/messages`), orderBy('timestamp', 'asc'));
        const messagesSnapshot = await getDocs(messagesQuery);
        const messages = messagesSnapshot.docs.map(doc => doc.data() as Message);
        
        messages.forEach(msg => {
          const role = msg.role === 'user' ? 'Usuario' : 'Asistente';
          fullChatHistory += `${role}: ${msg.content}\n`;
          const msgTimestamp = msg.timestamp.toMillis();
          if (msgTimestamp > latestTimestamp) {
            latestTimestamp = msgTimestamp;
          }
        });
        fullChatHistory += `--- FIN DEL CHAT ---\n\n`;
      }
      setProgress(50);

      if (!fullChatHistory.trim()) {
        setLoading(false);
        setGenerating(false);
        setError('Tus conversaciones están vacías. No se puede generar un perfil.');
        return;
      }
      
      const result = await generateUserProfile({ fullChatHistory });
      setProgress(90);

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
      setGenerating(false);
    }
  }, [user, firestore, storageKey]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient || !storageKey) {
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
            // If no cache, and no chats, show message. Otherwise, generate.
            if(latestTimestamp === null) {
                setLoading(false);
                setError('No hay conversaciones para analizar. ¡Inicia un chat para generar tu perfil!');
            } else {
                fetchAndGenerateProfile();
            }
        }
    };
    loadInitialData();
  }, [storageKey, getLatestMessageTimestamp, fetchAndGenerateProfile, isClient]);

  const handleGenerateNew = () => {
    fetchAndGenerateProfile(true);
  };
  
  const handleViewCached = () => {
      setIsOutdated(false); // User chose to view the old version, so hide banner for this session.
  };

  const lastConversationDate = cachedData?.lastMessageTimestamp
      ? format(new Date(cachedData.lastMessageTimestamp), "d 'de' MMMM 'de' yyyy", { locale: es })
      : null;


  if (loading || !isClient) {
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
        </div>
    );
  }

  if (!profile) {
    return null;
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

        <Accordion type="multiple" defaultValue={['item-1', 'item-6']} className="w-full space-y-4">
            <AccordionItem value="item-1">
                <Card>
                    <AccordionTrigger className="w-full text-left p-6 hover:no-underline [&>svg]:ml-auto">
                        <CardTitle className="flex items-center gap-3 text-xl">
                            <BrainCircuit className="w-6 h-6 text-accent"/>
                            Diagnóstico Descriptivo
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent>
                        <CardContent>
                             <p className="text-foreground/80 whitespace-pre-wrap">{profile.diagnosis}</p>
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
                        <CardContent>
                            <p className="text-foreground/80 whitespace-pre-wrap">{profile.personality}</p>
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
                        <CardContent>
                            <p className="text-foreground/80 whitespace-pre-wrap">{profile.strengths}</p>
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
                           <ul className="space-y-3">
                            {profile.cognitiveBiases.map((rec, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-1"/>
                                    <span className="text-foreground/80">{rec}</span>
                                </li>
                            ))}
                           </ul>
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
                           <ul className="space-y-3">
                            {profile.defenseMechanisms.map((rec, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1"/>
                                    <span className="text-foreground/80">{rec}</span>
                                </li>
                            ))}
                           </ul>
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
                           <ul className="space-y-3">
                            {profile.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start gap-3">
                                    <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0 mt-1"/>
                                    <span className="text-foreground/80">{rec}</span>
                                </li>
                            ))}
                           </ul>
                        </CardContent>
                    </AccordionContent>
                </Card>
            </AccordionItem>
        </Accordion>
    </div>
  );
}
