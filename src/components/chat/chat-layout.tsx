'use client';

import { useState, useEffect, useCallback } from 'react';
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

import { useAuth } from '@/components/providers';
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
import { useCollection } from '@/hooks/use-collection';
import { useFirestore } from '@/hooks/use-firebase';

interface ChatLayoutProps {
  chatId?: string;
}

export default function ChatLayout({ chatId }: ChatLayoutProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const {
    data: chats,
    loading: chatsLoading,
    error,
  } = useCollection<Chat>(
    user?.uid ? `users/${user.uid}/chats` : undefined
  );
  const loading = authLoading || chatsLoading;

  const activeChat = chats?.find((chat) => chat.id === chatId);

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
    },
    [user, firestore, router]
  );

  const appendMessage = useCallback(
    async (chatId: string, message: Omit<Message, 'id'>) => {
      if (!user || !firestore) return;
      if (!activeChat) return;

      const chatRef = doc(firestore, `users/${user.uid}/chats`, chatId);
      const updatedMessages = [...activeChat.messages, message];

      await updateDoc(chatRef, {
        messages: updatedMessages,
      });
    },
    [user, firestore, activeChat]
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
          {activeChat ? (
            <ChatPanel chat={activeChat} appendMessage={appendMessage} />
          ) : (
            <EmptyChat createChat={createChat} />
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
