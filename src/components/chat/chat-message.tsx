'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Sparkles } from 'lucide-react';
import { useAuth } from '@/firebase';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
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
        <Avatar className="h-8 w-8 bg-primary/20 text-primary">
            <AvatarFallback>
                <Sparkles className="h-5 w-5" />
            </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'px-4 py-3 rounded-2xl max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-card border rounded-bl-none'
        )}
      >
        <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
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
