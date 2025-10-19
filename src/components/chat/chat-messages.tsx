

'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/lib/types';
import ChatMessage from './chat-message';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';


const FullscreenThinkingIndicator = () => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const ref = useRef<HTMLDivElement>(null);
    const [mainPathIndices, setMainPathIndices] = useState<number[]>([]);
    const [elapsedTime, setElapsedTime] = useState(0);

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
    
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedTime(prev => prev + 0.05);
        }, 50);
        return () => clearInterval(timer);
    }, []);

    const concepts = [
        "Empatía", "Lógica", "Recuerdos", "Patrones", "Contexto", "Posibilidades",
        "Sentimiento", "Solución", "Pregunta", "Reflexión", "Pasado", "Futuro",
        "Causa", "Efecto", "Metáfora", "Abstracción", "Detalle", "Síntesis"
    ];
    
    const useStructuredNodes = (numNodes: number, width: number, height: number) => {
        const [nodes, setNodes] = useState<{ x: number; y: number; text: string; size: number; textYOffset: number; }[]>([]);

        useEffect(() => {
            if (width === 0 || height === 0) return;

            const shuffledConcepts = [...concepts].sort(() => 0.5 - Math.random());
            
            const gridCols = Math.ceil(Math.sqrt(numNodes));
            const gridRows = Math.ceil(numNodes / gridCols);
            const cellWidth = width / gridCols;
            const cellHeight = height / gridRows;

            const newNodes = Array.from({ length: numNodes }).map((_, i) => {
                const row = Math.floor(i / gridCols);
                const col = i % gridCols;

                const x = col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * (cellWidth * 0.3);
                const y = row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * (cellHeight * 0.3);

                return {
                    x,
                    y,
                    text: shuffledConcepts[i % shuffledConcepts.length],
                    size: Math.random() * 15 + 20,
                    textYOffset: (Math.random() - 0.5) * 15,
                }
            });

            setNodes(newNodes);
            
            const pathIndices = [...Array(newNodes.length).keys()].sort(() => 0.5 - Math.random()).slice(0, 5);
            setMainPathIndices(pathIndices);

        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [numNodes, width, height]);

        return nodes;
    };
    
    const nodes = useStructuredNodes(9, dimensions.width, dimensions.height);

    const links = [];
    if(nodes.length > 1) {
      for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
              links.push({ source: nodes[i], target: nodes[j] });
          }
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
    
    const act1_node_appearance = 2;
    const act2_exploration = 1.5;
    const act3_path_revelation = mainPathLinks.length * 1;
    const act4_synthesis_explosion = 1;
    const act5_resolution_wave = 1.5;

    return (
        <motion.div
            ref={ref}
            className="fixed inset-0 z-50 bg-background flex items-center justify-center"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut" } }}
            exit={{ 
                opacity: 0,
                scale: 0,
                transition: { duration: 0.7, ease: [0.8, 0, 1, 1] }
            }}
        >
            <AnimatePresence>
                {dimensions.width > 0 && (
                    <motion.svg 
                        width="100%" 
                        height="100%" 
                        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.8, ease: "easeOut" } }}
                        exit={{
                            scale: 0,
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
                                    transition={{ duration: 1.5, repeat: Infinity, delay: act1_node_appearance + Math.random() * 2 }}
                                />
                            ))}
                        </g>

                        {/* Acto I: Aparición de Nodos y Conceptos */}
                        <g>
                            {nodes.map((node, i) => {
                                const isMainPathNode = mainPathIndices.includes(i);
                                const mainPathIndex = mainPathIndices.indexOf(i);
                                const pathDelay = act1_node_appearance + act2_exploration;
                                const revealDelay = pathDelay + mainPathIndex * 1;
                                
                                const isRightSide = node.x > dimensions.width / 2;
                                const textAnchor = isRightSide ? 'end' : 'start';
                                const textX = isRightSide ? node.x - node.size - 5 : node.x + node.size + 5;
                                const textY = node.y + node.textYOffset;

                                return (
                                    <motion.g
                                        key={`node-${i}`}
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.5, delay: i * 0.1 }}
                                    >
                                        <defs>
                                            <radialGradient id={`grad-base-${i}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                                <stop offset="0%" stopColor="hsl(var(--primary) / 0.7)" />
                                                <stop offset="60%" stopColor="hsl(var(--primary) / 0.9)" />
                                                <stop offset="100%" stopColor="hsl(var(--primary))" />
                                            </radialGradient>
                                            <radialGradient id={`grad-accent-${i}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                                                <stop offset="0%" stopColor="hsl(var(--accent) / 0.8)" />
                                                <stop offset="70%" stopColor="hsl(var(--accent))" />
                                                <stop offset="100%" stopColor="hsl(var(--accent) / 0.5)" />
                                            </radialGradient>
                                        </defs>

                                        <motion.circle 
                                          cx={node.x} 
                                          cy={node.y} 
                                          r={node.size} 
                                          fill={`url(#grad-base-${i})`}
                                          animate={isMainPathNode
                                            ? { fill: `url(#grad-accent-${i})` }
                                            : { scale: [1, 1.05, 1], transition: { delay: 2.5, duration: 2, repeat: Infinity } }
                                          }
                                          transition={isMainPathNode ? { delay: revealDelay, duration: 0.5 } : {}}
                                        >
                                            <animateTransform 
                                                attributeName="transform"
                                                attributeType="XML"
                                                type="rotate"
                                                from={`0 ${node.x} ${node.y}`}
                                                to={`360 ${node.x} ${node.y}`}
                                                dur={`${node.size / 2}s`}
                                                repeatCount="indefinite"
                                            />
                                        </motion.circle>

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
                                                    transition={{ delay: revealDelay + 0.1, duration: 1.2, ease: "easeOut" }}
                                                />
                                                 <motion.circle
                                                    cx={node.x}
                                                    cy={node.y}
                                                    r={node.size}
                                                    fill="hsl(var(--accent))"
                                                    initial={{ scale: 1, opacity: 0}}
                                                    animate={{ opacity: [0, 1] }}
                                                    transition={{ delay: revealDelay, duration: act5_resolution_wave - (revealDelay - pathDelay) }}
                                                />
                                            </>
                                        )}
                                        <text x={textX} y={textY} textAnchor={textAnchor} dy=".3em" fontSize="14" fill="hsl(var(--chart-5))" fontWeight="600" style={{pointerEvents: 'none', textShadow: '0 0 5px hsl(var(--background))'}}>
                                            {node.text}
                                        </text>
                                    </motion.g>
                                )
                            })}
                        </g>

                        {/* Acto III: La Revelación (Ruta Principal) */}
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
                                    transition={{ duration: 1, delay: act1_node_appearance + act2_exploration + i * 1, ease: "easeInOut" }}
                                />
                            ))}
                        </g>
                        
                        {/* Acto IV: Explosión Final de Síntesis */}
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
                                        delay: act1_node_appearance + act2_exploration + mainPathLinks.length * 1,
                                        duration: 1,
                                        ease: "easeOut"
                                    }}
                                />
                            ))}
                          </g>
                        )}
                        
                        {/* Acto V: Onda de Resolución */}
                         {mainPathLinks.length > 0 && (
                            <motion.circle
                                cx={mainPathLinks[mainPathLinks.length-1].target.x}
                                cy={mainPathLinks[mainPathLinks.length-1].target.y}
                                r="1"
                                stroke="hsl(var(--accent))"
                                strokeWidth="2"
                                fill="transparent"
                                initial={{ opacity: 0 }}
                                animate={{ 
                                    r: Math.max(dimensions.width, dimensions.height),
                                    opacity: [0.7, 0]
                                }}
                                transition={{
                                    delay: act1_node_appearance + act2_exploration + act3_path_revelation + act4_synthesis_explosion,
                                    duration: act5_resolution_wave,
                                    ease: "easeOut"
                                }}
                            />
                         )}
                    </motion.svg>
                )}
            </AnimatePresence>
        </motion.div>
    );
};


export default function ChatMessages({ messages, isResponding }: { messages: Message[]; isResponding: boolean; }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const pathname = usePathname();

  // Condition to show the fullscreen animation only on the main chat pages
  const isMainChat = pathname === '/' || pathname.startsWith('/c/');


  const handleScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { scrollTop, scrollHeight, clientHeight } = viewport;
    // Check if user is at the bottom of the chat, with a small tolerance
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight <= 5;
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport && isAtBottomRef.current) {
        viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages, isResponding]);

  return (
    <div className="relative h-full">
      <ScrollArea className="h-full" viewportRef={viewportRef} onScroll={handleScroll}>
        <div className="p-4 md:p-6 space-y-6">
          {messages.map((message, index) => (
            <ChatMessage key={message.id || index} message={message} />
          ))}
        </div>
      </ScrollArea>
      <AnimatePresence>
        {isResponding && messages.length > 0 && isMainChat && <FullscreenThinkingIndicator />}
      </AnimatePresence>
    </div>
  );
}
