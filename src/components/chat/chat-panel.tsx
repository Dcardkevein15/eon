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
  const [localMessages, setLocalMessages] = useState<Message[]>(chat.messages);

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || isResponding) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    // Optimistic UI update
    setLocalMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsResponding(true);

    try {
      await appendMessage(chat.id, userMessage);
      
      const aiResponseContent = await getAIResponse([...localMessages, userMessage]);

      const aiMessage: Omit<Message, 'id'> = {
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Date.now(),
      };
      // The new AI message will be added via Firestore snapshot listener
      await appendMessage(chat.id, aiMessage);

    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo obtener una respuesta de la IA. Por favor, inténtalo de nuevo.',
      });
      // Revert user message if AI fails
      setLocalMessages((prevMessages) => prevMessages.filter(m => m.id !== userMessage.id));
    } finally {
      setIsResponding(false);
    }
  };

  // Sync local state with props from parent
  useState(() => {
    setLocalMessages(chat.messages);
  }, [chat.messages]);


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
