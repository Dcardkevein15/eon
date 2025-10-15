'use client';

import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/lib/types';
import ChatMessage from './chat-message';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ThinkingIndicator = () => {
    const containerVariants = {
        initial: { opacity: 0, scale: 0.95 },
        animate: { 
            opacity: 1, 
            scale: 1,
            transition: { 
                duration: 0.4,
                ease: "easeOut",
            }
        },
        exit: { 
            opacity: 0, 
            scale: 0.95,
            transition: { duration: 0.3, ease: "easeIn" }
        }
    };
    
    // Lista ampliada de conceptos
    const concepts = [
        "Empatía", "Lógica", "Recuerdos", "Patrones", "Contexto", "Posibilidades",
        "Sentimiento", "Solución", "Pregunta", "Reflexión", "Pasado", "Futuro",
        "Causa", "Efecto", "Metáfora", "Abstracción", "Detalle", "Síntesis"
    ];
    
    // Hook para generar nodos aleatorios solo una vez
    const useRandomNodes = (numNodes: number, width: number, height: number) => {
        const [nodes, setNodes] = useState<{ x: number; y: number; text: string; }[]>([]);

        useEffect(() => {
            const shuffledConcepts = [...concepts].sort(() => 0.5 - Math.random());
            const newNodes = Array.from({ length: numNodes }).map((_, i) => ({
                x: Math.random() * (width - 80) + 40,
                y: Math.random() * (height - 40) + 20,
                text: shuffledConcepts[i % shuffledConcepts.length]
            }));
            setNodes(newNodes);
        }, [numNodes, width, height]);

        return nodes;
    };
    
    const width = 320;
    const height = 160;
    const nodes = useRandomNodes(7, width, height); // 7 nodos para un buen balance

    // Crear todas las posibles conexiones
    const links = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            links.push({ source: nodes[i], target: nodes[j] });
        }
    }

    // Seleccionar una ruta principal aleatoria
    const mainPathIndices = [0, 1, 2, 3, 4, 5, 6].sort(() => 0.5 - Math.random()).slice(0, 4);
    const mainPathLinks = [];
    if(nodes.length > 0) {
        for (let i = 0; i < mainPathIndices.length - 1; i++) {
            mainPathLinks.push({ source: nodes[mainPathIndices[i]], target: nodes[mainPathIndices[i + 1]] });
        }
    }


    return (
        <motion.div
            className="flex items-start space-x-2 md:space-x-4"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
        >
            <Avatar className="h-8 w-8 bg-accent/20 text-accent">
                <AvatarFallback>
                    <Sparkles className="h-5 w-5" />
                </AvatarFallback>
            </Avatar>
            <div className="px-4 py-3 rounded-2xl max-w-xs sm:max-w-md md:max-w-lg bg-card border rounded-bl-none flex items-center justify-center" style={{ height: `${height}px`, width: `${width}px`}}>
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
                    {/* Acto 2: Exploración de rutas */}
                     <g>
                        {links.map((link, i) => (
                            <motion.line
                                key={i}
                                x1={link.source.x}
                                y1={link.source.y}
                                x2={link.target.x}
                                y2={link.target.y}
                                stroke="hsl(var(--primary))"
                                strokeWidth="0.5"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: [0, 0.15, 0] }}
                                transition={{ duration: 1, repeat: Infinity, delay: Math.random() * 2 + 1 }}
                            />
                        ))}
                    </g>
                    
                     {/* Acto 1: Aparición de Nodos y Conceptos */}
                    <g>
                        {nodes.map((node, i) => (
                            <motion.g 
                                key={i}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: i * 0.1 }}
                            >
                                <circle cx={node.x} cy={node.y} r="5" fill="hsl(var(--primary))" />
                                <text x={node.x} y={node.y} dy="-10" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
                                    {node.text}
                                </text>
                            </motion.g>
                        ))}
                    </g>

                     {/* Acto 3: La Revelación */}
                     <g>
                        {mainPathLinks.map((link, i) => (
                             <motion.line
                                key={`main-${i}`}
                                x1={link.source.x}
                                y1={link.source.y}
                                x2={link.target.x}
                                y2={link.target.y}
                                stroke="hsl(var(--accent))"
                                strokeWidth="1.5"
                                initial={{ pathLength: 0, opacity: 0 }}
                                animate={{ pathLength: 1, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 2.5 + i * 0.2, ease: "easeInOut" }}
                            />
                        ))}
                    </g>

                </svg>
            </div>
        </motion.div>
    );
};


export default function ChatMessages({ messages, isResponding }: { messages: Message[]; isResponding: boolean; }) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, isResponding]);

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef} viewportRef={viewportRef}>
      <div className="p-4 md:p-6 space-y-6">
        {messages.map((message, index) => (
          <ChatMessage key={message.id || index} message={message} />
        ))}
        <AnimatePresence>
        {isResponding && (
          <ThinkingIndicator />
        )}
        </AnimatePresence>
      </div>
    </ScrollArea>
  );
}
