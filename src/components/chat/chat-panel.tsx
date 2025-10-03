'use client';

import { useState } from 'react';
import type { Chat, Message } from '@/lib/types';
import { getAIResponse } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';

interface ChatPanelProps {
  chat: Chat;
  appendMessage: (chatId: string, message: Omit<Message, 'id'>) => Promise<void>;
}

export default function ChatPanel({ chat, appendMessage }: ChatPanelProps) {
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
      // 1. Persist user message to Firestore
      await appendMessage(chat.id, userMessage);
  
      // 2. The useCollection hook in ChatLayout will automatically update the chat.messages prop.
      // We create a new history array that includes the user message for the AI.
      const newHistoryForAI = [...chat.messages, { ...userMessage, id: 'temp-id' }];
  
      // 3. Get AI response
      const aiResponseContent = await getAIResponse(newHistoryForAI);
  
      const aiMessage: Omit<Message, 'id'> = {
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Date.now(),
      };
  
      // 4. Persist AI message. The listener in ChatLayout will update the UI again.
      await appendMessage(chat.id, aiMessage);
  
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
