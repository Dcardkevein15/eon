'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { useAuth, useFirestore, useCollection } from '@/firebase';
import type { Chat, Message } from '@/lib/types';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import ChatPanel from '@/components/chat/chat-panel';
import EmptyChat from '@/components/chat/empty-chat';

interface ChatLayoutProps {
  chatId?: string;
}

export default function ChatLayout({ chatId }: ChatLayoutProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  
  const chatsCollection = useMemo(() => 
    user?.uid ? collection(firestore, `users/${user.uid}/chats`) : undefined
  , [user?.uid, firestore]);

  const {
    data: chats,
    loading: chatsLoading,
    error,
  } = useCollection<Chat>(chatsCollection);
  const loading = authLoading || chatsLoading;

  const activeChat = useMemo(() => chats?.find((chat) => chat.id === chatId), [chats, chatId]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (activeChat) {
      setMessages(activeChat.messages || []);
    } else {
      setMessages([]);
    }
  }, [activeChat]);

  const createChat = useCallback(
    async (input: string) => {
      if (!user || !firestore) return;

      const title = input.substring(0, 100);
      const createdAt = Date.now();

      const newMessage: Omit<Message, 'id'> = {
        role: 'user',
        content: input,
        timestamp: createdAt,
      };

      try {
        const newChatRef = await addDoc(
          collection(firestore, `users/${user.uid}/chats`),
          {
            title,
            userId: user.uid,
            createdAt: serverTimestamp(),
            path: '', // Will be updated below
            messages: [newMessage],
          }
        );

        const path = `/c/${newChatRef.id}`;
        await updateDoc(newChatRef, { path });

        router.push(path);
      } catch (e) {
        console.error("Error creating chat:", e);
      }
    },
    [user, firestore, router]
  );

  const appendMessage = useCallback(
    async (chatId: string, message: Omit<Message, 'id'>) => {
      if (!user || !firestore) return;
      
      const currentChat = chats?.find(c => c.id === chatId);
      if (!currentChat) return;

      const chatRef = doc(firestore, `users/${user.uid}/chats`, chatId);
      const updatedMessages = [...currentChat.messages, message as Message];

      await updateDoc(chatRef, {
        messages: updatedMessages,
      });
    },
    [user, firestore, chats]
  );

  const removeChat = useCallback(
    async (chatId: string) => {
      if (!user || !firestore) return;
      const chatRef = doc(firestore, `users/${user.uid}/chats`, chatId);
      await deleteDoc(chatRef);

      if (activeChat?.id === chatId) {
        router.push('/');
      }
    },
    [user, firestore, activeChat, router]
  );

  const clearChats = useCallback(async () => {
    if (!user || !firestore || !chats) return;

    const batch = writeBatch(firestore);
    chats.forEach((chat) => {
      const chatRef = doc(firestore, `users/${user.uid}/chats`, chat.id);
      batch.delete(chatRef);
    });
    await batch.commit();

    router.push('/');
  }, [user, firestore, chats, router]);

  if (error) {
    return <p>Error: {error.message}</p>;
  }
  
  const chatWithLocalMessages = activeChat ? { ...activeChat, messages } : undefined;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar>
          <ChatSidebar
            chats={chats || []}
            activeChatId={chatId}
            isLoading={loading}
            removeChat={removeChat}
            clearChats={clearChats}
          />
        </Sidebar>
        <SidebarInset>
          {chatWithLocalMessages ? (
            <ChatPanel 
              chat={chatWithLocalMessages} 
              appendMessage={appendMessage} 
            />
          ) : (
            <EmptyChat createChat={createChat} />
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
