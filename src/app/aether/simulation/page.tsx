'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useFrame, type RootState } from '@react-three/fiber';
import { Stars, Text, Line, OrbitControls, Cloud } from '@react-three/drei';
import { useAuth } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { initializeSimulation, runAgentTurn, runSupervisorTurn } from '@/ai/flows/aether-flows';
import type { AetherWorldState, AetherAgent } from '@/lib/types';
import * as THREE from 'three';

// Custom hook to sync state to localStorage for the parent window
const useSyncStateToParent = <T,>(key: string, state: T) => {
    useEffect(() => {
        try {
            const valueToStore = JSON.stringify(state);
            window.localStorage.setItem(key, valueToStore);
            // Dispatch event so parent window can react to changes
            window.dispatchEvent(new StorageEvent('storage', { key, newValue: valueToStore }));
        } catch (error) {
            console.error(`Error writing to localStorage key “${key}”:`, error);
        }
    }, [key, state]);
};

// Custom hook to get controls from localStorage
const useSimulationControls = (key: string, initialState: any) => {
    const [controls, setControls] = useState(initialState);
    
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue) {
                try {
                    setControls(JSON.parse(e.newValue));
                } catch (error) {
                   console.error(`Error parsing storage change for key “${key}”:`, error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return controls;
};


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
    <group position={[agent.position.x, agent.position.y, agent.position.z]} onClick={(e) => { e.stopPropagation(); onClick(agent); }}>
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
  const [error, setError] = useState<string | null>(null);
  
  const simulationControls = useSimulationControls('aether_simulation_controls', {
      isSimulating: false,
      tickSpeed: 3000,
      triggerInit: false,
  });

  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state back to parent
  useSyncStateToParent('aether_world_state', worldState);

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
    }
  }, [worldState]);

  const initSimulation = useCallback(async () => {
    if (!user) return;
    setWorldState(null);
    setError(null);
    try {
        const initialState = await initializeSimulation({
          userId: user.uid,
          userPrompt: 'Crear un pequeño ecosistema de 4 arquetipos psicológicos: el Héroe, la Sombra, el Trickster y el Sabio. Deben interactuar en un espacio abstracto.',
        });
        setWorldState(initialState);
    } catch(e: any) {
        setError(`Error al inicializar la simulación: ${e.message}`);
    }
  }, [user]);

  useEffect(() => {
      initSimulation();
  }, [initSimulation]);

  useEffect(() => {
    if (simulationControls.triggerInit) {
        initSimulation();
    }
  }, [simulationControls.triggerInit, initSimulation])

  useEffect(() => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    if (simulationControls.isSimulating) {
      simulationIntervalRef.current = setInterval(runSimulationTick, simulationControls.tickSpeed);
    }
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [simulationControls.isSimulating, simulationControls.tickSpeed, runSimulationTick]);


  const handleAgentClick = (agent: AetherAgent) => {
    setWorldState(prevState => prevState ? { ...prevState, selectedAgentId: agent.id } : null);
  }

  if (!worldState) {
    return (
      <div className="flex h-full w-full items-center justify-center text-center text-white">
        <div>
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg">Invocando el universo...</p>
        </div>
      </div>
    );
  }

  if (error) {
      return <div className="flex h-full w-full items-center justify-center p-4 text-red-500">{error}</div>
  }

  return (
      <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Cloud position={[0, 0, -20]} speed={0.2} opacity={0.3} />
        
        {worldState.agents.map(agent => (
          <AgentNode key={agent.id} agent={agent} onClick={handleAgentClick} />
        ))}

        {worldState.agents.map(agent => (
           agent.lastAction.startsWith("Approaching") && <InteractionLine key={`${agent.id}-line`} from={agent} to={interactionTargetAgent} />
        ))}

        <OrbitControls enableZoom={true} enablePan={true} />
      </Canvas>
  );
};


// =================================================================
// Page Wrapper Component
// =================================================================
export default function SimulationPage() {
    return (
        <div className="h-screen w-screen bg-black">
          <Suspense fallback={<div className="flex h-full w-full items-center justify-center text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <AetherSimulation />
          </Suspense>
        </div>
    )
}
