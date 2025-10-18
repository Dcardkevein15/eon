'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Text, Line, OrbitControls, Cloud } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/firebase';
import { Loader2, Play, Pause, FastForward, SlidersHorizontal, Info, ChevronLeft } from 'lucide-react';
import { initializeSimulation, runAgentTurn, runSupervisorTurn } from '@/ai/flows/aether-flows';
import type { AetherWorldState, AetherAgent } from '@/lib/types';
import * as THREE from 'three';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// =================================================================
// 3D Components
// =================================================================
const AgentNode: React.FC<{ agent: AetherAgent, onClick: (agent: AetherAgent) => void }> = ({ agent, onClick }) => {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    if (ref.current) {
      // Subtle pulsing effect
      const pulse = Math.sin(state.clock.elapsedTime * 2 + agent.position.x) * 0.1;
      ref.current.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
    }
  });

  return (
    <group position={[agent.position.x, agent.position.y, agent.position.z]} onClick={() => onClick(agent)}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.5]} />
        <meshStandardMaterial color="hsl(var(--primary))" emissive="hsl(var(--primary))" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
      <Text position={[0, 0.8, 0]} fontSize={0.2} color="white" anchorX="center" anchorY="middle">
        {agent.name}
      </Text>
      <Text position={[0, -0.8, 0]} fontSize={0.15} color="hsl(var(--accent))" anchorX="center" anchorY="middle" maxWidth={2}>
        {agent.thought}
      </Text>
    </group>
  );
};

const InteractionLine: React.FC<{ from: AetherAgent, to: AetherAgent | undefined }> = ({ from, to }) => {
  if (!to) return null;
  const startVec = new THREE.Vector3(from.position.x, from.position.y, from.position.z);
  const endVec = new THREE.Vector3(to.position.x, to.position.y, to.position.z);

  return <Line points={[startVec, endVec]} color="hsl(var(--accent))" lineWidth={1} dashed dashScale={10} />;
};


// =================================================================
// Main Simulation Component
// =================================================================
const AetherSimulation = () => {
  const { user } = useAuth();
  const [worldState, setWorldState] = useState<AetherWorldState | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<AetherAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [tickSpeed, setTickSpeed] = useState(3000); // ms per tick

  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const interactionTargetAgent = worldState?.agents.find(a => worldState.eventLog[worldState.eventLog.length -1]?.description.includes(a.name));

  const runSimulationTick = useCallback(async () => {
    if (!worldState) return;

    let currentState = { ...worldState };
    const agentIndex = currentState.tick % currentState.agents.length;

    try {
      // Agent Turn
      if (agentIndex < currentState.agents.length) {
        const agent = currentState.agents[agentIndex];
        const agentResult = await runAgentTurn({ agent, worldState: currentState });
        currentState = agentResult;
      }
      
      // Supervisor Turn (every N ticks)
      if (currentState.tick % (currentState.agents.length) === 0 && currentState.tick > 0) {
        const supervisorResult = await runSupervisorTurn({ worldState: currentState });
        currentState = supervisorResult;
      }
      
      currentState.tick += 1;
      setWorldState(currentState);

    } catch (e: any) {
      console.error("Error during simulation tick:", e);
      setError(`Error en el tick ${currentState.tick}: ${e.message}`);
      setIsSimulating(false); // Stop simulation on error
    }
  }, [worldState]);


  useEffect(() => {
    const init = async () => {
      try {
        const initialState = await initializeSimulation({
          userId: user!.uid,
          userPrompt: 'Crear un pequeño ecosistema de 4 arquetipos psicológicos: el Héroe, la Sombra, el Trickster y el Sabio. Deben interactuar en un espacio abstracto.',
        });
        setWorldState(initialState);
      } catch (e: any) {
        setError(`Error al inicializar la simulación: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      init();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
  }, [isSimulating, runSimulationTick, tickSpeed]);

  const handleSpeedChange = () => {
    setTickSpeed(prev => (prev === 3000 ? 1500 : prev === 1500 ? 500 : 3000));
  };
  
  const getSpeedLabel = () => {
      if(tickSpeed === 3000) return '1x';
      if(tickSpeed === 1500) return '2x';
      return '4x';
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center text-center">
        <div>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg">Invocando el universo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertTitle>Error de Simulación</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!worldState) return null;

  return (
    <div className="h-full w-full flex">
      <main className="flex-1 relative">
        <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Cloud position={[0, 0, -20]} speed={0.2} opacity={0.3} />
          
          {worldState.agents.map(agent => (
            <AgentNode key={agent.id} agent={agent} onClick={setSelectedAgent} />
          ))}

          {worldState.agents.map(agent => (
             agent.lastAction.startsWith("Approaching") && <InteractionLine key={`${agent.id}-line`} from={agent} to={interactionTargetAgent} />
          ))}

          <OrbitControls enableZoom={true} enablePan={true} />
        </Canvas>
      </main>

      <aside className="w-80 border-l border-border bg-background/50 backdrop-blur-sm flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <h2 className="text-xl font-bold">Panel de Aether</h2>
          <p className="text-sm text-muted-foreground">Tick actual: {worldState.tick}</p>
        </div>
        <div className="p-4 flex gap-2 border-b border-border">
          <Button onClick={() => setIsSimulating(!isSimulating)} size="sm" className="flex-1">
            {isSimulating ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isSimulating ? 'Pausar' : 'Iniciar'}
          </Button>
          <Button onClick={handleSpeedChange} size="sm" variant="outline" className="w-16">
            <FastForward className="mr-2 h-4 w-4" />
            {getSpeedLabel()}
          </Button>
        </div>
        <ScrollArea className="flex-1">
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
        </ScrollArea>
      </aside>
    </div>
  );
};

// =================================================================
// Page Wrapper Component
// =================================================================
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

  return (
    <div className="h-screen w-screen bg-black">
      <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <AetherSimulation />
      </Suspense>
    </div>
  );
}