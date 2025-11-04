'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D, { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-2d';
import { Button } from '@/components/ui/button';
import { Orbit, Sparkles, ZapOff, Play, Plus, Minus, Search } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
  const fgRef = useRef<ForceGraphMethods>();
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [isPhysicsActive, setIsPhysicsActive] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Delay the animation start slightly to ensure canvas is ready
    setTimeout(() => {
      setHasLoaded(true);
      fgRef.current?.d3ReheatSimulation();
    }, 500);
  }, []);

  const nodeColors = useMemo(() => {
    return ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F'];
  }, []);

  const filteredData = useMemo(() => {
    if (sentimentFilter === 'all') {
      return data;
    }
    const filteredLinks = data.links.filter(link => 
      sentimentFilter === 'positive' ? link.sentiment > 0.1 : link.sentiment < -0.1
    );
    const visibleNodeIds = new Set(filteredLinks.flatMap(link => [link.source, link.target]));
    const filteredNodes = data.nodes.filter(node => visibleNodeIds.has(node.id as string));

    return { nodes: filteredNodes, links: filteredLinks };
  }, [data, sentimentFilter]);

  const handleNodeClick = useCallback((node: NodeObject) => {
    const nodeId = node.id as string;
    if (focusedNode === nodeId) {
      setFocusedNode(null);
      fgRef.current?.zoomToFit(400);
    } else {
      setFocusedNode(nodeId);
      fgRef.current?.centerAt(node.x, node.y, 500);
      fgRef.current?.zoom(4, 500);
    }
  }, [focusedNode]);

  const handleBackgroundClick = useCallback(() => {
    if (focusedNode) {
      setFocusedNode(null);
      fgRef.current?.zoomToFit(400);
    }
  }, [focusedNode]);

  const togglePhysics = () => {
    setIsPhysicsActive(prev => {
      const next = !prev;
      if (next) {
        fgRef.current?.d3ReheatSimulation();
      } else {
        fgRef.current?.d3AlphaTarget(0);
      }
      return next;
    });
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.1) return 'rgba(130, 202, 157, 0.8)'; // Greenish (chart-1)
    if (sentiment < -0.1) return 'rgba(255, 128, 66, 0.8)'; // Reddish (chart-4)
    return 'rgba(170, 170, 170, 0.6)'; // Neutral gray
  };

  const nodeCanvasObject = (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const myNode = node as MyNodeObject;
    if (typeof myNode.x !== 'number' || typeof myNode.y !== 'number') return;
    const label = myNode.id;
    const color = nodeColors[(myNode.index || 0) % nodeColors.length];
    const radius = Math.sqrt(Math.abs(myNode.val)) * 2.5;

    const isFocused = focusedNode === myNode.id;
    const isNeighbor = focusedNode && filteredData.links.some(link => (link.source === myNode.id && link.target === focusedNode) || (link.target === myNode.id && link.source === focusedNode));
    const isDimmed = focusedNode !== null && !isFocused && !isNeighbor;
    
    // --- Draw Node ---
    ctx.beginPath();
    ctx.arc(myNode.x!, myNode.y!, radius, 0, 2 * Math.PI, false);
    
    const opacity = isDimmed ? 0.1 : 1;
    ctx.globalAlpha = opacity;
    
    const gradient = ctx.createRadialGradient(myNode.x!, myNode.y!, 0, myNode.x!, myNode.y!, radius);
    gradient.addColorStop(0, `${color}ff`);
    gradient.addColorStop(0.9, `${color}aa`);
    gradient.addColorStop(1, `${color}00`);
    ctx.fillStyle = gradient;
    ctx.fill();

    if(isFocused) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
    }
    
    // --- Draw Text ---
    const fontSize = Math.min(14, radius / 2) / globalScale;
    if (fontSize > 1.5) { // Don't draw text if too small
      ctx.font = `bold ${fontSize}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255, 255, 255, ${isDimmed ? 0.2 : 0.9})`;

      const words = label.split('/');
      const lineHeight = fontSize * 1.1;
      const startY = myNode.y! - (words.length - 1) * lineHeight / 2;

      words.forEach((word, i) => {
        ctx.fillText(word, myNode.x!, startY + i * lineHeight);
      });
    }

    ctx.globalAlpha = 1; // Reset global alpha
  };
  
  if (!isClient) {
    return <div style={{ height: '400px', width: '100%' }} />;
  }

  return (
    <div className="w-full h-full rounded-lg bg-background relative overflow-hidden border border-border/50">
        <div className="absolute top-2 left-2 z-10 space-y-2">
            <div className="flex items-center space-x-2 p-1.5 rounded-full bg-card/80 border border-border/50">
                <Label htmlFor="physics-switch" className="text-xs font-medium pl-2">Física</Label>
                <Switch
                    id="physics-switch"
                    checked={isPhysicsActive}
                    onCheckedChange={togglePhysics}
                    thumbIcon={isPhysicsActive ? <Play className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
                />
            </div>
             <div className="flex items-center p-1.5 rounded-full bg-card/80 border border-border/50">
                <Button variant={sentimentFilter === 'all' ? 'secondary' : 'ghost'} size="sm" className="h-7 rounded-full px-3" onClick={() => setSentimentFilter('all')}>Todo</Button>
                <Button variant={sentimentFilter === 'positive' ? 'secondary' : 'ghost'} size="sm" className="h-7 rounded-full px-3 text-green-400" onClick={() => setSentimentFilter('positive')}>Positivo</Button>
                <Button variant={sentimentFilter === 'negative' ? 'secondary' : 'ghost'} size="sm" className="h-7 rounded-full px-3 text-red-400" onClick={() => setSentimentFilter('negative')}>Negativo</Button>
            </div>
        </div>
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end space-y-2">
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 border" onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 1.2)}><Plus className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 border" onClick={() => fgRef.current?.zoom(fgRef.current.zoom() * 0.8)}><Minus className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 bg-card/80 border" onClick={() => fgRef.current?.zoomToFit(400)}><Search className="h-4 w-4" /></Button>
        </div>
        
        <ForceGraph2D
            ref={fgRef}
            graphData={filteredData}
            nodeCanvasObject={nodeCanvasObject}
            linkWidth={link => focusedNode && (link.source.id === focusedNode || link.target.id === focusedNode) ? 2.5 : 1}
            linkColor={(link) => {
              const myLink = link as MyLinkObject;
              const isFocused = focusedNode && (myLink.source === focusedNode || myLink.target === focusedNode);
              const color = getSentimentColor(myLink.sentiment);
              return isFocused ? color.replace(/[\d\.]+\)$/, `1.0)`) : color;
            }}
            linkCurvature={0.1}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={link => focusedNode && (link.source.id === focusedNode || link.target.id === focusedNode) ? 3 : 0}
            linkDirectionalParticleSpeed={() => 0.006}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            cooldownTicks={isPhysicsActive ? 100 : Infinity}
            d3AlphaDecay={hasLoaded ? 0.0228 : 1}
            d3VelocityDecay={0.3}
            warmupTicks={hasLoaded ? 0 : 100}
        />
    </div>
  );
};

export default EmotionalConstellation;
