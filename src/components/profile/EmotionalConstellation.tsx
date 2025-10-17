'use client';

import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D, { NodeObject, LinkObject } from 'react-force-graph-2d';

interface MyNodeObject extends NodeObject {
  id: string;
  val: number;
}

interface MyLinkObject extends LinkObject {
  source: string;
  target: string;
  sentiment: number;
}

interface EmotionalConstellationProps {
  data: {
    nodes: MyNodeObject[];
    links: MyLinkObject[];
  };
}

const EmotionalConstellation: React.FC<EmotionalConstellationProps> = ({ data }) => {
  const [isClient, setIsClient] = useState(false);
  const fgRef = useRef<any>();

  useEffect(() => {
    setIsClient(true);
    // Center graph on initial load
    if (fgRef.current) {
        fgRef.current.zoomToFit(400);
    }
  }, []);

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.5) return 'hsl(var(--chart-2))'; // Positive
    if (sentiment > 0) return 'hsl(var(--chart-1))'; // Slightly Positive
    if (sentiment < -0.5) return 'hsl(var(--chart-4))'; // Very Negative
    return 'hsl(var(--chart-3))'; // Neutral/Slightly Negative
  };

  if (!isClient) {
    return <div style={{ height: '400px', width: '100%' }} />;
  }

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={data}
      nodeLabel="id"
      nodeVal="val"
      nodeColor={() => 'hsl(var(--primary))'}
      linkWidth={(link) => Math.abs((link as MyLinkObject).sentiment) * 1.5 + 0.2}
      linkColor={(link) => getSentimentColor((link as MyLinkObject).sentiment)}
      linkDirectionalParticles={1}
      linkDirectionalParticleWidth={1.5}
      linkDirectionalParticleColor={(link) => getSentimentColor((link as MyLinkObject).sentiment)}
      backgroundColor="transparent"
      cooldownTicks={100}
      onEngineStop={() => fgRef.current?.zoomToFit(400, 100)}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const label = node.id as string;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'hsl(var(--foreground))';
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const val = (node as MyNodeObject).val ?? 5;
        
        // Draw circle for node
        ctx.beginPath();
        ctx.arc(x, y, val / 2, 0, 2 * Math.PI, false);
        ctx.fillStyle = 'hsl(var(--primary))';
        ctx.fill();

        // Draw label
        ctx.fillText(label, x, y + (val/2) + 5);
      }}
    />
  );
};

export default EmotionalConstellation;
