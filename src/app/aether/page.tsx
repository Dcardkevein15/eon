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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Pause, FastForward, Loader2, Bot, SlidersHorizontal, LogIn } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

function AgentNode({ agent, onSelect }: { agent: AetherAgent, onSelect: (id: string) => void }) {
    return (
        <group position={[agent.position.x, agent.position.y, agent.position.z]}>
            <Text
                position={[0, 2, 0]}
                fontSize={1.5}
                color="white"
                anchorX="center"
                anchorY="middle"
            >
                {agent.name}
            </Text>
            <mesh onClick={() => onSelect(agent.id)}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial emissive="hsl(var(--primary))" emissiveIntensity={2} toneMapped={false} />
            </mesh>
        </group>
    );
}

function AetherSimulation() {
  const [worldState, setWorldState] = useState<AetherWorldState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(5000); // ms per tick
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [interactionLines, setInteractionLines] = useState<[AetherAgent, AetherAgent][]>([]);

  const handleInitialize = useCallback(async () => {
    setIsLoading(true);
    try {
      const initialState = await initializeSimulation();
      setWorldState(initialState);
    } catch (e) {
      console.error("Failed to initialize simulation", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    handleInitialize();
  }, [handleInitialize]);

  const runSimulationCycle = useCallback(async () => {
    if (!worldState) return;

    let newWorldState = { ...worldState, agents: [...worldState.agents], tick: worldState.tick + 1 };
    let newInteractionLines: [AetherAgent, AetherAgent][] = [];

    // Agent turns
    for (let i = 0; i < newWorldState.agents.length; i++) {
      const agent = newWorldState.agents[i];
      const { thought, action } = await runAgentTurn({ agent, worldState: newWorldState });
      newWorldState.agents[i] = { ...agent, thought, lastAction: action };
      
      // Visualize interactions
      if(action.includes('@')) {
        const targetName = action.split('@')[1]?.trim();
        const targetAgent = newWorldState.agents.find(a => a.name === targetName);
        if(targetAgent) {
            newInteractionLines.push([agent, targetAgent]);
        }
      }
    }
    
    setInteractionLines(newInteractionLines);

    // Supervisor turn (every 5 ticks)
    if (newWorldState.tick > 0 && newWorldState.tick % 5 === 0) {
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

  if (isLoading) {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-black text-white gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-lg">Iniciando el universo Aether...</p>
        </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col md:flex-row bg-black text-white">
      <main className="flex-1 relative bg-black">
        <Canvas camera={{ position: [0, 0, 80], fov: 75 }}>
          <ambientLight intensity={0.2} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <Suspense fallback={null}>
            {worldState?.agents.map((agent) => (
                <AgentNode key={agent.id} agent={agent} onSelect={setSelectedAgentId} />
            ))}
            {interactionLines.map(([source, target], i) => (
                 <Line
                    key={i}
                    points={[[source.position.x, source.position.y, source.position.z], [target.position.x, target.position.y, target.position.z]]}
                    color="hsl(var(--accent))"
                    lineWidth={0.5}
                 />
            ))}
          </Suspense>

          <OrbitControls enableZoom={true} enablePan={true} />
        </Canvas>
        <div className="absolute top-4 left-4 flex gap-2 items-center">
            <h1 className="text-2xl font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">AETHER</h1>
            <Badge variant="outline" className="bg-black/50 backdrop-blur-sm">Tick: {worldState?.tick}</Badge>
        </div>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm border border-gray-700">
            <Button variant="ghost" size="icon" onClick={() => setIsSimulating(!isSimulating)}>
                {isSimulating ? <Pause/> : <Play/>}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSimulationSpeed(prev => Math.max(1000, prev / 1.5))}>
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
                    <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
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
                    </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">Selecciona un agente para ver sus detalles.</div>
                )}
                
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader><CardTitle className="text-lg">Registro de Eventos</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                        {worldState?.eventLog.map((event, index) => (
                            <li key={`${event.tick}-${index}`}>
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

export default function AetherPage() {
    const { user, loading: authLoading, signInWithGoogle } = useAuth();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient || authLoading) {
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
    
    return <AetherSimulation />;
}
