'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/lib/types';
import ChatMessage from './chat-message';
import { motion, AnimatePresence } from 'framer-motion';


const FullscreenThinkingIndicator = () => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const ref = useRef<HTMLDivElement>(null);

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
        const [nodes, setNodes] = useState<{ x: number; y: number; text: string; }[]>([]);

        useEffect(() => {
            if (width === 0 || height === 0) return;

            const shuffledConcepts = [...concepts].sort(() => 0.5 - Math.random());
            const newNodes = Array.from({ length: numNodes }).map((_, i) => ({
                x: Math.random() * (width - 120) + 60,
                y: Math.random() * (height - 80) + 40,
                text: shuffledConcepts[i % shuffledConcepts.length]
            }));
            setNodes(newNodes);
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

    const mainPathIndices = [...Array(nodes.length).keys()].sort(() => 0.5 - Math.random()).slice(0, 5);
    const mainPathLinks = [];
    if(nodes.length > 0) {
        for (let i = 0; i < mainPathIndices.length - 1; i++) {
            const sourceIndex = mainPathIndices[i];
            const targetIndex = mainPathIndices[i+1];
            if (nodes[sourceIndex] && nodes[targetIndex]) {
               mainPathLinks.push({ source: nodes[sourceIndex], target: nodes[targetIndex] });
            }
        }
    }

    return (
        <motion.div
            ref={ref}
            className="fixed inset-0 z-50 bg-background flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.7 } }}
        >
            <AnimatePresence>
                {dimensions.width > 0 && (
                    <svg width="100%" height="100%" viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
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
                            {nodes.map((node, i) => (
                                <motion.g
                                    key={`node-${i}`}
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                >
                                    <circle cx={node.x} cy={node.y} r="8" fill="hsl(var(--primary))" />
                                    <text x={node.x} y={node.y - 18} textAnchor="middle" fontSize="13" fill="hsl(var(--muted-foreground))" fontWeight="600">
                                        {node.text}
                                    </text>
                                </motion.g>
                            ))}
                        </g>
                        
                        {/* Acto III: Pulsación y Foco */}
                         <g>
                            {nodes.map((node, i) => (
                                !mainPathIndices.includes(i) && (
                                     <motion.g
                                        key={`fade-node-${i}`}
                                        animate={{ opacity: [1, 0.3, 1] }}
                                        transition={{ duration: 2, repeat: Infinity, delay: 2.5 }}
                                    >
                                         <circle cx={node.x} cy={node.y} r="8" fill="hsl(var(--primary))" />
                                         <text x={node.x} y={node.y - 18} textAnchor="middle" fontSize="13" fill="hsl(var(--muted-foreground))" fontWeight="600">
                                            {node.text}
                                        </text>
                                    </motion.g>
                                )
                            ))}
                        </g>

                        {/* Acto IV: La Revelación */}
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
                                    transition={{ duration: 0.5, delay: 3 + i * 0.3, ease: "easeInOut" }}
                                />
                            ))}
                        </g>
                    </svg>
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