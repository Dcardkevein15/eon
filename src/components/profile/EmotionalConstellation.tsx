'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods>();
  const [graphDimensions, setGraphDimensions] = useState({ width: 0, height: 0 });
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    setIsClient(true);
    // Detect theme from DOM
    const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    setTheme(currentTheme);
  }, []);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      setGraphDimensions({
        width: containerRef.current.offsetWidth,
        height: 400, // Fixed height
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.5) return '#22c55e'; // Green 500
    if (sentiment > 0) return '#a3e635'; // Lime 500
    if (sentiment === 0) return theme === 'dark' ? '#64748b' : '#94a3b8'; // Slate 500 / 400
    if (sentiment < -0.5) return '#ef4444'; // Red 500
    return '#f97316'; // Orange 500
  };

  if (!isClient) {
    return <div ref={containerRef} style={{ height: '400px' }} />;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-xl">
          <BrainCircuit className="w-6 h-6 text-accent" />
          Constelador Emocional
        </CardTitle>
        <CardDescription>
          Una red de tus temas y emociones más recurrentes. El tamaño del círculo representa la importancia del tema. El color del enlace muestra el sentimiento de la conexión (verde para positivo, rojo para negativo).
        </CardDescription>
      </CardHeader>
      <CardContent ref={containerRef} className="p-0">
        <ForceGraph2D
          ref={graphRef}
          width={graphDimensions.width}
          height={graphDimensions.height}
          graphData={data}
          nodeLabel="id"
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.id as string;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            const nodeColor = theme === 'dark' ? '#e2e8f0' : '#0f172a'; // Slate 200 / 900
            const textColor = theme === 'dark' ? '#94a3b8' : '#475569'; // Slate 400 / 600

            ctx.fillStyle = nodeColor;
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, node.val / 2, 0, 2 * Math.PI, false);
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = textColor;
            ctx.fillText(label, node.x!, node.y!);
          }}
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={(link, ctx) => {
            if (!link.source || !link.target) return;
            const sentiment = (link as LinkObject).sentiment;
            
            ctx.beginPath();
            ctx.moveTo((link.source as NodeObject).x!, (link.source as NodeObject).y!);
            ctx.lineTo((link.target as NodeObject).x!, (link.target as NodeObject).y!);
            ctx.strokeStyle = getSentimentColor(sentiment);
            ctx.lineWidth = Math.abs(sentiment) * 2 + 0.5;
            ctx.stroke();
          }}
          cooldownTicks={100}
          onEngineStop={() => graphRef.current?.zoomToFit(200, 100)}
        />
      </CardContent>
    </Card>
  );
};

export default EmotionalConstellation;
