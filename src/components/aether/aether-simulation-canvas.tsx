'use client';

import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame, type RootState } from '@react-three/fiber';
import { Stars, Text, Line, OrbitControls } from '@react-three/drei';
import type { AetherWorldState, AetherAgent } from '@/lib/types';
import * as THREE from 'three';
import ForceGraph2D from 'react-force-graph-2d';

const AGENT_COLOR = new THREE.Color('hsl(var(--primary))');
const SELECTED_AGENT_COLOR = new THREE.Color('hsl(var(--accent))');

function Agent({ agent, isSelected, onSelect }: { agent: AetherAgent; isSelected: boolean, onSelect: (id: string) => void }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useFrame((state, delta) => {
    // Optional: add some subtle movement
    if(meshRef.current){
        meshRef.current.position.y += Math.sin(state.clock.elapsedTime + agent.position.x) * 0.001;
    }
  });

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    onSelect(agent.id);
  }

  const color = isSelected ? SELECTED_AGENT_COLOR : AGENT_COLOR;

  return (
    <group position={[agent.position.x, agent.position.y, agent.position.z]}>
      <mesh ref={meshRef} onPointerDown={handlePointerDown}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isSelected ? 1 : 0.5} roughness={0.4} metalness={0.6} />
      </mesh>
      <Text
        position={[0, 2, 0]}
        fontSize={1.5}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="black"
      >
        {agent.name}
      </Text>
    </group>
  );
}

function World({ worldState, onSelectAgent }: { worldState: AetherWorldState | null; onSelectAgent: (id: string) => void; }) {
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null);

  const handleSelect = (id: string) => {
    setSelectedAgentId(id);
    onSelectAgent(id);
  }

  if (!worldState) return null;

  return (
    <>
      {worldState.agents.map((agent) => (
        <Agent key={agent.id} agent={agent} isSelected={agent.id === selectedAgentId} onSelect={handleSelect} />
      ))}
    </>
  );
}

export default function AetherSimulationCanvas({ worldState, onSelectAgent }: { worldState: AetherWorldState | null, onSelectAgent: (id: string) => void; }) {
  return (
    <Canvas camera={{ position: [0, 0, 80], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Suspense fallback={null}>
            <World worldState={worldState} onSelectAgent={onSelectAgent} />
        </Suspense>
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
  );
}
