'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Text, Line } from '@react-three/drei';
import type { AetherAgent, AetherWorldState, AetherEvent } from '@/lib/types';
import { initializeSimulation } from '@/ai/flows/initialize-simulation-flow';
import { runAgentTurn } from '@/ai/flows/run-agent-turn-flow';
import { runSupervisorTurn } from '@/ai/flows/run-supervisor-turn-flow';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, FastForward, Loader2, Bot, SlidersHorizontal, LogIn } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function AgentSphere({ agent, selectedAgentId, onSelect }: { agent: AetherAgent, selectedAgentId: string | null, onSelect: (id: string) => void }) {
  const isSelected = agent.id === selectedAgentId;
  return (
    <motion.mesh
      position={[agent.position.x, agent.position.y, agent.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(agent.id);
      }}
      whileHover={{ scale: 1.2 }}
      animate={{ scale: isSelected ? 1.3 : 1 }}
    >
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial color={isSelected ? 'hsl(var(--primary))' : '#999'} emissive={isSelected ? 'hsl(var(--primary))' : '#555'} emissiveIntensity={isSelected ? 1 : 0.5} metalness={0.8} roughness={0.2} />
    </motion.mesh>
  );
}

function InteractionLine({ source, target }: { source: [number, number, number], target: [number, number, number] }) {
  return (
    <Line
      points={[source, target]}
      color="hsl(var(--accent))"
      lineWidth={1}
      dashed
      dashScale={10}
      dashSize={3}
      gapSize={3}
    />
  );
}

export default function AetherPage() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [worldState, setWorldState] = useState<AetherWorldState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(2000); // ms per tick
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const [lastInteractions, setLastInteractions] = useState<{ sourceId: string; targetId: string }[]>([]);

  const handleInitialize = useCallback(async () => {
    setIsLoading(true);
    try {
      const initialState = await initializeSimulation();
      setWorldState(initialState);
      setLastInteractions([]);
    } catch (e) {
      console.error("Failed to initialize simulation", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      handleInitialize();
    }
  }, [user, handleInitialize]);

  const runSimulationCycle = useCallback(async () => {
    if (!worldState) return;

    let newWorldState = { ...worldState, agents: [...worldState.agents], tick: worldState.tick + 1 };
    const currentInteractions: { sourceId: string, targetId: string }[] = [];

    // Agent turns
    for (let i = 0; i < newWorldState.agents.length; i++) {
      const agent = newWorldState.agents[i];
      const { thought, action } = await runAgentTurn({ agent, worldState: newWorldState });
      
      const newAgentState = { ...agent, thought, lastAction: action };

      // Simple movement logic
      if (action.includes('Approach')) {
        const targetName = action.split('@')[1];
        const targetAgent = newWorldState.agents.find(a => a.name === targetName);
        if (targetAgent) {
          const dirX = targetAgent.position.x - agent.position.x;
          const dirY = targetAgent.position.y - agent.position.y;
          const dirZ = targetAgent.position.z - agent.position.z;
          const mag = Math.sqrt(dirX*dirX + dirY*dirY + dirZ*dirZ);
          if (mag > 5) {
             newAgentState.position = { x: agent.position.x + (dirX/mag)*5, y: agent.position.y + (dirY/mag)*5, z: agent.position.z + (dirZ/mag)*5 };
          }
          currentInteractions.push({ sourceId: agent.id, targetId: targetAgent.id });
        }
      } else if (action.includes('Move')) {
         newAgentState.position = { x: agent.position.x + (Math.random()-0.5)*5, y: agent.position.y + (Math.random()-0.5)*5, z: agent.position.z + (Math.random()-0.5)*5 };
      }

      newWorldState.agents[i] = newAgentState;
    }
    
    setLastInteractions(currentInteractions);

    // Supervisor turn
    if (newWorldState.tick % 5 === 0) {
      const supervisorResult = await runSupervisorTurn({ worldState: newWorldState });
      newWorldState.supervisorAnalysis = supervisorResult.analysis;
      if (supervisorResult.newEvent) {
        const eventWithTick = { ...supervisorResult.newEvent, tick: newWorldState.tick };
        newWorldState.eventLog = [eventWithTick, ...newWorldState.eventLog.slice(0, 9)];
      }
    }

    setWorldState(newWorldState);
  }, [worldState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating && worldState) {
      interval = setInterval(runSimulationCycle, simulationSpeed);
    }
    return () => clearInterval(interval);
  }, [isSimulating, worldState, runSimulationCycle, simulationSpeed]);

  const selectedAgent = worldState?.agents.find(a => a.id === selectedAgentId);

  if (authLoading) {
    return <div className="h-screen w-full flex items-center justify-center bg-black"><Loader2 className="h-10 w-10 animate-spin text-white" /></div>;
  }
  
  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white gap-4">
        <Bot className="w-16 h-16 text-primary"/>
        <h1 className="text-3xl font-bold">Bienvenido a Aether</h1>
        <p className="text-muted-foreground max-w-md text-center">Inicia sesión para comenzar la simulación de vida psicológica impulsada por IA.</p>
        <Button onClick={signInWithGoogle}><LogIn className="mr-2"/>Iniciar sesión con Google</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-white gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg">Iniciando el universo Aether...</p>
        </div>
    );
  }

  const interactionLines = lastInteractions.map(({ sourceId, targetId }) => {
    const sourceAgent = worldState?.agents.find(a => a.id === sourceId);
    const targetAgent = worldState?.agents.find(a => a.id === targetId);
    if (!sourceAgent || !targetAgent) return null;
    return {
      id: `${sourceId}-${targetId}`,
      source: [sourceAgent.position.x, sourceAgent.position.y, sourceAgent.position.z] as [number, number, number],
      target: [targetAgent.position.x, targetAgent.position.y, targetAgent.position.z] as [number, number, number],
    }
  }).filter(Boolean);

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-black text-white">
      <main className="flex-1 relative">
        <Canvas camera={{ position: [0, 0, 100], fov: 75 }}>
          <Suspense fallback={null}>
            <ambientLight intensity={0.2} />
            <pointLight position={[100, 100, 100]} intensity={2} />
            <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            {worldState?.agents.map(agent => (
              <AgentSphere key={agent.id} agent={agent} selectedAgentId={selectedAgentId} onSelect={setSelectedAgentId} />
            ))}
            <AnimatePresence>
                {interactionLines.map(line => line && (
                    <motion.group key={line.id} initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}>
                        <InteractionLine source={line.source} target={line.target} />
                    </motion.group>
                ))}
            </AnimatePresence>
            <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
          </Suspense>
        </Canvas>
        <div className="absolute top-4 left-4 flex gap-2 items-center">
            <h1 className="text-2xl font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">AETHER</h1>
            <Badge variant="outline" className="bg-black/50 backdrop-blur-sm">Tick: {worldState?.tick}</Badge>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm border border-gray-700">
            <Button variant="ghost" size="icon" onClick={() => setIsSimulating(!isSimulating)}>
                {isSimulating ? <Pause/> : <Play/>}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSimulationSpeed(prev => Math.max(500, prev / 1.5))}>
                <FastForward/>
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="ghost" size="icon" onClick={handleInitialize}><Loader2/></Button>
        </div>
      </main>

      <aside className="w-full md:w-96 h-1/3 md:h-full bg-black/50 backdrop-blur-sm border-l border-gray-800 flex flex-col p-4">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><SlidersHorizontal/> Panel de Control</h2>
        <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Bot className="text-primary"/>Análisis del Supervisor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground italic">
                      {worldState?.supervisorAnalysis || "Esperando análisis del primer ciclo..."}
                    </p>
                  </CardContent>
                </Card>

                {selectedAgent ? (
                    <Card className="bg-gray-900/50 border-gray-700">
                        <CardHeader>
                            <CardTitle className="text-lg">{selectedAgent.name}</CardTitle>
                            <CardDescription>{selectedAgent.archetype}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><strong className="text-primary">Acción:</strong> {selectedAgent.lastAction || "Ninguna"}</p>
                            <p><strong className="text-primary">Pensamiento:</strong> <span className="italic">"{selectedAgent.thought}"</span></p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">Selecciona un agente para ver sus detalles.</div>
                )}
                
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader><CardTitle className="text-lg">Registro de Eventos</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                        {worldState?.eventLog.map(event => (
                            <li key={event.tick + event.description}>
                                <Badge variant="secondary" className="mr-2">Tick {event.tick}</Badge>
                                <span>{event.description}</span>
                            </li>
                        ))}
                    </ul>
                  </CardContent>
                </Card>

              </div>
            </ScrollArea>
        </div>
      </aside>
    </div>
  );
}
