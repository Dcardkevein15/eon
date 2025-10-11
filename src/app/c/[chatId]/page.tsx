'use client';

import ChatLayout from '@/components/chat/chat-layout';
import { useParams } from 'next/navigation';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId as string;

  return <ChatLayout chatId={chatId} />;
}
