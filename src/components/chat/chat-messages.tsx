

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
    return (
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-black rounded-lg">
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 200 150"
                preserveAspectRatio="xMidYMid meet"
            >
                {/* Add filter for fire effect */}
                <defs>
                    <filter id="fire-glow">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id="fire-texture" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.1 0.3" numOctaves="2" seed="2" result="turbulence" />
                        <feColorMatrix in="turbulence" type="matrix" values="0 0 0 0 1, 0 0 0 0 .5, 0 0 0 0 0, 0 0 0 5 -1" result="fireColor" />
                         <feComposite in="fireColor" in2="SourceGraphic" operator="in" result="textured"/>
                    </filter>
                </defs>

                {/* Stars Background */}
                <g>
                    {[...Array(50)].map((_, i) => (
                        <motion.circle
                            key={`star-${i}`}
                            cx={Math.random() * 200}
                            cy={Math.random() * 150}
                            r={Math.random() * 0.8 + 0.2}
                            fill="white"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, Math.random() * 0.7 + 0.1, 0] }}
                            transition={{
                                duration: Math.random() * 3 + 2,
                                repeat: Infinity,
                                repeatType: 'mirror',
                                delay: Math.random() * 2,
                            }}
                        />
                    ))}
                </g>

                {/* Buddha Silhouette */}
                 <motion.path
                    d="M100 80 C95 80 90 85 90 90 C90 95 95 100 100 100 C105 100 110 95 110 90 C110 85 105 80 100 80 Z M85 105 C80 105 75 110 75 115 L75 120 L125 120 L125 115 C125 110 120 105 115 105 Z M70 125 L130 125 L125 135 L75 135 Z"
                    fill="hsl(var(--primary))"
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: 'mirror' }}
                    filter="url(#fire-glow)"
                />

                {/* Expanding Waves */}
                <g transform="translate(100, 90)">
                    {[...Array(3)].map((_, i) => (
                        <motion.circle
                            key={`wave-${i}`}
                            r={5}
                            fill="none"
                            stroke="hsl(var(--primary))"
                            strokeWidth={1}
                            strokeOpacity={0.7}
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 15, opacity: 0 }}
                            transition={{
                                duration: 4,
                                repeat: Infinity,
                                ease: 'easeOut',
                                delay: i * 1.33,
                            }}
                        />
                    ))}
                </g>
                
                 {/* Fire Whirlwind Effect */}
                <g filter="url(#fire-glow)">
                     <motion.g
                        initial={{ rotate: 0 }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                     >
                        {[...Array(20)].map((_, i) => (
                            <motion.circle
                                key={`fire-${i}`}
                                r={Math.random() * 3 + 1}
                                fill="hsl(var(--primary))"
                                filter="url(#fire-texture)"
                                initial={{
                                    cx: 100,
                                    cy: 90,
                                    scale: 0,
                                    opacity: 0,
                                }}
                                animate={{
                                    cx: [100 + Math.cos(i * 0.314) * (20 + i*1.2), 100 + Math.cos(i * 0.314 + 6.28) * (20 + i*1.2)],
                                    cy: [90 + Math.sin(i * 0.314) * (20 + i*1.2), 90 + Math.sin(i * 0.314 + 6.28) * (20 + i*1.2)],
                                    scale: [0, 1, 1, 0],
                                    opacity: [0, 0.8, 0.8, 0],
                                }}
                                transition={{
                                    duration: Math.random() * 2 + 3,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                    ease: "easeInOut",
                                }}
                             />
                        ))}
                    </motion.g>
                </g>
            </svg>
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
                'px-4 py-3 rounded-2xl w-48 h-36 overflow-hidden',
                'bg-card border rounded-bl-none flex items-center justify-center'
            )}>
                <ThinkingAnimation />
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
