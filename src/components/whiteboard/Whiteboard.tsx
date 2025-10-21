
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { ForceGraph2D } from 'react-force-graph-2d';
import type { NodeObject, LinkObject } from 'react-force-graph-2d';
import type { WhiteboardState } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { BrainCircuit } from 'lucide-react';

interface MyNodeObject extends NodeObject {
  id: string;
  label: string;
  color?: string;
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
    return {
      nodes: state.nodes.map(n => ({ ...n, id: n.id || n.label })),
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
      nodeColor={(node: any) => node.color || 'hsl(var(--primary))'}
      linkColor={() => 'hsl(var(--border))'}
      backgroundColor="hsl(var(--background))"
      cooldownTicks={100}
      onEngineStop={() => fgRef.current?.zoomToFit(400, 100)}
      nodeCanvasObject={(node: any, ctx, globalScale) => {
        const label = node.label;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        
        const textWidth = ctx.measureText(label).width;
        const bgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

        ctx.fillStyle = 'hsla(var(--background), 0.8)';
        ctx.fillRect(node.x - bgDimensions[0] / 2, node.y - bgDimensions[1] / 2, bgDimensions[0], bgDimensions[1]);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = node.color || 'hsl(var(--primary))';
        ctx.fillText(label, node.x, node.y);

        node.__bckgDimensions = bgDimensions; 
      }}
       nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.fillStyle = color;
          const bckgDimensions = node.__bckgDimensions;
          bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
        }}
    />
  );
};

export default Whiteboard;
