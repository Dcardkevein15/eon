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
  query,
  Timestamp,
} from 'firebase/firestore';

import { useAuth, useCollection, useFirestore } from '@/firebase';
import type { Chat, Message } from '@/lib/types';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import ChatPanel from '@/components/chat/chat-panel';
import EmptyChat from '@/components/chat/empty-chat';
import { cn } from '@/lib/utils';
import { getAIResponse, generateChatTitle as genTitle } from '@/app/actions';

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
    async (input: string, imageUrl?: string) => {
      if (!user || !firestore) return;

      const userMessageContent: Omit<Message, 'id'> = {
        role: 'user',
        content: input,
        timestamp: Timestamp.now(),
        ...(imageUrl && { imageUrl }),
      };

      try {
        // 1. Create the main chat document first
        const newChatRef = await addDoc(
          collection(firestore, `users/${user.uid}/chats`),
          {
            title: 'Nuevo Chat',
            userId: user.uid,
            createdAt: serverTimestamp(),
            path: '',
          }
        );

        const path = `/c/${newChatRef.id}`;
        await updateDoc(newChatRef, { path });

        // 2. Add the user's first message to the 'messages' subcollection
        const messagesColRef = collection(newChatRef, 'messages');
        await addDoc(messagesColRef, userMessageContent);

        // 3. Navigate to the new chat page
        router.push(path);
      } catch (e) {
        console.error('Error creating chat:', e);
      }
    },
    [user, firestore, router]
  );

  const removeChat = useCallback(
    async (chatId: string) => {
      if (!user || !firestore) return;
      // Note: Deleting a document does not delete its subcollections.
      // For a production app, you'd need a Cloud Function to handle cascading deletes.
      // For this context, we just delete the main chat doc.
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
    // Again, subcollections are not deleted here.

    router.push('/');
  }, [user, firestore, chats, router]);

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <SidebarProvider>
      <div className="bg-background text-foreground">
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
          <div className={cn('flex flex-col', chatId ? 'h-screen' : 'min-h-screen')}>
            {chatId && activeChat ? (
              <ChatPanel
                chat={activeChat}
              />
            ) : (
              <EmptyChat createChat={createChat} />
            )}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default memo(ChatLayout);
