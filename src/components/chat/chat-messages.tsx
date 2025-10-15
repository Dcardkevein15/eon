
'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Message } from '@/lib/types';
import ChatMessage from './chat-message';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatMessagesProps {
  messages: Message[];
  isResponding: boolean;
}

const ThinkingIndicator = () => {
    const dotVariants = {
        initial: { y: 0 },
        animate: { 
            y: [0, -8, 0],
            transition: { 
                duration: 1.2,
                ease: "easeInOut",
                repeat: Infinity,
            }
        },
    };

    return (
        <motion.div
            className="flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <motion.span 
                className="w-2 h-2 bg-primary/70 rounded-full"
                variants={dotVariants}
                animate="animate"
                style={{ transitionDelay: '0s' }}
            />
            <motion.span 
                className="w-2 h-2 bg-primary/70 rounded-full"
                variants={dotVariants}
                animate="animate"
                 style={{ transitionDelay: '0.2s' }}
            />
            <motion.span 
                className="w-2 h-2 bg-primary/70 rounded-full"
                variants={dotVariants}
                animate="animate"
                 style={{ transitionDelay: '0.4s' }}
            />
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
        {isResponding && (
          <div className="flex items-start space-x-2 md:space-x-4 animate-in fade-in duration-300">
            <Avatar className="h-8 w-8 bg-primary/20 text-primary">
              <AvatarFallback>
                  <Sparkles className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="px-4 py-3 rounded-2xl max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl bg-card border rounded-bl-none flex items-center h-10">
              <ThinkingIndicator />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
