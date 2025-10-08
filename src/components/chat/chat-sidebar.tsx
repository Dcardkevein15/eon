'use client';

import Link from 'next/link';
import { Plus, Trash2, History, Briefcase, UserCircle } from 'lucide-react';
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
import React, { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useAuth } from '@/firebase';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId?: string;
  isLoading: boolean;
  removeChat: (chatId: string) => void;
  clearChats: () => void;
}

function ChatSidebar({
  chats,
  activeChatId,
  isLoading,
  removeChat,
  clearChats
}: ChatSidebarProps) {
  const [isClient, setIsClient] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getFormattedDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp && typeof timestamp.toDate === 'function' 
        ? timestamp.toDate() 
        : new Date(timestamp);
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
            <AppLogo className="w-8 h-8" />
            <span className="text-lg font-semibold tracking-wider">NIMBUS</span>
          </div>
        </div>
        <div className="p-2 space-y-2">
          <Button asChild className="w-full justify-center">
            <Link href="/">
              <Plus className="mr-2 h-4 w-4" />
              NUEVA CONVERSACIÓN
            </Link>
          </Button>
          {user && (
            <>
              <Button asChild variant="secondary" className="w-full justify-center">
                <Link href="/marketplace">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Marketplace
                </Link>
              </Button>
               <Button asChild variant="secondary" className="w-full justify-center">
                <Link href="/profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  Perfil Psicológico
                </Link>
              </Button>
            </>
          )}
        </div>
      </SidebarHeader>
      <div className='px-4 pt-4 pb-2'>
          <h2 className='text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2'>
            <History className="h-4 w-4" />
            Historial
          </h2>
      </div>
      <SidebarContent className="flex-1">
        <ScrollArea className="h-full px-2">
          {isLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : isClient && chats.length > 0 ? (
            <ul className="space-y-1 p-2">
              {chats.map((chat) => (
                <li key={chat.id} className="relative group/menu-item">
                  <Link href={chat.path} className={cn(
                    "h-auto w-full justify-start text-left flex flex-col items-start p-2 rounded-md min-w-0 transition-colors",
                    activeChatId === chat.id 
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
                      : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}>
                    <div className="flex-1 min-w-0">
                      <span className="block truncate w-full font-medium">{chat.title}</span>
                      <span className="text-xs text-muted-foreground block w-full">
                        {getFormattedDate(chat.createdAt)}
                      </span>
                    </div>
                  </Link>
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
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aún no hay chats. ¡Empieza uno nuevo!
            </div>
          )}
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
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

export default memo(ChatSidebar);
