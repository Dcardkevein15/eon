'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/logo';
import ChatInput from './chat-input';
import { getSuggestions } from '@/app/actions';
import type { PromptSuggestion } from '@/lib/types';
import {
  HeartHandshake,
  MessageCircleHeart,
  Stethoscope,
  Brain,
  Smile,
  Bed,
  Feather,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarTrigger } from '../ui/sidebar';

interface EmptyChatProps {
  createChat: (input: string, imageUrl?: string) => void;
}

const categoryIcons: { [key: string]: React.ElementType } = {
  estrés: Zap,
  motivación: Smile,
  hábitos: Bed,
  desahogo: Feather,
  ansiedad: Brain,
  relaciones: HeartHandshake,
  bienestar: MessageCircleHeart,
  default: MessageCircleHeart,
};

const getIconForCategory = (category: string) => {
  return categoryIcons[category.toLowerCase()] || categoryIcons.default;
};


export default function EmptyChat({ createChat }: EmptyChatProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [suggestionsPool, setSuggestionsPool] = useState<PromptSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const chatInputRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);
      try {
        const newSuggestions = await getSuggestions();
        setSuggestionsPool(newSuggestions);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, []);

  const displaySuggestions = useMemo(() => {
    if (!suggestionsPool || suggestionsPool.length === 0) {
      return [];
    }
    const categories = [...new Set(suggestionsPool.map((s) => s.category))];
    const shuffledCategories = categories.sort(() => 0.5 - Math.random());
    const selectedCategories = shuffledCategories.slice(0, 6);

    const newSuggestions = selectedCategories.map((category) => {
      const suggestionsForCategory = suggestionsPool.filter(
        (s) => s.category === category
      );
      return suggestionsForCategory[
        Math.floor(Math.random() * suggestionsForCategory.length)
      ];
    });

    return newSuggestions.filter(Boolean);
  }, [suggestionsPool]);
  
  const handleSuggestionClick = (suggestion: string) => {
    createChat(suggestion);
  };

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
             <div className="grid md:grid-cols-3 gap-4 text-left">
              <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <HeartHandshake className="w-6 h-6 text-accent" />
                    <span className="text-lg">Espacio de Desahogo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Un lugar seguro y confidencial para expresar tus emociones y
                    pensamientos sin juicios.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Stethoscope className="w-6 h-6 text-accent" />
                    <span className="text-lg">Orientación Profesional</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Recibe análisis preliminares y recomendaciones de psicólogos.
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <MessageCircleHeart className="w-6 h-6 text-accent" />
                    <span className="text-lg">Respuestas Empáticas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Conversa con una IA entrenada para un trato comprensivo y profesional.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <div
        className="px-2 py-4 md:px-4 md:py-4 border-t bg-background/95 backdrop-blur-sm"
        ref={chatInputRef}
      >
        <div className="w-full max-w-4xl mx-auto space-y-4">
          {loadingSuggestions ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : displaySuggestions.length > 0 && (
            <div>
               <p className="text-sm text-muted-foreground mb-3 px-2">
                O prueba con una de estas sugerencias para empezar:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {displaySuggestions.map((suggestion, i) => {
                  const Icon = getIconForCategory(suggestion.category);
                  return (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion.text)}
                      className="p-4 rounded-lg bg-card hover:bg-card/80 border border-card-border/50 text-left transition-all duration-200 hover:border-primary/50 hover:scale-[1.02] flex items-start gap-4"
                    >
                      <Icon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-medium">{suggestion.text}</span>
                    </button>
                  );
                })}
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
