'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { NodeObject, LinkObject } from 'react-force-graph-2d';

// --- Types ---
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
    nodes: { id: string, val: number }[];
    links: { source: string, target: string, sentiment: number }[];
  };
}

// --- Main Component ---
const EmotionalConstellation: React.FC<EmotionalConstellationProps> = ({ data }) => {
  const [isClient, setIsClient] = useState(false);
  const fgRef = useRef<any>();
  const [focusedNode, setFocusedNode] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const nodeColors = useMemo(() => {
    return ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F'];
  }, []);


  const graphData = useMemo(() => {
    if (!data || !data.nodes) return { nodes: [], links: [] };
    return { nodes: data.nodes, links: data.links };
  }, [data]);
  
  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return 'rgba(130, 202, 157, 0.8)'; // Greenish
    if (sentiment < -0.1) return 'rgba(255, 128, 66, 0.8)'; // Reddish
    return 'rgba(170, 170, 170, 0.6)'; // Neutral gray
  };

  const handleNodeClick = (node: NodeObject) => {
    const nodeId = node.id as string;
    if (focusedNode === nodeId) {
      setFocusedNode(null); // Unfocus if clicked again
      fgRef.current?.zoomToFit(400);
    } else {
      setFocusedNode(nodeId);
      fgRef.current?.centerAt(node.x, node.y, 500);
      fgRef.current?.zoom(4, 500);
    }
  };
  
  const handleBackgroundClick = () => {
    setFocusedNode(null);
    fgRef.current?.zoomToFit(400);
  }

  const nodeCanvasObject = (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const myNode = node as MyNodeObject;
    if (typeof myNode.x !== 'number' || typeof myNode.y !== 'number') return;
    const label = myNode.id;
    const color = nodeColors[(myNode.index || 0) % nodeColors.length];
    
    // Ensure radius is always a finite number
    const radius = Math.sqrt(Math.abs(myNode.val)) * 2.5;

    const isFocused = focusedNode === myNode.id;
    const isNeighbor = focusedNode && graphData.links.some(link => (link.source === myNode.id && link.target === focusedNode) || (link.target === myNode.id && link.source === focusedNode));
    const isDimmed = focusedNode !== null && !isFocused && !isNeighbor;

    // Create a radial gradient for a 3D/glowing effect
    const gradient = ctx.createRadialGradient(myNode.x!, myNode.y!, 0, myNode.x!, myNode.y!, radius);
    gradient.addColorStop(0, `${color}ff`);
    gradient.addColorStop(0.9, `${color}aa`);
    gradient.addColorStop(1, `${color}00`);

    // --- Draw Node ---
    ctx.beginPath();
    ctx.arc(myNode.x!, myNode.y!, radius, 0, 2 * Math.PI, false);
    
    const opacity = isDimmed ? 0.1 : 1;
    
    ctx.globalAlpha = opacity;
    ctx.fillStyle = gradient;
    ctx.fill();

    if(isFocused) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
    }


    // --- Draw Text ---
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(255, 255, 255, ${isDimmed ? 0.2 : 0.9})`;

    const words = label.split(' ');
    let line = '';
    const lines = [];
    const maxLineWidth = radius * 1.8;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxLineWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    const lineHeight = fontSize * 1.1;
    const startY = myNode.y! - (lines.length - 1) * lineHeight / 2;

    lines.forEach((l, i) => {
      ctx.fillText(l, myNode.x!, startY + i * lineHeight);
    });

    ctx.globalAlpha = 1; // Reset global alpha
  };
  
  if (!isClient) {
    return <div style={{ height: '400px', width: '100%' }} />;
  }

  return (
    <div className="w-full h-full rounded-lg bg-black/50 relative overflow-hidden">
        {/* Subtle animated background */}
        <div className="absolute inset-0 z-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle, hsl(var(--card)) 2%, transparent 70%)', backgroundSize: '20px 20px'}}></div>

        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          // --- Node Styling ---
          nodeCanvasObject={nodeCanvasObject}
          // --- Link Styling ---
          linkWidth={link => focusedNode && (link.source.id === focusedNode || link.target.id === focusedNode) ? 2.5 : 1}
          linkColor={(link) => {
            const isFocused = focusedNode && (link.source.id === focusedNode || link.target.id === focusedNode);
            const sentimentColor = getSentimentColor((link as MyLinkObject).sentiment);
            const alpha = isFocused ? '1.0' : '0.6';
            return sentimentColor.replace(/[\d\.]+\)$/, `${alpha})`);
          }}
          linkCurvature={0.1}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={link => focusedNode && (link.source.id === focusedNode || link.target.id === focusedNode) ? 3 : 0}
          linkDirectionalParticleSpeed={() => 0.006}
          // --- Physics & Interaction ---
          cooldownTicks={200}
          onEngineStop={() => fgRef.current?.zoomToFit(400, 100)}
          onNodeClick={handleNodeClick}
          onBackgroundClick={handleBackgroundClick}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          d3AlphaDecay={0.03}
          d3VelocityDecay={0.3}
        />
    </div>
  );
};

export default EmotionalConstellation;
