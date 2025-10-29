'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronLeft, Route } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, query, orderBy, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { SIMULATION_SCENARIOS } from '@/lib/placeholder-data';
import type { SimulationScenario, SimulationSession, Chat } from '@/lib/types';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SecurityRuleContext } from '@/firebase/errors';
import { Skeleton } from '@/components/ui/skeleton';
import SessionCard from '@/components/gym/session-card';
import { useTour } from '@/hooks/use-interactive-tour';

export default function EmotionalGymPage() {
  const router = useRouter();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(null);
  const { startTour } = useTour('gym');

  // --- Start Data Fetching ---
  const chatsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/chats`)) : undefined),
    [user?.uid, firestore]
  );
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);

  const gymSessionsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/gymSessions`), orderBy('createdAt', 'desc')) : undefined),
    [user?.uid, firestore]
  );
  const { data: gymSessions, loading: gymLoading, error } = useCollection<SimulationSession>(gymSessionsQuery);
  // --- End Data Fetching ---

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

    const now = Timestamp.now();
    const expirationTime = new Timestamp(now.seconds + 24 * 60 * 60, now.nanoseconds);

    const sessionsCollectionRef = collection(firestore, `users/${user.uid}/gymSessions`);
    const newSessionData = {
      userId: user.uid,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      createdAt: now,
      expiresAt: expirationTime,
      path: '', // This will be updated after creation
    };

    try {
      const newSessionRef = await addDoc(sessionsCollectionRef, newSessionData);
      const path = `/gym/${newSessionRef.id}`;
      await updateDoc(newSessionRef, { path });
      router.push(path);
    } catch (serverError: any) {
      if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: sessionsCollectionRef.path,
          operation: 'create',
          requestResourceData: { ...newSessionData, createdAt: 'serverTimestamp' },
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
  
  const removeSession = useCallback(async (sessionId: string) => {
    if (!user?.uid || !firestore) return;
    const sessionRef = doc(firestore, `users/${user.uid}/gymSessions`, sessionId);
    try {
        await deleteDoc(sessionRef);
    } catch (serverError: any) {
         if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: sessionRef.path,
              operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error('Error deleting session:', serverError);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo eliminar la sesión.'
            });
        }
    }
}, [user?.uid, firestore, toast]);

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar>
          <ChatSidebar chats={chats || []} activeChatId={''} isLoading={chatsLoading} removeChat={() => {}} clearChats={() => {}} />
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
                 <Button variant="ghost" size="icon" onClick={startTour}>
                    <Route className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Iniciar Recorrido</span>
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 flex-1">
              <div className="max-w-5xl mx-auto space-y-12">
                
                {/* Continue Practice Section */}
                <div>
                  <h2 className="text-xl font-semibold tracking-tight mb-4">Continuar Práctica</h2>
                  {gymLoading ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                     </div>
                  ) : gymSessions && gymSessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {gymSessions.map((session) => (
                        <SessionCard 
                            key={session.id} 
                            session={session} 
                            onDelete={removeSession} 
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Aún no has iniciado ninguna práctica. ¡Empieza una nueva simulación abajo!</p>
                  )}
                </div>

                {/* Start New Simulation Section */}
                <div>
                   <h2 className="text-xl font-semibold tracking-tight mb-4">Empezar Nueva Simulación</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {SIMULATION_SCENARIOS.map((scenario) => (
                      <div key={scenario.id} className="flex flex-col border rounded-lg overflow-hidden bg-card/50 hover:border-accent/50 hover:shadow-lg transition-all">
                        <div className="p-6">
                          <h3 className="font-semibold">{scenario.title}</h3>
                          <p className="text-sm text-muted-foreground mt-2">{scenario.description}</p>
                        </div>
                        <div className="p-6 pt-0 mt-auto">
                          <Button 
                            onClick={() => handleStartSimulation(scenario)} 
                            className="w-full"
                            variant="secondary"
                            disabled={isCreating}
                          >
                            {isCreating && selectedScenario?.id === scenario.id ? 'Iniciando...' : 'Empezar Práctica'}
                            {!(isCreating && selectedScenario?.id === scenario.id) && <ArrowRight className="ml-2 h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
