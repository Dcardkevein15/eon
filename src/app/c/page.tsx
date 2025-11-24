
'use client';
import ChatLayout from '@/components/chat/chat-layout';
import { createChat } from './actions';
import EmptyChat from '@/components/chat/empty-chat';

export default function ChatRootPage() {
  return <ChatLayout createChat={createChat} />;
}
