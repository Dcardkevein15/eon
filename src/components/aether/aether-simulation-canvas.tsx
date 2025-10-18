'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Text, Line, OrbitControls, Cloud } from '@react-three/drei';
import type { AetherWorldState, AetherAgent } from '@/lib/types';
import * as THREE from 'three';

const AgentNode: React.FC<{ agent: AetherAgent; onClick: (agent: AetherAgent) => void }> = ({ agent, onClick }) => {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    if (ref.current) {
      // Smoothly move to target position
      const targetPosition = new THREE.Vector3(agent.position.x, agent.position.y, agent.position.z);
      ref.current.position.lerp(targetPosition, 0.1);
      
      const pulse = Math.sin(state.clock.elapsedTime * 2 + agent.position.x) * 0.1;
      ref.current.scale.set(1 + pulse, 1 + pulse, 1 + pulse);
    }
  });

  return (
    <group onClick={(e) => { e.stopPropagation(); onClick(agent); }}>
      <mesh ref={ref} position={[agent.position.x, agent.position.y, agent.position.z]}>
        <octahedronGeometry args={[0.5]} />
        <meshStandardMaterial color="hsl(var(--primary))" emissive="hsl(var(--primary))" emissiveIntensity={0.5} transparent opacity={0.8} />
      </mesh>
      <Text position={[agent.position.x, agent.position.y + 0.8, agent.position.z]} fontSize={0.2} color="white" anchorX="center" anchorY="middle">
        {agent.name}
      </Text>
      <Text position={[agent.position.x, agent.position.y - 0.8, agent.position.z]} fontSize={0.15} color="hsl(var(--accent))" anchorX="center" anchorY="middle" maxWidth={2}>
        {agent.thought}
      </Text>
    </group>
  );
};

interface AetherSimulationCanvasProps {
    worldState: AetherWorldState | null;
    onSelectAgent: (agent: AetherAgent) => void;
}

const AetherSimulationCanvas: React.FC<AetherSimulationCanvasProps> = ({ worldState, onSelectAgent }) => {
    return (
        <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Cloud position={[0, 0, -20]} speed={0.2} opacity={0.3} />
          
          {worldState && worldState.agents.map(agent => (
            <AgentNode key={agent.id} agent={agent} onClick={onSelectAgent} />
          ))}
          
          <OrbitControls enableZoom={true} enablePan={true} />
        </Canvas>
    );
};

export default AetherSimulationCanvas;
