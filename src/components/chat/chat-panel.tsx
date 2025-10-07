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
}

function ChatPanel({ chat }: ChatPanelProps) {
  const [isResponding, setIsResponding] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const firestore = useFirestore();

  // Set up the query for the messages subcollection
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
  
  const appendMessage = useCallback(
    async (message: Omit<Message, 'id'>) => {
        if (!user || !firestore || !chat.id) return;
        const messagesColRef = collection(firestore, `users/${user.uid}/chats/${chat.id}/messages`);
        await addDoc(messagesColRef, message);
    },
    [user, firestore, chat.id]
  );

  const updateChatTitle = useCallback(
    async (title: string) => {
      if (!user || !firestore) return;
      const chatRef = doc(firestore, `users/${user.uid}/chats`, chat.id);
      await updateDoc(chatRef, { title });
    },
    [user, firestore, chat.id]
  );

  const handleSendMessage = useCallback(async (input: string, imageUrl?: string) => {
    if ((!input.trim() && !imageUrl) || isResponding || !messages) return;
  
    const userMessage: Omit<Message, 'id'> = {
      role: 'user',
      content: input,
      timestamp: Timestamp.now(),
      ...(imageUrl && { imageUrl }),
    };
    
    await appendMessage(userMessage);
    
    const currentMessages: Message[] = [...messages, { ...userMessage, id: 'temp-id' }];
  
    setIsResponding(true);
  
    try {
      // Manually convert Timestamps to plain objects before sending to the server action.
      const plainHistory = currentMessages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp.toMillis(),
      }));

      // Get AI response
      const aiResponseContent = await getAIResponse(plainHistory as any);
  
      const aiMessage: Omit<Message, 'id'> = {
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Timestamp.now(),
      };
      
      await appendMessage(aiMessage);
  
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
  }, [messages, isResponding, appendMessage, toast]);
  
  // Effect to handle the very first AI response and title generation
  useEffect(() => {
    const processInitialMessage = async () => {
        if (messages && messages.length === 1 && messages[0].role === 'user' && !isResponding) {
            setIsResponding(true);
            try {
                // Manually convert Timestamps to plain objects before sending to the server action.
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
                await appendMessage(aiMessage);
                
                const conversationForTitle = `User: ${messages[0].content}\nAssistant: ${aiResponseContent}`;
                const newTitle = await generateChatTitle(conversationForTitle);
                await updateChatTitle(newTitle);
            } catch (error) {
                console.error("Error processing initial message:", error);
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "No se pudo iniciar la conversación con la IA. Intenta de nuevo.",
                });
            } finally {
                setIsResponding(false);
            }
        }
    };
    processInitialMessage();
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
