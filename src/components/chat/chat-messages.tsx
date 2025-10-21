

'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/lib/types';
import ChatMessage from './chat-message';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Sparkles } from 'lucide-react';


const ThinkingAnimation = () => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const setCanvasDimensions = () => {
            if (ref.current) {
                setDimensions({
                    width: ref.current.offsetWidth,
                    height: ref.current.offsetHeight,
                });
            }
        };
        setCanvasDimensions();
        window.addEventListener('resize', setCanvasDimensions);
        return () => window.removeEventListener('resize', setCanvasDimensions);
    }, []);

    const concepts = [ "Empatía", "Lógica", "Recuerdos", "Patrones", "Contexto", "Posibilidades", "Sentimiento", "Pregunta", "Reflexión" ];
    
    const useNodes = (numNodes: number, width: number, height: number) => {
        const [nodes, setNodes] = useState<{ x: number; y: number; text: string; size: number; }[]>([]);

        useEffect(() => {
            if (width === 0 || height === 0) return;

            const shuffledConcepts = [...concepts].sort(() => 0.5 - Math.random());
            const newNodes = Array.from({ length: numNodes }).map((_, i) => ({
                x: Math.random() * width * 0.8 + width * 0.1,
                y: Math.random() * height * 0.8 + height * 0.1,
                text: shuffledConcepts[i % shuffledConcepts.length],
                size: Math.random() * 8 + 6,
            }));
            setNodes(newNodes);
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [numNodes, width, height]);

        return nodes;
    };
    
    const nodes = useNodes(7, dimensions.width, dimensions.height);

    const links = [];
    if(nodes.length > 1) {
      for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
              if (Math.random() > 0.6) {
                links.push({ source: nodes[i], target: nodes[j] });
              }
          }
      }
    }

    return (
        <div ref={ref} className="w-full h-full relative overflow-hidden">
            <AnimatePresence>
                {dimensions.width > 0 && (
                    <motion.svg 
                        width="100%" 
                        height="100%" 
                        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.5 } }}
                    >
                        {/* Links */}
                        <g>
                            {links.map((link, i) => (
                                <motion.line
                                    key={`link-${i}`}
                                    x1={link.source.x} y1={link.source.y}
                                    x2={link.target.x} y2={link.target.y}
                                    stroke="hsl(var(--primary))"
                                    strokeWidth="0.5"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.15, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
                                />
                            ))}
                        </g>

                        {/* Nodes and Text */}
                        <g>
                            {nodes.map((node, i) => (
                                <motion.g
                                    key={`node-${i}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.5, delay: i * 0.1 }}
                                >
                                    <motion.circle 
                                      cx={node.x} 
                                      cy={node.y} 
                                      r={node.size} 
                                      fill="hsl(var(--accent) / 0.7)"
                                      animate={{ scale: [1, 1.05, 1] }}
                                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                                    />
                                    <text x={node.x} y={node.y} textAnchor="middle" dy=".3em" fontSize={node.size * 0.55} fill="hsl(var(--accent-foreground))" fontWeight="500" style={{pointerEvents: 'none'}}>
                                        {node.text}
                                    </text>
                                </motion.g>
                            ))}
                        </g>
                    </motion.svg>
                )}
            </AnimatePresence>
        </div>
    );
};


const ThinkingMessage = () => {
    return (
        <div className={cn( 'flex items-start space-x-2 md:space-x-4 animate-in fade-in duration-300 justify-start' )}>
            <Avatar className="h-8 w-8 bg-accent/20 text-accent">
                <AvatarFallback>
                    <Sparkles className="h-5 w-5" />
                </AvatarFallback>
            </Avatar>
            <div className={cn(
                'px-4 py-3 rounded-2xl max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl overflow-hidden',
                'bg-card border rounded-bl-none'
            )}>
                <div className="h-40 w-64 flex items-center justify-center">
                    <ThinkingAnimation />
                </div>
            </div>
        </div>
    )
}


export default function ChatMessages({ messages, isResponding }: { messages: Message[]; isResponding: boolean; }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const { scrollTop, scrollHeight, clientHeight } = viewport;
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
           <AnimatePresence>
            {isResponding && messages.length > 0 && <ThinkingMessage />}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
