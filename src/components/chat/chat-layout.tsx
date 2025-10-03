'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

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

interface ChatLayoutProps {
  chatId?: string;
}

export default function ChatLayout({ chatId }: ChatLayoutProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      try {
        const storedChats = localStorage.getItem(`chats_${user.uid}`);
        if (storedChats) {
          setChats(JSON.parse(storedChats));
        } else {
          setChats([]);
        }
      } catch (error) {
        console.error("Failed to parse chats from localStorage", error);
        setChats([]);
      } finally {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!loading && user?.uid) {
      localStorage.setItem(`chats_${user.uid}`, JSON.stringify(chats));
    }
  }, [chats, user?.uid, loading]);

  const activeChat = chats.find((chat) => chat.id === chatId);

  const createChat = useCallback(
    (input: string) => {
      if (!user) return;

      const title = input.substring(0, 100);
      const id = uuidv4();
      const createdAt = Date.now();
      const path = `/c/${id}`;

      const newMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: input,
        timestamp: createdAt,
      };

      const newChat: Chat = {
        id,
        title,
        userId: user.uid,
        createdAt,
        path,
        messages: [newMessage],
      };

      setChats((prev) => [newChat, ...prev]);
      router.push(path);
      return newChat;
    },
    [user, router]
  );
  
  const appendMessage = useCallback((chatId: string, message: Message) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === chatId) {
        const newMessages = [...chat.messages, message];
        return { ...chat, messages: newMessages };
      }
      return chat;
    }));
  }, []);

  const removeChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (activeChat?.id === chatId) {
      router.push('/');
    }
  }, [activeChat, router]);

  const clearChats = useCallback(() => {
    setChats([]);
    router.push('/');
  }, [router]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar>
          <ChatSidebar
            chats={chats}
            activeChatId={chatId}
            isLoading={loading}
            removeChat={removeChat}
            clearChats={clearChats}
          />
        </Sidebar>
        <SidebarInset>
          {activeChat ? (
            <ChatPanel
              chat={activeChat}
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
