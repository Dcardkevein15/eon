import ChatLayout from '@/components/chat/chat-layout';

type ChatPageProps = {
  params: {
    chatId: string;
  };
};

export default function ChatPage({ params }: ChatPageProps) {
  return <ChatLayout chatId={params.chatId} />;
}
