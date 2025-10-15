
'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Sparkles, ScanLine, Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import ReactMarkdown from 'react-markdown';
import { memo } from 'react';
import Image from 'next/image';

// Componente para el cursor parpadeante
const BlinkingCursor = () => (
  <span className="animate-pulse inline-block w-2 h-4 bg-foreground/70 ml-1 translate-y-0.5" />
);

interface ChatMessageProps {
  message: Message;
  intent?: string;
  isLastUserMessage?: boolean;
  isAnalyzing?: boolean;
  isStreaming?: boolean;
}

function ChatMessage({ message, intent, isLastUserMessage, isAnalyzing, isStreaming }: ChatMessageProps) {
  const { user: authUser } = useAuth();
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex items-start space-x-2 md:space-x-4 animate-in fade-in duration-300',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8 bg-accent/20 text-accent">
            <AvatarFallback>
                <Sparkles className="h-5 w-5" />
            </AvatarFallback>
        </Avatar>
      )}

      <div className='flex flex-col gap-1.5' style={{ alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <div
          className={cn(
            'px-4 py-3 rounded-2xl max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl prose prose-sm dark:prose-invert prose-headings:font-semibold prose-p:m-0 prose-headings:m-0 prose-ul:m-0 prose-ol:m-0 prose-p:break-words',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-none'
              : 'bg-card border rounded-bl-none'
          )}
        >
          {message.imageUrl && (
              <div className="relative aspect-video mb-2 not-prose">
                  <Image src={message.imageUrl} alt="Contenido del usuario" fill className="rounded-lg object-contain" />
              </div>
          )}
          <ReactMarkdown>{message.content}</ReactMarkdown>
          {isStreaming && <BlinkingCursor />}
        </div>

        {isUser && isLastUserMessage && isAnalyzing && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Analizando...</span>
            </div>
        )}
        
        {isUser && intent && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 animate-in fade-in duration-300">
                <ScanLine className="h-3 w-3 text-accent"/>
                <span>Táctica: <span className='font-medium text-foreground/80'>{intent}</span></span>
            </div>
        )}
      </div>

      {isUser && authUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src={authUser?.photoURL ?? ''} alt={authUser?.displayName ?? 'Usuario'} />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export default memo(ChatMessage);
