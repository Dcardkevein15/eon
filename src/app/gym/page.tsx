'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { SIMULATION_SCENARIOS } from '@/lib/placeholder-data';
import type { SimulationScenario } from '@/lib/types';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useCollection } from '@/firebase';
import { query } from 'firebase/firestore';
import type { Chat } from '@/lib/types';
import { useMemo } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SecurityRuleContext } from '@/firebase/errors';


export default function EmotionalGymPage() {
  const router = useRouter();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(null);
  
  const chatsQuery = useMemo(
    () =>
      user?.uid && firestore
        ? query(collection(firestore, `users/${user.uid}/chats`))
        : undefined,
    [user?.uid, firestore]
  );
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);

  const handleStartSimulation = async (scenario: SimulationScenario) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Debes iniciar sesión para empezar una simulación.',
      });
      return;
    }

    setIsCreating(true);
    setSelectedScenario(scenario);

    const sessionsCollectionRef = collection(firestore, `users/${user.uid}/gymSessions`);
    const newSessionData = {
      userId: user.uid,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      createdAt: serverTimestamp(),
      path: '', // This will be updated after creation
    };

    try {
      const newSessionRef = await addDoc(sessionsCollectionRef, newSessionData);
      const path = `/gym/${newSessionRef.id}`;
      
      // Update the document with its own path
      await updateDoc(newSessionRef, { path });

      router.push(path);
    } catch (serverError: any) {
      if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: sessionsCollectionRef.path,
          operation: 'create',
          requestResourceData: { ...newSessionData, createdAt: 'serverTimestamp' }
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      } else {
        console.error('Error creating simulation session:', serverError);
        toast({
          variant: 'destructive',
          title: 'Error al crear la sesión',
          description: 'No se pudo iniciar la simulación. Por favor, inténtalo de nuevo.',
        });
      }
      setIsCreating(false);
      setSelectedScenario(null);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar>
          <ChatSidebar
            chats={chats || []}
            activeChatId={''}
            isLoading={chatsLoading}
            removeChat={() => {}}
            clearChats={() => {}}
          />
        </Sidebar>
        <SidebarInset>
          <main className="flex-1 flex flex-col overflow-y-auto">
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b p-4 sm:p-6 z-10">
              <div className="flex items-center justify-between gap-4 max-w-5xl mx-auto">
                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="icon" className="-ml-2">
                    <Link href="/">
                      <ChevronLeft className="h-5 w-5" />
                    </Link>
                  </Button>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Gimnasio Emocional</h1>
                    <p className="text-muted-foreground text-sm mt-1">Practica conversaciones difíciles en un entorno seguro.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 flex-1">
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SIMULATION_SCENARIOS.map((scenario) => (
                  <Card key={scenario.id} className="flex flex-col hover:border-primary/50 hover:shadow-lg transition-all">
                    <CardHeader>
                      <CardTitle>{scenario.title}</CardTitle>
                      <CardDescription>{scenario.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow" />
                    <div className="p-6 pt-0">
                      <Button 
                        onClick={() => handleStartSimulation(scenario)} 
                        className="w-full"
                        disabled={isCreating}
                      >
                        {isCreating && selectedScenario?.id === scenario.id ? 'Iniciando...' : 'Empezar Práctica'}
                        {!isCreating && <ArrowRight className="ml-2 h-4 w-4" />}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
