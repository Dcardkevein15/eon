'use client';

import { useState, useEffect } from 'react';
import { useAuth, useFirestore } from '@/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { Chat, Message } from '@/lib/types';
import { generateUserProfile } from '@/ai/flows/generate-user-profile';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BrainCircuit, UserCheck, ShieldCheck, ListChecks, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

type ProfileData = {
  diagnosis: string;
  personality: string;
  recommendations: string[];
};

export default function PsychologicalProfile() {
  const { user } = useAuth();
  const firestore = useFirestore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistoryAndGenerateProfile = async () => {
      if (!user || !firestore) {
        setLoading(false);
        setError('Debes iniciar sesión para ver tu perfil.');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Fetch all chats
        const chatsQuery = query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'asc'));
        const chatsSnapshot = await getDocs(chatsQuery);
        const chats = chatsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));

        if (chats.length === 0) {
          setLoading(false);
          setError('No hay conversaciones para analizar. ¡Inicia un chat para generar tu perfil!');
          return;
        }

        // 2. Fetch all messages from all chats
        let fullChatHistory = '';
        for (const chat of chats) {
          fullChatHistory += `--- INICIO DEL CHAT: ${chat.title} ---\n`;
          const messagesQuery = query(collection(firestore, `users/${user.uid}/chats/${chat.id}/messages`), orderBy('timestamp', 'asc'));
          const messagesSnapshot = await getDocs(messagesQuery);
          const messages = messagesSnapshot.docs.map(doc => doc.data() as Message);
          
          messages.forEach(msg => {
            const role = msg.role === 'user' ? 'Usuario' : 'Asistente';
            fullChatHistory += `${role}: ${msg.content}\n`;
          });
          fullChatHistory += `--- FIN DEL CHAT ---\n\n`;
        }

        if (!fullChatHistory.trim()) {
           setLoading(false);
           setError('Tus conversaciones están vacías. No se puede generar un perfil.');
           return;
        }
        
        // 3. Generate profile
        const result = await generateUserProfile({ fullChatHistory });
        setProfile(result);

      } catch (e) {
        console.error('Error generating psychological profile:', e);
        setError('Ocurrió un error al generar tu perfil. Por favor, inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistoryAndGenerateProfile();
  }, [user, firestore]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
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

        <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">Perfil Psicológico de IA</h1>
            <p className="text-muted-foreground mt-2">
                Un análisis integral generado por IA basado en tu historial de conversaciones. 
                Recuerda, esto no reemplaza un diagnóstico profesional.
            </p>
        </header>

        <Accordion type="single" collapsible defaultValue="item-1" className="w-full space-y-4">
            <AccordionItem value="item-1">
                <Card>
                    <CardHeader>
                        <AccordionTrigger className="w-full text-left p-0 hover:no-underline">
                             <CardTitle className="flex items-center gap-3 text-xl">
                                <BrainCircuit className="w-6 h-6 text-accent"/>
                                Diagnóstico Descriptivo
                            </CardTitle>
                        </AccordionTrigger>
                    </CardHeader>
                    <AccordionContent>
                        <CardContent>
                             <p className="text-foreground/80 whitespace-pre-wrap">{profile.diagnosis}</p>
                        </CardContent>
                    </AccordionContent>
                </Card>
            </AccordionItem>

            <AccordionItem value="item-2">
                 <Card>
                    <CardHeader>
                        <AccordionTrigger className="w-full text-left p-0 hover:no-underline">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <UserCheck className="w-6 h-6 text-accent"/>
                                Caracterización de la Personalidad
                            </CardTitle>
                        </AccordionTrigger>
                    </CardHeader>
                    <AccordionContent>
                        <CardContent>
                            <p className="text-foreground/80 whitespace-pre-wrap">{profile.personality}</p>
                        </CardContent>
                    </AccordionContent>
                </Card>
            </AccordionItem>

            <AccordionItem value="item-3">
                 <Card>
                    <CardHeader>
                        <AccordionTrigger className="w-full text-left p-0 hover:no-underline">
                             <CardTitle className="flex items-center gap-3 text-xl">
                                <ListChecks className="w-6 h-6 text-accent"/>
                                Recomendaciones
                            </CardTitle>
                        </AccordionTrigger>
                    </CardHeader>
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
