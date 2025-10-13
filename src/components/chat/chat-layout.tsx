'use client';

import { useCallback, useMemo, memo } from 'react';
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
  orderBy,
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { determineAnchorRole } from '@/app/actions';

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
        ? query(
            collection(firestore, `users/${user.uid}/chats`),
            orderBy('latestMessageAt', 'desc')
          )
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
    async (firstMessage: Omit<Message, 'id'>): Promise<string | undefined> => {
      if (!user || !firestore) return;

      const anchorRole = await determineAnchorRole(firstMessage.content);

      const newChatData = {
        title: 'Nuevo Chat',
        userId: user.uid,
        createdAt: serverTimestamp(),
        path: '',
        latestMessageAt: firstMessage.timestamp,
        anchorRole: anchorRole,
      };
      
      const chatsCollectionRef = collection(firestore, `users/${user.uid}/chats`);
      
      try {
        const newChatRef = await addDoc(chatsCollectionRef, newChatData);
        const path = `/c/${newChatRef.id}`;
        
        await updateDoc(newChatRef, { path });

        const messagesColRef = collection(newChatRef, 'messages');
        await addDoc(messagesColRef, firstMessage);

        router.push(path);
        return newChatRef.id;
      } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: chatsCollectionRef.path,
            operation: 'create',
            requestResourceData: newChatData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        } else {
           console.error("Error creating chat:", serverError);
        }
        return undefined;
      }
    },
    [user, firestore, router]
  );
  
  const appendMessage = useCallback(
    async (chatId: string, message: Omit<Message, 'id'>) => {
        if (!user || !firestore) return;
        const messagesColRef = collection(firestore, `users/${user.uid}/chats/${chatId}/messages`);
        const chatRef = doc(firestore, `users/${user.uid}/chats/${chatId}`);
        
        try {
          await addDoc(messagesColRef, message);
          // Also update the latestMessageAt timestamp on the parent chat document
          await updateDoc(chatRef, { latestMessageAt: message.timestamp });
        } catch (serverError: any) {
          if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: messagesColRef.path,
              operation: 'write', // Covers create (message) and update (chat)
              requestResourceData: message,
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
          } else {
             console.error("Error appending message and updating chat:", serverError);
          }
        }
    },
    [user, firestore]
  );
  
  const updateChatTitle = useCallback(
    async (chatId: string, title: string) => {
      if (!user || !firestore || !title) return;
      const chatRef = doc(firestore, `users/${user.uid}/chats`, chatId);
      updateDoc(chatRef, { title }).catch((serverError) => {
        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: chatRef.path,
            operation: 'update',
            requestResourceData: { title },
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        } else {
           console.error("Error updating title:", serverError);
        }
      });
    },
    [user, firestore]
  );


  const removeChat = useCallback(
    async (chatId: string) => {
      if (!user || !firestore) return;
      const chatRef = doc(firestore, `users/${user.uid}/chats`, chatId);
      deleteDoc(chatRef).catch((serverError) => {
        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: chatRef.path,
            operation: 'delete',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
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
    batch.commit().catch((serverError) => {
        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
              path: `users/${user.uid}/chats`,
              operation: 'delete',
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
    });

    router.push('/');
  }, [user, firestore, chats, router]);

  if (error) {
    // In a real app, you'd want a nicer error boundary
    return <div className='flex items-center justify-center h-screen'>Error: {error.message}</div>;
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
                key={chatId} // Ensure re-mount when chat changes
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
