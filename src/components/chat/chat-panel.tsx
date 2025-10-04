'use client';

import { useState } from 'react';
import type { Chat, Message } from '@/lib/types';
import { getAIResponse, generateChatTitle } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '../ui/button';
import { PanelLeft } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';


interface ChatPanelProps {
  chat: Chat;
  appendMessages: (chatId: string, messages: Omit<Message, 'id'>[]) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
}

export default function ChatPanel({ chat, appendMessages, updateChatTitle }: ChatPanelProps) {
  const [isResponding, setIsResponding] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { toggleSidebar } = useSidebar();


  const handleSendMessage = async (input: string) => {
    if (!input.trim() || isResponding) return;
  
    setIsResponding(true);
  
    const userMessage: Omit<Message, 'id'> = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };
  
    try {
      // Optimistically append user message for responsiveness
      const currentMessages = [...chat.messages, userMessage];

      // Only generate title if it's the first exchange
      const isFirstMessage = chat.messages.length === 0;

      // Get AI response
      const aiResponseContent = await getAIResponse(currentMessages);
  
      const aiMessage: Omit<Message, 'id'> = {
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Date.now(),
      };
      
      // Append both messages to firestore
      await appendMessages(chat.id, [userMessage, aiMessage]);

      // Generate and update title after the first AI response
      if (isFirstMessage) {
        const conversationForTitle = `User: ${input}\nAssistant: ${aiResponseContent}`;
        const newTitle = await generateChatTitle(conversationForTitle);
        await updateChatTitle(chat.id, newTitle);
      }
  
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
       <header className="flex items-center justify-between p-2 md:p-4 border-b">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar}>
              <PanelLeft />
              <span className="sr-only">Toggle Sidebar</span>
            </Button>
          )}
          <h2 className="text-base md:text-lg font-semibold truncate">{chat.title}</h2>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={chat.messages} isResponding={isResponding} />
      </div>
      <div className="p-2 md:p-4 border-t bg-background/80 backdrop-blur-sm">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isResponding}
          chatHistory={chat.messages}
        />
      </div>
    </div>
  );
}
