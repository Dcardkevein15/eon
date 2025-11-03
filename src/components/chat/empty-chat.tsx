
'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/logo';
import ChatInput from './chat-input';
import type { Message } from '@/lib/types';
import { Feather, Briefcase, Dumbbell, Star, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarTrigger } from '../ui/sidebar';
import { Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';


interface EmptyChatProps {
  createChat: (firstMessage: Omit<Message, 'id'>) => Promise<string | undefined>;
}

const corporateFeatures = [
    {
        title: 'Gimnasio Emocional',
        description: 'Practica conversaciones difíciles en un entorno seguro y controlado.',
        Icon: Dumbbell,
        href: '/gym'
    },
    {
        title: 'Marketplace de Terapeutas',
        description: 'Encuentra y conecta con profesionales verificados para un apoyo más profundo.',
        Icon: Briefcase,
        href: '/marketplace'
    },
    {
        title: 'Portal de Sueños',
        description: 'Descubre los mensajes de tu subconsciente a través del análisis de sueños.',
        Icon: Star,
        href: '/dreams'
    }
];

export default function EmptyChat({ createChat }: EmptyChatProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const chatInputRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  const handleCreateChat = useCallback(async (input: string, audioDataUri?: string) => {
      if ((!input.trim() && !audioDataUri) || isCreatingChat) return;

      setIsCreatingChat(true);
      const firstMessage: Omit<Message, 'id'> = {
          role: 'user',
          content: input,
          timestamp: Timestamp.now(),
          ...(audioDataUri && { content: `[Audio adjunto] ${input}` }),
      };
      
      const newChatId = await createChat(firstMessage);
      
      // La redirección ahora es manejada por chat-layout
      if (!newChatId) {
        setIsCreatingChat(false); // Reset on failure
      }
      
  }, [createChat, isCreatingChat]);

  const handleNewConversation = () => {
    chatInputRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => inputRef.current?.focus(), 400);
  };


  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 items-center justify-between p-2 md:p-4 border-b">
        <div className="flex items-center gap-2">
          {isMobile && <SidebarTrigger />}
          <h2 className="text-lg font-semibold tracking-wider">
            {isMobile ? 'MENÚ' : 'Bienvenido a NimbusChat'}
          </h2>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center text-center">
          <div className="max-w-4xl w-full flex flex-col items-center justify-center pt-8 md:pt-12">
            <AppLogo className="w-16 h-16 md:w-20 md:h-20 mx-auto" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mt-4">
            ¡tu-psicologo-ya!
            </h1>
            <p className="text-muted-foreground mt-2 text-base md:text-lg max-w-xl mx-auto">
              Un asistente profesional para el desahogo y control emocional, disponible 24/7.
            </p>

            <Button size="lg" className="mt-8" onClick={handleNewConversation}>
              <Feather className="mr-2 h-4 w-4" />
              Empezar a Escribir
            </Button>
          </div>
          
           <div className="w-full max-w-5xl mx-auto py-12" id="features">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {corporateFeatures.map((feature, index) => (
                    <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                      <div className="p-1 h-full">
                        <Card 
                            className="bg-card/50 hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer flex flex-col h-full"
                            onClick={() => router.push(feature.href)}
                        >
                            <CardHeader className="flex-row items-center gap-4 space-y-0">
                                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                                    <feature.Icon className="w-6 h-6 text-primary" />
                                </div>
                                <CardTitle>{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-0 flex-grow flex flex-col justify-between">
                                <CardDescription>
                                {feature.description}
                                </CardDescription>
                                <div className="flex items-center text-xs text-primary/80 font-semibold mt-4">
                                    <span>Explorar</span>
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </div>
                            </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden sm:inline-flex" />
                <CarouselNext className="hidden sm:inline-flex" />
              </Carousel>
          </div>

        </div>
      </div>
      <div
        className="px-2 py-4 md:px-4 md:py-4 border-t bg-background/95 backdrop-blur-sm"
        ref={chatInputRef}
      >
        <ChatInput
            ref={inputRef}
            onSendMessage={handleCreateChat}
            isLoading={isCreatingChat}
            suggestions={[]}
            onClearSuggestions={() => {}}
            onRefreshSuggestions={() => {}}
            isRefreshingSuggestions={false}
          />
      </div>
    </div>
  );
}
