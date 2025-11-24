'use client';
import ChatLayout from '@/components/chat/chat-layout';
import EmptyChat from '@/components/chat/empty-chat';

export default function ChatRootPage() {
  // The createChat function is handled within the ChatLayout/EmptyChat components
  // and doesn't need to be passed down from here.
  return <ChatLayout />;
}
