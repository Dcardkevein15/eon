'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Text, Line, OrbitControls, Cloud } from '@react-three/drei';
import type { AetherWorldState, AetherAgent } from '@/lib/types';
import * as THREE from 'three';

// =================================================================
// 3D Components
// =================================================================
const AgentNode: React.FC<{ agent: AetherAgent, onClick: (agent: AetherAgent) => void, isSelected: boolean }> = ({ agent, onClick, isSelected }) => {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    if (ref.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2 + agent.position.x) * 0.1;
      const scale = isSelected ? 1.5 : 1;
      ref.current.scale.set(scale + pulse, scale + pulse, scale + pulse);
    }
  });

  return (
    <group position={[agent.position.x, agent.position.y, agent.position.z]} onClick={(e) => { e.stopPropagation(); onClick(agent); }}>
      <mesh ref={ref}>
        <octahedronGeometry args={[0.5]} />
        <meshStandardMaterial color={isSelected ? "hsl(var(--accent))" : "hsl(var(--primary))"} emissive={isSelected ? "hsl(var(--accent))" : "hsl(var(--primary))"} emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
      <Text position={[0, 0.8, 0]} fontSize={0.2} color="white" anchorX="center" anchorY="middle">
        {agent.name}
      </Text>
      {isSelected && (
        <Text position={[0, -0.8, 0]} fontSize={0.15} color="hsl(var(--accent))" anchorX="center" anchorY="middle" maxWidth={2}>
          {agent.thought}
        </Text>
      )}
    </group>
  );
};

const InteractionLine: React.FC<{ from: AetherAgent, to: AetherAgent | undefined }> = ({ from, to }) => {
  if (!to || !from || !to.position || !from.position) return null;
  const startVec = new THREE.Vector3(from.position.x, from.position.y, from.position.z);
  const endVec = new THREE.Vector3(to.position.x, to.position.y, to.position.z);

  return <Line points={[startVec, endVec]} color="hsl(var(--accent))" lineWidth={1} dashed dashScale={10} />;
};


interface AetherSimulationCanvasProps {
    worldState: AetherWorldState | null;
    onSelectAgent: (agent: AetherAgent) => void;
}

const AetherSimulation: React.FC<AetherSimulationCanvasProps> = ({ worldState, onSelectAgent }) => {
    if (!worldState) {
        return null;
    }

    const lastEvent = worldState.eventLog[worldState.eventLog.length - 1];
    const actingAgent = worldState.agents.find(a => lastEvent?.description.startsWith(`${a.name} `));
    let targetAgent;
    if (actingAgent && lastEvent) {
      const actionParts = lastEvent.description.split(' ');
      const targetName = actionParts[actionParts.length-1];
      targetAgent = worldState.agents.find(a => a.name === targetName);
    }
    
    return (
        <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Cloud position={[0, 0, -20]} speed={0.2} opacity={0.3} />
          
          {worldState.agents.map(agent => (
            <AgentNode 
              key={agent.id} 
              agent={agent} 
              onClick={onSelectAgent}
              isSelected={worldState.selectedAgentId === agent.id}
            />
          ))}
  
          {actingAgent && targetAgent && actingAgent.lastAction.includes(targetAgent.name) && (
            <InteractionLine key={`${actingAgent.id}-line`} from={actingAgent} to={targetAgent} />
          )}
  
          <OrbitControls enableZoom={true} enablePan={true} />
        </Canvas>
    );
};

export default AetherSimulation;
