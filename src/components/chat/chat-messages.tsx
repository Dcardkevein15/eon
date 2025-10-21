

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
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
            <svg
                width="80%"
                height="80%"
                viewBox="0 0 100 100"
                style={{ filter: "url(#goo)" }}
            >
                {/* Defs for the goo effect */}
                <defs>
                    <filter id="goo">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -7" result="goo" />
                        <feBlend in="SourceGraphic" in2="goo" />
                    </filter>
                </defs>
                {/* Animated blobs */}
                <motion.g>
                    <motion.circle
                        cx="50"
                        cy="50"
                        r="12"
                        fill="hsl(var(--primary))"
                        animate={{
                            cx: [45, 55, 45],
                            r: [10, 15, 10],
                            opacity: [0.8, 1, 0.8],
                        }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <motion.circle
                        cx="35"
                        cy="50"
                        r="10"
                        fill="hsl(var(--accent))"
                        animate={{
                            cy: [55, 45, 55],
                            r: [8, 12, 8],
                            opacity: [0.7, 1, 0.7],
                        }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    />
                     <motion.circle
                        cx="65"
                        cy="50"
                        r="10"
                        fill="hsl(var(--accent))"
                        animate={{
                            cy: [45, 55, 45],
                            r: [12, 8, 12],
                            opacity: [1, 0.7, 1],
                        }}
                        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                    />
                </motion.g>
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
                'px-4 py-3 rounded-2xl w-48 h-24 overflow-hidden',
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
