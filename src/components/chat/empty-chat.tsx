'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/logo';
import ChatInput from './chat-input';
import type { Message } from '@/lib/types';

interface EmptyChatProps {
  createChat: (input: string) => void;
}

export default function EmptyChat({ createChat }: EmptyChatProps) {
  const [isClient, setIsClient] = useState(false);
  const [showChatInput, setShowChatInput] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleNewConversation = () => {
    setShowChatInput(true);
  };

  useEffect(() => {
    if (showChatInput) {
      inputRef.current?.focus();
    }
  }, [showChatInput]);

  if (!isClient) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <div className="max-w-4xl w-full flex-grow flex flex-col items-center justify-center">
        <AppLogo className="w-16 h-16 md:w-20 md:h-20 mx-auto text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold mt-4">Bienvenido a ¡tu-psicologo-ya!</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Tu asistente profesional para el desahogo y control emocional.
        </p>
        
        {!showChatInput && (
          <Button 
            size="lg" 
            className="mt-8"
            onClick={handleNewConversation}
          >
            Nueva Conversación
          </Button>
        )}
      </div>
      
      {showChatInput && (
        <div className="w-full pb-4">
          <ChatInput
            ref={inputRef}
            onSendMessage={createChat}
            isLoading={false}
            chatHistory={[]}
          />
        </div>
      )}
    </div>
  );
}
