'use client';

import Link from 'next/link';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarMenuSkeleton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import type { Chat } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AppLogo } from '@/components/logo';
import UserButton from '@/components/chat/user-button';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useState, useEffect } from 'react';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId?: string;
  isLoading: boolean;
  removeChat: (chatId: string) => void;
  clearChats: () => void;
}

export default function ChatSidebar({
  chats,
  activeChatId,
  isLoading,
  removeChat,
  clearChats
}: ChatSidebarProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getFormattedDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };

  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <AppLogo className="w-8 h-8 text-primary" />
            <span className="text-lg font-semibold">¡tu-psicologo-ya!</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/" aria-label="Nuevo chat">
              <Plus />
            </Link>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-1">
        <ScrollArea className="h-full p-2">
          {isLoading || !isClient ? (
            <div className="space-y-2">
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton showIcon />
              <SidebarMenuSkeleton showIcon />
            </div>
          ) : chats.length > 0 ? (
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeChatId === chat.id}
                    className="h-auto py-2"
                  >
                    <Link href={chat.path} className="flex flex-col items-start">
                      <span className="truncate max-w-full">{chat.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {getFormattedDate(chat.createdAt)}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/menu-item:opacity-100">
                        <Trash2 className="w-4 h-4"/>
                       </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esto eliminará permanentemente este chat. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeChat(chat.id)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aún no hay chats. ¡Empieza uno nuevo!
            </div>
          )}
        </ScrollArea>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2">
        {isClient && chats.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <Trash2 className="mr-2 h-4 w-4" />
                Limpiar conversaciones
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutely seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto eliminará permanentemente todas tus conversaciones de chat. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={clearChats}>Limpiar todo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <UserButton />
      </SidebarFooter>
    </>
  );
}
