'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Chat, Message } from '@/lib/types';
import { getAIResponse } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';

interface ChatPanelProps {
  chat: Chat;
  appendMessage: (chatId: string, message: Message) => void;
}

export default function ChatPanel({ chat, appendMessage }: ChatPanelProps) {
  const [isResponding, setIsResponding] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async (input: string) => {
    if (!input.trim() || isResponding) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };
    appendMessage(chat.id, userMessage);
    setIsResponding(true);

    try {
      const updatedHistory = [...chat.messages, userMessage];
      const aiResponseContent = await getAIResponse(updatedHistory);

      const aiMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Date.now(),
      };
      appendMessage(chat.id, aiMessage);
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to get a response from the AI. Please try again.',
      });
      // Optionally remove the user message if AI fails
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
