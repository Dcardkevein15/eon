'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/firebase';
import { Loader2, Play, Pause, FastForward, SlidersHorizontal, Info, ChevronLeft, RefreshCcw } from 'lucide-react';
import type { AetherWorldState, AetherAgent } from '@/lib/types';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { initializeSimulation, runAgentTurn, runSupervisorTurn } from '@/ai/flows/aether-flows';
import dynamic from 'next/dynamic';

const AetherSimulationCanvas = dynamic(() => import('@/components/aether/aether-simulation'), {
  ssr: false,
  loading: () => (
      <div className="flex h-full w-full items-center justify-center text-center text-white">
        <div>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg">Invocando el universo...</p>
        </div>
      </div>
  )
});


const AetherSimulation = () => {
    const { user } = useAuth();
    const [worldState, setWorldState] = useState<AetherWorldState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [tickSpeed, setTickSpeed] = useState(3000);
    const [selectedAgent, setSelectedAgent] = useState<AetherAgent | null>(null);
    const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
    const runSimulationTick = useCallback(async () => {
      if (!worldState) return;
  
      let currentState = { ...worldState };
      const agentIndex = currentState.tick % currentState.agents.length;
  
      try {
        if (agentIndex < currentState.agents.length) {
          const agent = currentState.agents[agentIndex];
          const agentResult = await runAgentTurn({ agent, worldState: currentState });
          currentState = agentResult;
        }
        
        if (currentState.tick > 0 && currentState.tick % currentState.agents.length === 0) {
          const supervisorResult = await runSupervisorTurn({ worldState: currentState });
          currentState = supervisorResult;
        }
        
        currentState.tick += 1;
        setWorldState(currentState);
  
      } catch (e: any) {
        console.error("Error during simulation tick:", e);
        setError(`Error en el tick ${currentState.tick}: ${e.message}`);
        setIsSimulating(false);
      }
    }, [worldState]);
  
    const initSimulation = useCallback(async (force = false) => {
      if (!user || (worldState && !force)) return;

      setWorldState(null);
      setError(null);
      setIsSimulating(false);

      try {
          const initialState = await initializeSimulation({
            userId: user.uid,
            userPrompt: 'Crear un pequeño ecosistema de 4 arquetipos psicológicos: el Héroe, la Sombra, el Trickster y el Sabio. Deben interactuar en un espacio abstracto.',
          });
          setWorldState(initialState);
      } catch(e: any) {
          console.error(`Error al inicializar la simulación: ${e.message}`)
          setError(`Error al inicializar la simulación: ${e.message}`);
      }
    }, [user, worldState]);
  
    useEffect(() => {
        initSimulation();
    }, [initSimulation]);
  
    useEffect(() => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
      if (isSimulating) {
        simulationIntervalRef.current = setInterval(runSimulationTick, tickSpeed);
      }
      return () => {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current);
        }
      };
    }, [isSimulating, tickSpeed, runSimulationTick]);
  
    const handleToggleSimulation = () => setIsSimulating(!isSimulating);
    const handleSpeedChange = () => setTickSpeed(prev => prev === 3000 ? 1500 : prev === 1500 ? 500 : 3000);
    const getSpeedLabel = () => tickSpeed === 3000 ? '1x' : tickSpeed === 1500 ? '2x' : '4x';
  
    useEffect(() => {
        if (worldState?.selectedAgentId) {
            const agent = worldState.agents.find(a => a.id === worldState.selectedAgentId);
            setSelectedAgent(agent || null);
        } else {
            setSelectedAgent(null);
        }
    }, [worldState]);

    const handleSelectAgent = (agent: AetherAgent) => {
        setWorldState(prev => prev ? { ...prev, selectedAgentId: agent.id } : null);
    };

    if (error) {
        return <div className="flex h-full w-full items-center justify-center p-4 text-red-500">{error}</div>
    }

    return (
      <div className="h-full w-full flex">
        <main className="flex-1 relative bg-black">
            <AetherSimulationCanvas 
                worldState={worldState} 
                onSelectAgent={handleSelectAgent} 
            />
        </main>
  
        <aside className="w-80 border-l border-border bg-background/50 backdrop-blur-sm flex flex-col h-full">
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-bold">Panel de Aether</h2>
            <p className="text-sm text-muted-foreground">Tick actual: {worldState?.tick ?? 0}</p>
          </div>
          <div className="p-4 flex gap-2 border-b border-border">
            <Button onClick={handleToggleSimulation} size="sm" className="flex-1">
              {isSimulating ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isSimulating ? 'Pausar' : 'Iniciar'}
            </Button>
            <Button onClick={handleSpeedChange} size="sm" variant="outline" className="w-16">
              <FastForward className="mr-2 h-4 w-4" />
              {getSpeedLabel()}
            </Button>
            <Button onClick={() => initSimulation(true)} size="sm" variant="destructive" className="w-10 p-0">
               <RefreshCcw className="h-4 w-4"/>
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {!worldState ? (
               <div className="p-4 space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-48 w-full" />
               </div>
            ) : (
              <div className="p-4 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-primary" />
                      Análisis del Supervisor
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {worldState.supervisorAnalysis || "Esperando análisis..."}
                  </CardContent>
                </Card>
  
                {selectedAgent && (
                  <Card className="bg-card/80">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Info className="w-4 h-4 text-accent" />
                        Agente: {selectedAgent.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      <p><strong>Arquetipo:</strong> {selectedAgent.archetype}</p>
                      <p><strong>Última Acción:</strong> {selectedAgent.lastAction}</p>
                      <p><strong>Pensamiento:</strong> "{selectedAgent.thought}"</p>
                    </CardContent>
                  </Card>
                )}
  
                 <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Registro de Eventos</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs space-y-2">
                    {worldState.eventLog.slice(-10).reverse().map((event, i) => (
                      <p key={i} className="text-muted-foreground">
                        <span className="font-semibold text-foreground/80">[Tick {event.tick}]</span> {event.description}
                      </p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </ScrollArea>
        </aside>
      </div>
    );
};

export default function AetherPage() {
  const { user, loading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return (
        <div className="flex flex-col h-screen">
         <header className="flex h-14 items-center p-4 border-b">
             <Button asChild variant="ghost" className='-ml-2'>
                <Link href="/">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Volver
                </Link>
            </Button>
         </header>
         <div className="flex-1 flex items-center justify-center p-4">
            <Alert className="max-w-md">
                <AlertTitle>Acceso Denegado</AlertTitle>
                <AlertDescription>Debes iniciar sesión para acceder al universo Aether.</AlertDescription>
            </Alert>
         </div>
       </div>
    );
  }

  return <AetherSimulation />;
}
