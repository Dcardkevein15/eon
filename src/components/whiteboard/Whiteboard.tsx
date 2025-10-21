
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { NodeObject, LinkObject } from 'react-force-graph-2d';
import type { WhiteboardState } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { BrainCircuit } from 'lucide-react';

interface MyNodeObject extends NodeObject {
  id: string;
  label: string;
  color?: string;
  val?: number; // Add val for node size
}

interface WhiteboardProps {
  state: WhiteboardState | null;
  isLoading: boolean;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ state, isLoading }) => {
  const fgRef = useRef<any>();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const graphData = useMemo(() => {
    if (!state) return { nodes: [], links: [] };
    // Assign a default value for 'val' if it doesn't exist, for sizing
    const nodes = state.nodes.map(n => ({ ...n, id: n.id || n.label, val: n.val || 8 }));
    return {
      nodes,
      links: state.links,
    };
  }, [state]);

  if (isLoading) {
    return <Skeleton className="w-full h-full" />;
  }

  if (!isClient) {
    return <Skeleton className="w-full h-full" />;
  }

  if (!state || (state.nodes.length === 0 && state.links.length === 0)) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 bg-background/50">
            <BrainCircuit className="w-12 h-12 text-primary/50 mb-4" />
            <h3 className="font-semibold text-lg text-foreground">Esta es tu Pizarra Colaborativa</h3>
            <p className="mt-2 max-w-sm">Dile a la IA qué quieres visualizar. Prueba con: <strong className="text-primary/80">"Crea un mapa mental sobre mis metas"</strong>.</p>
        </div>
    );
  }

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={graphData}
      nodeLabel="label"
      nodeVal="val"
      nodeColor={(node: any) => node.color || 'hsl(var(--primary))'}
      linkColor={() => 'hsl(var(--border))'}
      backgroundColor="hsl(var(--background))"
      cooldownTicks={100}
      onEngineStop={() => fgRef.current?.zoomToFit(400, 100)}
      nodeCanvasObjectMode={() => 'after'}
      nodeCanvasObject={(node: any, ctx, globalScale) => {
        const label = node.label;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        
        // Coordinates are guaranteed to be numbers here by the library's lifecycle
        const x = node.x ?? 0;
        const y = node.y ?? 0;

        // Determine text position based on node's horizontal position
        const canvasWidth = ctx.canvas.width;
        const textIsRight = x < canvasWidth / 2;
        ctx.textAlign = textIsRight ? 'left' : 'right';
        const textX = textIsRight ? x + (node.val || 5) + 3 : x - (node.val || 5) - 3;
        
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'hsl(var(--foreground))';
        ctx.fillText(label, textX, y);
      }}
    />
  );
};

export default Whiteboard;
