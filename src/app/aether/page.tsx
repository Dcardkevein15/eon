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

// Custom hook to sync state from localStorage
const useSyncState = <T>(key: string, initialState: T): [T, (value: T) => void] => {
  const [state, setState] = useState<T>(initialState);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setState(JSON.parse(item));
      }
    } catch (e) {
      console.error(`Error reading from localStorage key “${key}”:`, e);
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setState(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing storage change for key “${key}”:`, error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      isMounted.current = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key]);

  const setSyncState = (value: T) => {
    if (!isMounted.current) return;
    try {
      const valueToStore = JSON.stringify(value);
      window.localStorage.setItem(key, valueToStore);
      setState(value);
      // Manually dispatch a storage event for the current window to react
      window.dispatchEvent(new StorageEvent('storage', {
        key,
        newValue: valueToStore,
        oldValue: localStorage.getItem(key)
      }));
    } catch (error) {
      console.error(`Error setting localStorage key “${key}”:`, error);
    }
  }

  return [state, setSyncState];
};


const AetherInterface = () => {
  const [worldState, setWorldState] = useSyncState<AetherWorldState | null>('aether_world_state', null);
  const [simulationControls, setSimulationControls] = useSyncState('aether_simulation_controls', {
      isSimulating: false,
      tickSpeed: 3000,
      triggerInit: false,
  });

  const [selectedAgent, setSelectedAgent] = useState<AetherAgent | null>(null);

  const handleToggleSimulation = () => {
    setSimulationControls({ ...simulationControls, isSimulating: !simulationControls.isSimulating });
  };
  
  const handleSpeedChange = () => {
    const newSpeed = simulationControls.tickSpeed === 3000 ? 1500 : simulationControls.tickSpeed === 1500 ? 500 : 3000;
    setSimulationControls({ ...simulationControls, tickSpeed: newSpeed });
  };

  const handleRestart = () => {
    setSimulationControls({ ...simulationControls, triggerInit: true, isSimulating: false });
  }

  const getSpeedLabel = () => {
      if(simulationControls.tickSpeed === 3000) return '1x';
      if(simulationControls.tickSpeed === 1500) return '2x';
      return '4x';
  }

  useEffect(() => {
    if (worldState?.selectedAgentId) {
      const agent = worldState.agents.find(a => a.id === worldState.selectedAgentId);
      setSelectedAgent(agent || null);
    }
  }, [worldState?.selectedAgentId, worldState?.agents]);


  return (
    <div className="h-full w-full flex">
      <main className="flex-1 relative bg-black">
        <iframe
          src="/aether/simulation"
          title="Aether Simulation"
          className="w-full h-full border-none"
        />
      </main>

      <aside className="w-80 border-l border-border bg-background/50 backdrop-blur-sm flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold">Panel de Aether</h2>
          <p className="text-sm text-muted-foreground">Tick actual: {worldState?.tick ?? 0}</p>
        </div>
        <div className="p-4 flex gap-2 border-b border-border">
          <Button onClick={handleToggleSimulation} size="sm" className="flex-1">
            {simulationControls.isSimulating ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {simulationControls.isSimulating ? 'Pausar' : 'Iniciar'}
          </Button>
          <Button onClick={handleSpeedChange} size="sm" variant="outline" className="w-16">
            <FastForward className="mr-2 h-4 w-4" />
            {getSpeedLabel()}
          </Button>
          <Button onClick={handleRestart} size="sm" variant="destructive" className="w-10 p-0">
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
    // Clear localStorage on mount to ensure a fresh start
    localStorage.removeItem('aether_world_state');
    localStorage.removeItem('aether_simulation_controls');
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

  return <AetherInterface />;
}
