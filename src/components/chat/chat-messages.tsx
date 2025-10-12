'use client';

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Message } from '@/lib/types';
import ChatMessage from './chat-message';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Sparkles } from 'lucide-react';

interface ChatMessagesProps {
  messages: Message[];
  isResponding: boolean;
  lastIntent?: { messageId: string; intent: string } | null;
  isAnalyzing?: boolean;
}

export default function ChatMessages({ messages, isResponding, lastIntent, isAnalyzing }: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages, isResponding, isAnalyzing]);

  const lastUserMessageId = messages.slice().reverse().find(m => m.role === 'user')?.id;

  return (
    <ScrollArea className="h-full" ref={scrollAreaRef} viewportRef={viewportRef}>
      <div className="p-4 md:p-6 space-y-6">
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            intent={lastIntent?.messageId === message.id ? lastIntent.intent : undefined}
            isLastUserMessage={lastUserMessageId === message.id}
            isAnalyzing={isAnalyzing}
          />
        ))}
        {isResponding && (
          <div className="flex items-start space-x-2 md:space-x-4 animate-in fade-in duration-300">
            <Avatar className="h-8 w-8 bg-primary/20 text-primary">
              <AvatarFallback>
                  <Sparkles className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="px-4 py-3 rounded-2xl max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl bg-card border rounded-bl-none space-y-2">
              <Skeleton className="h-4 w-1/4 animate-pulse" />
              <Skeleton className="h-4 w-3/4 animate-pulse" />
              <Skeleton className="h-4 w-1/2 animate-pulse" />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
