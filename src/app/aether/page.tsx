'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Play, Pause, FastForward, Info, BrainCircuit, Users, Activity, ChevronLeft, Search, SlidersHorizontal, ChevronsRight } from 'lucide-react';
import { initializeAether, runAgentTurn, runSupervisorTurn } from '@/ai/flows/aether-flows';
import type { AetherWorldState, AetherAgent, AetherEvent } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// Dynamically import the 3D canvas component with SSR turned off. This is the definitive fix.
const AetherSimulationCanvas = dynamic(
  () => import('@/components/aether/aether-simulation-canvas'),
  { 
    ssr: false,
    loading: () => <div className="absolute inset-0 flex items-center justify-center bg-black"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }
);


// Controller Component (Safe for Server/Client, NO 3D rendering here)
function AetherController({ 
    onStateUpdate, 
    onLoadingChange,
    initialConcept
}: { 
    onStateUpdate: (state: AetherWorldState | null) => void, 
    onLoadingChange: (loading: boolean) => void,
    initialConcept: string
}) {
  const { user } = useAuth();
  const [localWorldState, setLocalWorldState] = useState<AetherWorldState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userConcept, setUserConcept] = useState(initialConcept);
  
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onLoadingChange(isLoading);
  }, [isLoading, onLoadingChange]);
  
  useEffect(() => {
    onStateUpdate(localWorldState);
  }, [localWorldState, onStateUpdate]);


  const handleInitialize = useCallback(async () => {
    if (!user) {
      setError("Debes iniciar sesión para empezar.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const initialState = await initializeAether({ userConcept });
      setLocalWorldState(initialState);
    } catch (e) {
      console.error(e);
      setError("Error al inicializar la simulación.");
      setLocalWorldState(null); // Ensure state is cleared on error
    } finally {
      setIsLoading(false);
    }
  }, [user, userConcept]);

  const runSimulationTick = useCallback(async () => {
    if (!localWorldState) return;

    let currentState = localWorldState;

    // 1. Run each agent's turn
    const agentPromises = currentState.agents.map(async (agent) => {
      const turnResult = await runAgentTurn({ agent, worldState: currentState });
      return {
        ...agent,
        thought: turnResult.thought,
        action: turnResult.action,
        status: turnResult.updatedStatus,
      };
    });

    const updatedAgents = await Promise.all(agentPromises);
    currentState = { ...currentState, agents: updatedAgents };

    // 2. Run supervisor's turn
    const supervisorResult = await runSupervisorTurn({ worldState: currentState });
    const newEventLog = [...currentState.eventLog];
    if (supervisorResult.newEvent) {
      newEventLog.push({ tick: currentState.tick + 1, description: supervisorResult.newEvent });
    }

    // 3. Update world state
    const nextState: AetherWorldState = {
      ...currentState,
      tick: currentState.tick + 1,
      eventLog: newEventLog,
      supervisorAnalysis: supervisorResult.supervisorAnalysis,
    };

    setLocalWorldState(nextState);

  }, [localWorldState]);

  useEffect(() => {
    if (isRunning) {
      tickIntervalRef.current = setInterval(runSimulationTick, 5000);
    } else {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    }
    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, [isRunning, runSimulationTick]);

  if (!localWorldState) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <BrainCircuit className="w-16 h-16 text-primary mb-4" />
        <h2 className="text-2xl font-bold">Bienvenido a Aether</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Un sandbox psicológico para visualizar y experimentar con los conceptos abstractos de tu mente.
        </p>
        <Card className="mt-8 w-full max-w-md text-left bg-background/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Search className="w-4 h-4"/>Concepto a Simular</CardTitle>
            </CardHeader>
            <CardContent>
                <input 
                    type="text"
                    value={userConcept}
                    onChange={(e) => setUserConcept(e.target.value)}
                    className="w-full bg-input text-foreground p-2 rounded-md border"
                    placeholder="Ej: Ansiedad Social, Culpa..."
                />
                <Button onClick={handleInitialize} disabled={isLoading || !userConcept} className="w-full mt-4">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
                  Materializar Mundo
                </Button>
            </CardContent>
        </Card>
        {error && <Alert variant="destructive" className="mt-4 max-w-md"><AlertDescription>{error}</AlertDescription></Alert>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/10 flex items-center justify-between gap-4 bg-black/50 backdrop-blur-sm">
        <h2 className="font-semibold text-lg truncate">Aether: {userConcept}</h2>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsRunning(!isRunning)} variant="secondary" size="sm">
            {isRunning ? <Pause className="mr-2" /> : <Play className="mr-2" />}
            {isRunning ? 'Pausar' : 'Iniciar'}
          </Button>
          <Button onClick={runSimulationTick} variant="outline" size="sm" disabled={isRunning}>
            <FastForward className="mr-2" />
            Siguiente Tick
          </Button>
        </div>
      </div>
       <div className="flex-1 text-center p-4 text-sm text-muted-foreground">
          Tick: <span className="font-bold text-foreground">{localWorldState.tick}</span> | {localWorldState.supervisorAnalysis}
      </div>
    </div>
  );
}


function AgentInfoPanel({ agent, worldState }: { agent: AetherAgent | null, worldState: AetherWorldState | null }) {
    if (!agent) return (
        <div className="p-6 text-center text-muted-foreground h-full flex flex-col items-center justify-center">
            <Users className="w-10 h-10 mb-4"/>
            <p>Selecciona un agente en la simulación para ver sus detalles.</p>
        </div>
    );

    return (
        <div className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-primary" />
                    {agent.name}
                </CardTitle>
                <CardDescription>{agent.archetype}</CardDescription>
            </CardHeader>
            <ScrollArea className="flex-grow">
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm">Estado Actual</h4>
                        <Badge variant="secondary" className="mt-1">{agent.status}</Badge>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm">Pensamiento Reciente</h4>
                        <p className="text-sm text-muted-foreground italic mt-1">"{agent.thought}"</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm">Última Acción</h4>
                        <p className="text-sm text-muted-foreground mt-1">{agent.action}</p>
                    </div>
                    <div className="pt-2">
                        <h4 className="font-semibold text-sm text-green-400">Objetivo Principal</h4>
                        <p className="text-sm text-muted-foreground">{agent.primaryGoal}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold text-sm text-red-400">Mayor Miedo</h4>
                        <p className="text-sm text-muted-foreground">{agent.greatestFear}</p>
                    </div>
                </CardContent>
            </ScrollArea>
        </div>
    )
}

// Main Page Component - Manages layout and state passing
export default function AetherPage() {
  const [worldState, setWorldState] = useState<AetherWorldState | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  const selectedAgent = worldState?.agents.find(a => a.id === selectedAgentId) || null;

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col">
       <header className="p-2 border-b border-white/10 flex items-center justify-between shrink-0">
          <Button asChild variant="ghost" className='text-muted-foreground hover:text-foreground'>
              <Link href="/">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Volver al Chat
              </Link>
          </Button>
          <h1 className="text-lg font-bold">Aether</h1>
           <Button variant="ghost" size="icon" onClick={() => setIsPanelOpen(!isPanelOpen)} className="text-muted-foreground hover:text-foreground">
             <SlidersHorizontal className="h-4 w-4" />
           </Button>
       </header>

      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 relative bg-black">
            <div className="absolute inset-0 z-0">
              {worldState && (
                <div key={worldState.tick} className="w-full h-full">
                  <AetherSimulationCanvas 
                      worldState={worldState} 
                      onSelectAgent={setSelectedAgentId} 
                  />
                </div>
              )}
            </div>
            <div className="absolute top-0 left-0 h-full w-full pointer-events-none">
                 <div className="h-full w-full pointer-events-auto">
                    <AetherController 
                      onStateUpdate={setWorldState} 
                      onLoadingChange={setIsLoading}
                      initialConcept="La Sombra del Miedo al Fracaso"
                    />
                 </div>
            </div>
        </main>
        
        <aside className={ `bg-black/80 backdrop-blur-md border-l border-white/10 transition-all duration-300 ${isPanelOpen ? 'w-full max-w-sm' : 'w-0'}` }>
            {isPanelOpen && (
              <div className="h-full flex flex-col">
                  <div className="p-4 border-b border-white/10 flex items-center justify-between">
                      <h3 className="font-semibold text-lg">Panel de Control</h3>
                      <Button variant="ghost" size="icon" onClick={() => setIsPanelOpen(false)} className="-mr-2">
                        <ChevronsRight className="w-5 h-5"/>
                      </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                      <AgentInfoPanel agent={selectedAgent} worldState={worldState} />
                  </div>
              </div>
            )}
        </aside>
      </div>
    </div>
  );
}
