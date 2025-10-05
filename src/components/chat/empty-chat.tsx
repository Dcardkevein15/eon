'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/logo';
import ChatInput from './chat-input';
import { getSuggestions } from '@/app/actions';
import type { PromptSuggestion } from '@/lib/types';
import { HeartHandshake, MessageCircleHeart, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarTrigger } from '../ui/sidebar';

interface EmptyChatProps {
  createChat: (input: string) => void;
}

export default function EmptyChat({ createChat }: EmptyChatProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [suggestionsPool, setSuggestionsPool] = useState<PromptSuggestion[]>([]);
  const [displaySuggestions, setDisplaySuggestions] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const chatInputRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const selectCategorizedSuggestions = (pool: PromptSuggestion[]) => {
    if (pool && pool.length > 0) {
      const categories = [...new Set(pool.map((s) => s.category))];
      const shuffledCategories = categories.sort(() => 0.5 - Math.random());
      const selectedCategories = shuffledCategories.slice(0, 6);

      const newSuggestions = selectedCategories.map((category) => {
        const suggestionsForCategory = pool.filter(
          (s) => s.category === category
        );
        return suggestionsForCategory[
          Math.floor(Math.random() * suggestionsForCategory.length)
        ].text;
      });

      setDisplaySuggestions(newSuggestions);
    }
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const newSuggestions = await getSuggestions();
        setSuggestionsPool(newSuggestions);
        selectCategorizedSuggestions(newSuggestions);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    if (isClient) {
      fetchSuggestions();
    }
  }, [isClient]);

  const handleNewConversation = () => {
    chatInputRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => inputRef.current?.focus(), 400);
    selectCategorizedSuggestions(suggestionsPool); // Refresh suggestions
  };

  const handleSuggestionClick = (suggestion: string) => {
    createChat(suggestion);
  };

  if (!isClient) {
    return (
      <div className="flex flex-col h-full">
        <header className="flex h-14 items-center justify-between p-2 md:p-4 border-b">
          <div className="flex items-center gap-2">
            {isMobile && <SidebarTrigger />}
            <h2 className="text-base md:text-lg font-semibold truncate">MENÚ</h2>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center flex-1 p-4 text-center">
          <div className="max-w-4xl w-full flex-grow flex flex-col items-center justify-center">
            <AppLogo className="w-16 h-16 md:w-20 md:h-20 mx-auto text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold mt-4">
              Bienvenido a ¡tu-psicologo-ya!
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-lg mx-auto">
              Tu asistente profesional para el desahogo y control emocional.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
       <header className="flex h-14 items-center justify-between p-2 md:p-4 border-b">
        <div className="flex items-center gap-2">
          {isMobile && <SidebarTrigger />}
          <h2 className="text-base md:text-lg font-semibold truncate">MENÚ</h2>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col items-center text-center">
          <div className="max-w-4xl w-full flex flex-col items-center justify-center pt-12 md:pt-0">
            <AppLogo className="w-16 h-16 md:w-20 md:h-20 mx-auto text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold mt-4">
              Bienvenido a ¡tu-psicologo-ya!
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-lg mx-auto">
              Tu asistente profesional para el desahogo y control emocional.
            </p>

            <Button size="lg" className="mt-8" onClick={handleNewConversation}>
              Nueva Conversación
            </Button>
          </div>
          <div className="w-full max-w-5xl mx-auto py-12" id="features">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <Card className="bg-background/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <HeartHandshake className="w-8 h-8 text-primary" />
                    <span>Espacio de Desahogo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Un lugar seguro y confidencial para expresar tus emociones y
                    pensamientos sin juicios.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-background/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Stethoscope className="w-8 h-8 text-primary" />
                    <span>Orientación Profesional</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Recibe análisis preliminares y, si es necesario, la
                    recomendación de contactar a un psicólogo.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-background/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-2">
                    <MessageCircleHeart className="w-8 h-8 text-primary" />
                    <span>Respuestas Empáticas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Conversa con una IA entrenada para ofrecerte un trato
                    comprensivo y profesional en todo momento.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <div className="p-2 md:p-4 border-t bg-background/80 backdrop-blur-sm" ref={chatInputRef}>
        <div className="w-full max-w-4xl mx-auto space-y-4">
          {loadingSuggestions ? (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Generando sugerencias...
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : displaySuggestions.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Para empezar, puedes probar con:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {displaySuggestions.map((s, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    onClick={() => handleSuggestionClick(s)}
                    className="text-xs md:text-sm h-auto py-3 whitespace-normal text-center"
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}
          <ChatInput
            ref={inputRef}
            onSendMessage={createChat}
            isLoading={false}
            chatHistory={[]}
          />
        </div>
      </div>
    </div>
  );
}
