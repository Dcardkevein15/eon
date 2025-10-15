'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Message } from '@/lib/types';
import ChatMessage from './chat-message';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ThinkingIndicator = () => {
    const containerVariants = {
        initial: { opacity: 0, scale: 0.9 },
        animate: { 
            opacity: 1, 
            scale: 1,
            transition: { 
                duration: 0.3,
                ease: "easeOut",
            }
        },
        exit: { 
            opacity: 0, 
            scale: 0.9,
            transition: { duration: 0.2, ease: "easeIn" }
        }
    };
    
    const pieceVariants = {
        initial: { opacity: 0, pathLength: 0 },
        animate: { 
            opacity: 1,
            pathLength: 1,
            transition: {
                duration: 1,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop",
                repeatDelay: 0.5
            }
        }
    };

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
            <div className="px-4 py-3 rounded-2xl max-w-xs sm:max-w-md md:max-w-lg bg-card border rounded-bl-none flex items-center justify-center h-24 w-40">
                <motion.svg 
                    width="60" 
                    height="60" 
                    viewBox="0 0 60 60" 
                    initial="initial"
                    animate="animate"
                    className="transform -rotate-90"
                >
                    {/* Circle paths */}
                    {[...Array(4)].map((_, i) => (
                        <motion.circle
                            key={i}
                            cx="30"
                            cy="30"
                            r={5 + i * 5}
                            stroke="hsl(var(--primary))"
                            strokeWidth="1.5"
                            fill="transparent"
                            variants={pieceVariants}
                            custom={i}
                            style={{
                                pathLength: 0,
                                opacity: 0.5,
                                transition: `pathLength 1s ease-in-out ${i * 0.1}s, opacity 1s ease-in-out ${i * 0.1}s`
                            }}
                             initial={{ pathLength: 0, opacity: 0 }}
                             animate={{ 
                                pathLength: 1, 
                                opacity: [0, 0.5, 0],
                                transition: {
                                    duration: 1.5,
                                    repeat: Infinity,
                                    repeatType: 'loop',
                                    ease: "easeInOut",
                                    delay: i * 0.15
                                }
                             }}
                        />
                    ))}
                    {/* Line paths */}
                     {[...Array(4)].map((_, i) => (
                         <motion.line 
                            key={i}
                            x1="30"
                            y1="30"
                            x2="30"
                            y2="10"
                            stroke="hsl(var(--accent))"
                            strokeWidth="1.5"
                            variants={pieceVariants}
                             initial={{ opacity: 0, scale: 0.5 }}
                             animate={{
                                opacity: [0, 1, 0],
                                scale: 1,
                                transition: {
                                    duration: 1.5,
                                    repeat: Infinity,
                                    repeatType: 'loop',
                                    ease: "easeInOut",
                                    delay: i * 0.2 + 0.1
                                }
                             }}
                             style={{
                                transformOrigin: 'center center',
                                rotate: i * 90
                             }}
                         />
                     ))}
                </motion.svg>
            </div>
        </motion.div>
    );
};


export default function ChatMessages({ messages, isResponding }: ChatMessagesProps) {
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

interface ChatMessagesProps {
    messages: Message[];
    isResponding: boolean;
}
