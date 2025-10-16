
'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/lib/types';
import ChatMessage from './chat-message';
import { motion, AnimatePresence } from 'framer-motion';


const FullscreenThinkingIndicator = () => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const ref = useRef<HTMLDivElement>(null);
    const [mainPathIndices, setMainPathIndices] = useState<number[]>([]);

    useLayoutEffect(() => {
        if (ref.current) {
            setDimensions({
                width: ref.current.offsetWidth,
                height: ref.current.offsetHeight,
            });
        }
        const handleResize = () => {
            if (ref.current) {
                setDimensions({
                    width: ref.current.offsetWidth,
                    height: ref.current.offsetHeight,
                });
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const concepts = [
        "Empatía", "Lógica", "Recuerdos", "Patrones", "Contexto", "Posibilidades",
        "Sentimiento", "Solución", "Pregunta", "Reflexión", "Pasado", "Futuro",
        "Causa", "Efecto", "Metáfora", "Abstracción", "Detalle", "Síntesis"
    ];
    
    const useRandomNodes = (numNodes: number, width: number, height: number) => {
        const [nodes, setNodes] = useState<{ x: number; y: number; text: string; size: number; }[]>([]);

        useEffect(() => {
            if (width === 0 || height === 0) return;

            const shuffledConcepts = [...concepts].sort(() => 0.5 - Math.random());
            const newNodes = Array.from({ length: numNodes }).map((_, i) => ({
                x: Math.random() * (width * 0.8) + (width * 0.1),
                y: Math.random() * (height * 0.8) + (height * 0.1),
                text: shuffledConcepts[i % shuffledConcepts.length],
                size: Math.random() * 8 + 6
            }));
            setNodes(newNodes);
            
            const pathIndices = [...Array(newNodes.length).keys()].sort(() => 0.5 - Math.random()).slice(0, 5);
            setMainPathIndices(pathIndices);

        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [numNodes, width, height]);

        return nodes;
    };
    
    const nodes = useRandomNodes(9, dimensions.width, dimensions.height);

    const links = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            links.push({ source: nodes[i], target: nodes[j] });
        }
    }

    const mainPathLinks = [];
    if(nodes.length > 0 && mainPathIndices.length > 0) {
        for (let i = 0; i < mainPathIndices.length - 1; i++) {
            const sourceIndex = mainPathIndices[i];
            const targetIndex = mainPathIndices[i+1];
            if (nodes[sourceIndex] && nodes[targetIndex]) {
               mainPathLinks.push({ source: nodes[sourceIndex], target: nodes[targetIndex] });
            }
        }
    }
    
    const totalDuration = 3 + mainPathLinks.length * 1 + 2; // Adjusted total duration

    return (
        <motion.div
            ref={ref}
            className="fixed inset-0 z-50 bg-background flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5 } }}
            exit={{ 
                scale: 0,
                opacity: 0,
                transition: { duration: 0.7, ease: "easeIn" }
            }}
        >
            <AnimatePresence>
                {dimensions.width > 0 && (
                    <motion.svg 
                        width="100%" 
                        height="100%" 
                        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }}
                        exit={{
                            scale: 0.1,
                            opacity: 0,
                            transition: { duration: 0.7, ease: [0.8, 0, 1, 1] }
                        }}
                        style={{ transformOrigin: 'center center' }}
                    >
                        {/* Acto II: Exploración de rutas */}
                        <g>
                            {links.map((link, i) => (
                                <motion.line
                                    key={`explore-${i}`}
                                    x1={link.source.x} y1={link.source.y}
                                    x2={link.target.x} y2={link.target.y}
                                    stroke="hsl(var(--primary))"
                                    strokeWidth="0.5"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.1, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, delay: 1 + Math.random() * 2 }}
                                />
                            ))}
                        </g>

                        {/* Acto I: Aparición de Nodos y Conceptos */}
                        <g>
                            {nodes.map((node, i) => {
                                const isMainPathNode = mainPathIndices.includes(i);
                                const mainPathIndex = mainPathIndices.indexOf(i);
                                const delay = 3 + mainPathIndex * 1;

                                return (
                                    <motion.g
                                        key={`node-${i}`}
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, delay: i * 0.1 }}
                                    >
                                        <motion.circle 
                                          cx={node.x} 
                                          cy={node.y} 
                                          r={node.size} 
                                          fill="hsl(var(--primary))"
                                          animate={isMainPathNode
                                            ? { fill: ["hsl(var(--primary))", "hsl(var(--accent))"] }
                                            : { scale: [1, 1.05, 1], transition: { delay: 2.5, duration: 2, repeat: Infinity } }
                                          }
                                          transition={isMainPathNode ? { delay, duration: 0.5 } : {}}
                                        />
                                        {isMainPathNode && (
                                            <>
                                                <motion.circle
                                                    cx={node.x}
                                                    cy={node.y}
                                                    r={node.size}
                                                    fill="transparent"
                                                    stroke="hsl(var(--accent))"
                                                    strokeWidth="2"
                                                    initial={{ scale: 1, opacity: 0 }}
                                                    animate={{ scale: 4, opacity: [0.8, 0] }}
                                                    transition={{ delay: delay + 0.1, duration: 1.2, ease: "easeOut" }}
                                                />
                                                 <motion.circle
                                                    cx={node.x}
                                                    cy={node.y}
                                                    r={node.size}
                                                    fill="hsl(var(--accent))"
                                                    initial={{ scale: 1, opacity: 0}}
                                                    animate={{ opacity: [0, 1, 1] }}
                                                    transition={{ delay, duration: totalDuration - delay }}
                                                />
                                            </>
                                        )}
                                        <text x={node.x} y={node.y} textAnchor="middle" dy=".3em" fontSize="14" fill="hsl(var(--primary-foreground))" fontWeight="600" style={{pointerEvents: 'none'}}>
                                            {node.text}
                                        </text>
                                    </motion.g>
                                )
                            })}
                        </g>

                        {/* Acto IV: La Revelación (Ruta Principal) */}
                        <g>
                            {mainPathLinks.map((link, i) => (
                                <motion.line
                                    key={`main-${i}`}
                                    x1={link.source.x} y1={link.source.y}
                                    x2={link.target.x} y2={link.target.y}
                                    stroke="hsl(var(--accent))"
                                    strokeWidth="2.5"
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 1, delay: 3 + i * 1, ease: "easeInOut" }}
                                />
                            ))}
                        </g>

                         {/* Act V: Explosión Final de Síntesis */}
                        {mainPathLinks.length > 0 && (
                          <g>
                            {Array.from({length: 12}).map((_, i) => (
                                <motion.circle
                                    key={`particle-${i}`}
                                    cx={mainPathLinks[mainPathLinks.length-1].target.x}
                                    cy={mainPathLinks[mainPathLinks.length-1].target.y}
                                    r={2}
                                    fill="hsl(var(--accent))"
                                    initial={{ scale: 0, opacity: 0}}
                                    animate={{
                                        scale: [1, 1.5],
                                        opacity: [1, 0],
                                        x: mainPathLinks[mainPathLinks.length-1].target.x + (Math.random() - 0.5) * 150,
                                        y: mainPathLinks[mainPathLinks.length-1].target.y + (Math.random() - 0.5) * 150,
                                    }}
                                    transition={{
                                        delay: 3 + mainPathLinks.length * 1,
                                        duration: 1,
                                        ease: "easeOut"
                                    }}
                                />
                            ))}
                          </g>
                        )}
                    </motion.svg>
                )}
            </AnimatePresence>
        </motion.div>
    );
};


export default function ChatMessages({ messages, isResponding }: { messages: Message[]; isResponding: boolean; }) {
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, isResponding]);

  return (
    <>
      <ScrollArea className="h-full" viewportRef={viewportRef}>
        <div className="p-4 md:p-6 space-y-6">
          {messages.map((message, index) => (
            <ChatMessage key={message.id || index} message={message} />
          ))}
        </div>
      </ScrollArea>
      <AnimatePresence>
        {isResponding && <FullscreenThinkingIndicator />}
      </AnimatePresence>
    </>
  );
}
