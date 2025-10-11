'use client';

import { useState, useCallback, memo, useEffect, useMemo } from 'react';
import type { Chat, Message } from '@/lib/types';
import { getAIResponse, generateChatTitle } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { updatePsychologicalBlueprint } from '@/ai/flows/update-psychological-blueprint';
import { v4 as uuidv4 } from 'uuid';

interface ChatPanelProps {
  chat: Chat;
  appendMessage: (chatId: string, message: Omit<Message, 'id'>) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
}

function ChatPanel({ chat, appendMessage, updateChatTitle }: ChatPanelProps) {
  const [isResponding, setIsResponding] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const firestore = useFirestore();

  const messagesQuery = useMemo(
    () =>
      user?.uid && firestore && chat.id
        ? query(
            collection(firestore, `users/${user.uid}/chats/${chat.id}/messages`),
            orderBy('timestamp', 'asc')
          )
        : undefined,
    [user?.uid, firestore, chat.id]
  );
  
  const { data: remoteMessages, loading: messagesLoading } = useCollection<Message>(messagesQuery);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (remoteMessages) {
        setLocalMessages(remoteMessages);
    }
  }, [remoteMessages]);


  const handleSendMessage = useCallback(async (input: string, imageUrl?: string) => {
    if ((!input || !input.trim()) && !imageUrl) return;
    if (!user) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Debes iniciar sesión para chatear.",
        });
        return;
    }

    setIsResponding(true);

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input,
      timestamp: Timestamp.now(),
      ...(imageUrl && { imageUrl }),
    };

    // Optimistic UI update
    const newMessages = [...localMessages, userMessage];
    setLocalMessages(newMessages);

    // Save user message to Firestore
    await appendMessage(chat.id, userMessage);
    
    try {
        const plainHistory = newMessages.map(msg => ({
            role: msg.role,
            content: msg.content,
        }));
        
        const aiResponseContent = await getAIResponse(plainHistory as any, user.uid);

        const aiMessage: Message = {
            id: uuidv4(),
            role: 'assistant',
            content: aiResponseContent,
            timestamp: Timestamp.now(),
        };
        
        // Optimistic UI update for AI response
        setLocalMessages(prev => [...prev, aiMessage]);

        // Save AI message to Firestore
        await appendMessage(chat.id, aiMessage);
        
        const isNewChat = localMessages.length <= 1 && chat.title === 'Nuevo Chat';
        if (isNewChat) {
            const conversationForTitle = `User: ${userMessage.content}\nAssistant: ${aiResponseContent}`;
            const newTitle = await generateChatTitle(conversationForTitle);
            await updateChatTitle(chat.id, newTitle);
        }

        // Trigger the chatbot's "reflection" process in the background
        if (newMessages.length % 5 === 0) {
          const fullChatHistory = newMessages.map(msg => `[${msg.timestamp.toDate().toISOString()}] ${msg.role}: ${msg.content}`).join('\n');
          updatePsychologicalBlueprint({
            userId: user.uid,
            fullChatHistory: fullChatHistory
          }).catch(err => console.error("Error updating blueprint:", err));
        }

    } catch (error) {
        console.error("Error processing AI response:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo obtener una respuesta de la IA. Por favor, inténtalo de nuevo.",
        });
        // Revert user message on error
        setLocalMessages(localMessages);
    } finally {
        setIsResponding(false);
    }
  }, [user, localMessages, appendMessage, chat.id, updateChatTitle, toast]);


  return (
    <div className="flex flex-col h-full">
       <header className="flex h-14 items-center justify-between p-2 md:p-4 border-b">
        <div className="flex items-center gap-2">
          {isMobile && <SidebarTrigger />}
           <h2 className="text-base md:text-lg font-semibold truncate">
            {chat.title}
          </h2>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={localMessages} isResponding={isResponding} />
      </div>
      <div className="mt-auto px-2 py-4 md:px-4 md:py-4 border-t bg-background/95 backdrop-blur-sm">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isResponding || messagesLoading}
          chatHistory={localMessages}
        />
      </div>
    </div>
  );
}

export default memo(ChatPanel);
