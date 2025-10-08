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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

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
      
      const newChatData = {
        title: 'Nuevo Chat',
        userId: user.uid,
        createdAt: serverTimestamp(),
        path: '',
      };

      const chatsCollectionRef = collection(firestore, `users/${user.uid}/chats`);

      addDoc(chatsCollectionRef, newChatData)
        .then(async (newChatRef) => {
          const path = `/c/${newChatRef.id}`;
          await updateDoc(newChatRef, { path });

          const messagesColRef = collection(newChatRef, 'messages');
          await addDoc(messagesColRef, userMessageContent)
            .catch(async (serverError) => {
               const permissionError = new FirestorePermissionError({
                  path: messagesColRef.path,
                  operation: 'create',
                  requestResourceData: userMessageContent,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            });

          router.push(path);
        })
        .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
            path: chatsCollectionRef.path,
            operation: 'create',
            requestResourceData: newChatData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        });
    },
    [user, firestore, router]
  );
  
  const appendMessage = useCallback(
    async (chatId: string, message: Omit<Message, 'id'>) => {
        if (!user || !firestore) return;
        const messagesColRef = collection(firestore, `users/${user.uid}/chats/${chatId}/messages`);
        
        addDoc(messagesColRef, message).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: messagesColRef.path,
              operation: 'create',
              requestResourceData: message,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
    },
    [user, firestore]
  );
  
  const updateChatTitle = useCallback(
    async (chatId: string, title: string) => {
      if (!user || !firestore) return;
      const chatRef = doc(firestore, `users/${user.uid}/chats`, chatId);
      updateDoc(chatRef, { title }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: chatRef.path,
          operation: 'update',
          requestResourceData: { title },
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });
    },
    [user, firestore]
  );


  const removeChat = useCallback(
    async (chatId: string) => {
      if (!user || !firestore) return;
      // Note: Deleting a document does not delete its subcollections.
      // For a production app, you'd need a Cloud Function to handle cascading deletes.
      // For this context, we just delete the main chat doc.
      const chatRef = doc(firestore, `users/${user.uid}/chats`, chatId);
      deleteDoc(chatRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: chatRef.path,
          operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      });

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
    batch.commit().catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            // This path is a simplification for the batch operation
            path: `users/${user.uid}/chats`,
            operation: 'delete',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    });
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
                appendMessage={appendMessage}
                updateChatTitle={updateChatTitle}
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
