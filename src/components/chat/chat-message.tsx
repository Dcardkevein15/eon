'use client';

import { cn } from '@/lib/utils';
import type { Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Sparkles } from 'lucide-react';
import { useAuth } from '@/firebase';
import ReactMarkdown from 'react-markdown';


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
          'px-4 py-3 rounded-2xl max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl prose prose-sm dark:prose-invert prose-headings:font-semibold prose-p:m-0 prose-headings:m-0 prose-ul:m-0 prose-ol:m-0',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-card border rounded-bl-none'
        )}
      >
        <ReactMarkdown>{message.content}</ReactMarkdown>
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
