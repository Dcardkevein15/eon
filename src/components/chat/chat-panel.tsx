'use client';

import { useState, useEffect } from 'react';
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

  // Sync local state with props from parent.
  // This is crucial to see updates from Firestore.
  useEffect(() => {
    setLocalMessages(chat.messages);
  }, [chat.messages]);

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || isResponding) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`, // Temporary local ID
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    // 1. Optimistic UI update: show user message immediately
    const newMessages = [...localMessages, userMessage];
    setLocalMessages(newMessages);
    setIsResponding(true);

    try {
      // 2. Persist user message to Firestore
      await appendMessage(chat.id, {
        role: userMessage.role,
        content: userMessage.content,
        timestamp: userMessage.timestamp,
      });
      
      // 3. Get AI response based on the updated history
      const aiResponseContent = await getAIResponse(newMessages);

      const aiMessage: Omit<Message, 'id'> = {
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Date.now(),
      };
      
      // 4. Persist AI message. The listener in ChatLayout will update the UI.
      await appendMessage(chat.id, aiMessage);

    } catch (error) {
      console.error('Error handling message:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo obtener una respuesta de la IA. Por favor, inténtalo de nuevo.',
      });
      // Revert optimistic update on error
      setLocalMessages((prevMessages) => prevMessages.filter(m => m.id !== userMessage.id));
    } finally {
      setIsResponding(false);
    }
  };


  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={localMessages} isResponding={isResponding} />
      </div>
      <div className="p-4 border-t bg-background/80 backdrop-blur-sm">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isResponding}
          chatHistory={localMessages}
        />
      </div>
    </div>
  );
}
