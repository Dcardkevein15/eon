'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  writeBatch,
  arrayUnion,
  query,
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

function ChatLayout({ chatId }: ChatLayoutProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();

  const chatsQuery = useMemo(
    () =>
      user?.uid && firestore
        ? query(collection(firestore, `users/${user.uid}/chats`))
        : undefined,
    [user?.uid, firestore]
  );

  const {
    data: chats,
    loading: chatsLoading,
    error,
  } = useCollection<Chat>(chatsQuery);
  const loading = authLoading || chatsLoading;

  const activeChat = useMemo(
    () => chats?.find((chat) => chat.id === chatId),
    [chats, chatId]
  );

  const createChat = useCallback(
    async (input: string) => {
      if (!user || !firestore) return;

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
            title: 'Nuevo Chat', // Temporary title
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
        console.error('Error creating chat:', e);
      }
    },
    [user, firestore, router]
  );

  const appendMessages = useCallback(
    async (chatId: string, messages: Omit<Message, 'id'>[]) => {
      if (!user || !firestore) return;

      const chatRef = doc(firestore, `users/${user.uid}/chats`, chatId);

      await updateDoc(chatRef, {
        messages: arrayUnion(...messages),
      });
    },
    [user, firestore]
  );

  const updateChatTitle = useCallback(
    async (chatId: string, title: string) => {
      if (!user || !firestore) return;
      const chatRef = doc(firestore, `users/${user.uid}/chats`, chatId);
      await updateDoc(chatRef, { title });
    },
    [user, firestore]
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
          {chatId && activeChat ? (
            <ChatPanel
              chat={activeChat}
              appendMessages={appendMessages}
              updateChatTitle={updateChatTitle}
            />
          ) : (
            <EmptyChat createChat={createChat} />
          )}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


export default memo(ChatLayout);
