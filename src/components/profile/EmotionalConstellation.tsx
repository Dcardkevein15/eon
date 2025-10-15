'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { BrainCircuit } from 'lucide-react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

type NodeObject = {
  id: string;
  val: number;
  // Internal properties used by the graph
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
};

type LinkObject = {
  source: string;
  target: string;
  sentiment: number;
};

interface EmotionalConstellationProps {
  data: {
    nodes: NodeObject[];
    links: LinkObject[];
  };
}

const EmotionalConstellation: React.FC<EmotionalConstellationProps> = ({ data }) => {
  const [isClient, setIsClient] = useState(false);
  const graphRef = useRef<ForceGraphMethods>();
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setIsClient(true);
    // Detect theme from DOM
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(currentTheme);
  }, []);

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.5) return 'hsl(var(--chart-2))'; // Esmeralda
    if (sentiment > 0) return 'hsl(var(--chart-1))'; // Cian
    if (sentiment < -0.5) return 'hsl(var(--chart-4))'; // Rosa Cósmico
    return 'hsl(var(--chart-3))'; // Amatista
  };
  
  if (!isClient) {
    return <div style={{ height: '400px', width: '100%' }} />;
  }

  return (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          nodeLabel="id"
          nodeVal="val"
          nodeCanvasObjectMode={() => 'after'}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.id as string;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            const nodeColor = 'hsl(var(--primary))';
            const textColor = 'hsl(var(--foreground))';

            ctx.fillStyle = nodeColor;
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, node.val/1.5, 0, 2 * Math.PI, false);
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = textColor;
            ctx.fillText(label, node.x!, node.y!);
          }}
          linkCanvasObjectMode={() => 'before'}
          linkCanvasObject={(link, ctx) => {
            if (!link.source || !link.target) return;
            const sentiment = (link as LinkObject).sentiment;
            
            ctx.beginPath();
            ctx.moveTo((link.source as NodeObject).x!, (link.source as NodeObject).y!);
            ctx.lineTo((link.target as NodeObject).x!, (link.target as NodeObject).y!);
            ctx.strokeStyle = getSentimentColor(sentiment);
            ctx.lineWidth = Math.abs(sentiment) * 1.5 + 0.2;
            ctx.globalAlpha = 0.6;
            ctx.stroke();
          }}
          cooldownTicks={100}
          onEngineStop={() => graphRef.current?.zoomToFit(200, 100)}
          backgroundColor={"transparent"}
          enablePanInteraction={true}
          enableZoomInteraction={true}
        />
  );
};

export default EmotionalConstellation;
