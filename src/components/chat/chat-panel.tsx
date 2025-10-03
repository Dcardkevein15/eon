'use client';

import { useState } from 'react';
import type { Chat, Message } from '@/lib/types';
import { getAIResponse } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';

interface ChatPanelProps {
  chat: Chat;
  appendMessages: (chatId: string, messages: Omit<Message, 'id'>[]) => Promise<void>;
}

export default function ChatPanel({ chat, appendMessages }: ChatPanelProps) {
  const [isResponding, setIsResponding] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || isResponding) return;
  
    setIsResponding(true);
  
    const userMessage: Omit<Message, 'id'> = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };
  
    try {
      // Create a temporary history for the AI that includes the new user message
      const historyForAI = [...chat.messages, { ...userMessage, id: 'temp-user-id' }];
      
      // Get AI response based on the updated history
      const aiResponseContent = await getAIResponse(historyForAI);
  
      const aiMessage: Omit<Message, 'id'> = {
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Date.now(),
      };
  
      // Persist both user and AI messages to Firestore in one go.
      // The `useCollection` hook in ChatLayout will then receive the update
      // and re-render the chat with both new messages.
      await appendMessages(chat.id, [userMessage, aiMessage]);
  
    } catch (error) {
      console.error('Error handling message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo obtener una respuesta de la IA. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={chat.messages} isResponding={isResponding} />
      </div>
      <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isResponding}
          chatHistory={chat.messages}
        />
      </div>
    </div>
  );
}
