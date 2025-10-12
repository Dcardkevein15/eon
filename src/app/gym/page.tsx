'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowRight, ChevronLeft, CheckCircle, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { SIMULATION_SCENARIOS } from '@/lib/placeholder-data';
import type { SimulationScenario, SimulationSession, Chat } from '@/lib/types';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SecurityRuleContext } from '@/firebase/errors';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export default function EmotionalGymPage() {
  const router = useRouter();
  const { user } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario | null>(null);

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
  const { data: gymSessions, loading: gymLoading } = useCollection<SimulationSession>(gymSessionsQuery);
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

  const getFormattedDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha desconocida';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

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
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 flex-1">
              <div className="max-w-5xl mx-auto space-y-12">
                
                {/* Continue Practice Section */}
                <div>
                  <h2 className="text-xl font-semibold tracking-tight mb-4">Continuar Práctica</h2>
                  {gymLoading ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                     </div>
                  ) : gymSessions && gymSessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {gymSessions.map((session) => (
                        <Card key={session.id} className="flex flex-col hover:border-primary/50 hover:shadow-lg transition-all">
                          <CardHeader>
                            <CardTitle className="truncate">{session.scenarioTitle}</CardTitle>
                            <CardDescription>{getFormattedDate(session.createdAt)}</CardDescription>
                          </CardHeader>
                          <CardContent className="flex-grow">
                             {session.completedAt && (
                                <div className='flex items-center text-sm text-green-400'>
                                   <CheckCircle className='w-4 h-4 mr-2'/>
                                   <span>Completado</span>
                                </div>
                             )}
                          </CardContent>
                          <CardFooter>
                            <Button asChild className="w-full">
                              <Link href={session.path}>
                                {session.completedAt ? 'Revisar Sesión' : 'Continuar Práctica'}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Link>
                            </Button>
                          </CardFooter>
                        </Card>
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
                      <Card key={scenario.id} className="flex flex-col hover:border-accent/50 hover:shadow-lg transition-all bg-card/50">
                        <CardHeader>
                          <CardTitle>{scenario.title}</CardTitle>
                          <CardDescription>{scenario.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow" />
                        <CardFooter>
                          <Button 
                            onClick={() => handleStartSimulation(scenario)} 
                            className="w-full"
                            variant="secondary"
                            disabled={isCreating}
                          >
                            {isCreating && selectedScenario?.id === scenario.id ? 'Iniciando...' : 'Empezar Práctica'}
                            {!(isCreating && selectedScenario?.id === scenario.id) && <ArrowRight className="ml-2 h-4 w-4" />}
                          </Button>
                        </CardFooter>
                      </Card>
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
