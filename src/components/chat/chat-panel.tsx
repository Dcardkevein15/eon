'use client';

import { useState, useCallback, memo, useEffect, useMemo } from 'react';
import type { Chat, Message } from '@/lib/types';
import { getAIResponse, generateChatTitle } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSidebar, SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';

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
  
  const { data: messages, loading: messagesLoading } = useCollection<Message>(messagesQuery);
  
  const handleSendMessage = useCallback(async (input: string, imageUrl?: string) => {
    if (!input.trim() && !imageUrl) return;

    const userMessage: Omit<Message, 'id'> = {
      role: 'user',
      content: input,
      timestamp: Timestamp.now(),
      ...(imageUrl && { imageUrl }),
    };
    
    await appendMessage(chat.id, userMessage);
  }, [appendMessage, chat.id]);

  useEffect(() => {
    const processAIResponse = async () => {
        if (!messages || messages.length === 0 || isResponding) return;

        const lastMessage = messages[messages.length - 1];
        if (lastMessage.role === 'user') {
            setIsResponding(true);
            try {
                const plainHistory = messages.map(msg => ({
                  ...msg,
                  timestamp: msg.timestamp.toMillis(),
                }));

                const aiResponseContent = await getAIResponse(plainHistory as any);

                const aiMessage: Omit<Message, 'id'> = {
                    role: 'assistant',
                    content: aiResponseContent,
                    timestamp: Timestamp.now(),
                };
                await appendMessage(chat.id, aiMessage);
                
                if (messages.length <= 2 && chat.title === 'Nuevo Chat') {
                    const conversationForTitle = `User: ${messages[0].content}\nAssistant: ${aiResponseContent}`;
                    const newTitle = await generateChatTitle(conversationForTitle);
                    await updateChatTitle(chat.id, newTitle);
                }

            } catch (error) {
                console.error("Error processing AI response:", error);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "No se pudo obtener una respuesta de la IA.",
                });
            } finally {
                setIsResponding(false);
            }
        }
    };
    processAIResponse();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isResponding]);


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
        <ChatMessages messages={messages || []} isResponding={isResponding} />
      </div>
      <div className="mt-auto px-2 py-4 md:px-4 md:py-4 border-t bg-background/95 backdrop-blur-sm">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isResponding || messagesLoading}
          chatHistory={messages || []}
        />
      </div>
    </div>
  );
}

export default memo(ChatPanel);
