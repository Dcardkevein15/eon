
'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Sparkles, Copy, Check } from 'lucide-react';
import { useAuth } from '@/firebase';
import ReactMarkdown from 'react-markdown';
import { memo, useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Componente para el cursor parpadeante
const BlinkingCursor = () => (
  <span className="animate-pulse inline-block w-2 h-4 bg-foreground/70 ml-1 translate-y-0.5" />
);

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const isUser = message.role === 'user';
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content).then(() => {
        setIsCopied(true);
        toast({
            title: "Texto copiado",
        });
        setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <>
      <div
        className={cn(
          'group/message flex items-start space-x-2 md:space-x-4 animate-in fade-in duration-300',
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

        <div className='relative flex flex-col gap-2 max-w-full' style={{ alignItems: isUser ? 'flex-end': 'flex-start'}}>
          <div
            className={cn(
              'px-4 py-3 rounded-2xl max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl overflow-hidden',
              isUser
                ? 'bg-primary text-primary-foreground rounded-br-none'
                : 'bg-card border rounded-bl-none'
            )}
          >
            {message.imageUrl && (
                <div className="relative aspect-video mb-2 not-prose cursor-pointer" onClick={() => setIsViewerOpen(true)}>
                    <Image src={message.imageUrl} alt="Contenido generado por IA" fill className="rounded-lg object-contain" />
                </div>
            )}
            <ReactMarkdown
              className="prose prose-sm dark:prose-invert prose-p:m-0 prose-headings:m-0 prose-ul:m-0 prose-ol:m-0 break-words"
            >
              {message.content}
            </ReactMarkdown>
            {isStreaming && <BlinkingCursor />}
          </div>
           {/* Botón de copiar */}
          {!isStreaming && message.content && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-7 w-7 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200"
                onClick={handleCopy}
              >
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                <span className="sr-only">Copiar mensaje</span>
              </Button>
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

      {message.imageUrl && (
        <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
          <DialogContent className="max-w-4xl w-full h-[80vh] p-0 border-0 bg-transparent">
             <Image src={message.imageUrl} alt="Contenido generado por IA en pantalla completa" fill className="object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default memo(ChatMessage);
