'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/logo';
import ChatInput from './chat-input';
import { getSuggestions } from '@/app/actions';

interface EmptyChatProps {
  createChat: (input: string) => void;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default function EmptyChat({ createChat }: EmptyChatProps) {
  const [showChatInput, setShowChatInput] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [displaySuggestions, setDisplaySuggestions] = useState<string[]>([]);

  useEffect(() => {
    const fetchAndCacheSuggestions = async () => {
      try {
        const cachedData = localStorage.getItem('suggestionsCache');
        const now = new Date().getTime();

        if (cachedData) {
          const { suggestionsPool, fetchedAt } = JSON.parse(cachedData);
          if (now - fetchedAt < CACHE_TTL) {
            setSuggestions(suggestionsPool);
            return;
          }
        }

        const newSuggestions = await getSuggestions();
        setSuggestions(newSuggestions);
        localStorage.setItem(
          'suggestionsCache',
          JSON.stringify({ suggestionsPool: newSuggestions, fetchedAt: now })
        );
      } catch (error) {
        console.error('Failed to fetch or cache suggestions:', error);
      }
    };

    fetchAndCacheSuggestions();
  }, []);

  const selectRandomSuggestions = () => {
    if (suggestions.length > 0) {
      const shuffled = [...suggestions].sort(() => 0.5 - Math.random());
      setDisplaySuggestions(shuffled.slice(0, 6));
    }
  };

  useEffect(() => {
    selectRandomSuggestions();
  }, [suggestions]);

  const handleNewConversation = () => {
    setShowChatInput(true);
    selectRandomSuggestions(); // Refresh suggestions when starting a new chat
  };

  useEffect(() => {
    if (showChatInput) {
      inputRef.current?.focus();
    }
  }, [showChatInput]);

  const handleSuggestionClick = (suggestion: string) => {
    createChat(suggestion);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <div className="max-w-4xl w-full flex-grow flex flex-col items-center justify-center">
        <AppLogo className="w-16 h-16 md:w-20 md:h-20 mx-auto text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold mt-4">Bienvenido a ¡tu-psicologo-ya!</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Tu asistente profesional para el desahogo y control emocional.
        </p>
        
        {!showChatInput && (
          <Button 
            size="lg" 
            className="mt-8"
            onClick={handleNewConversation}
          >
            Nueva Conversación
          </Button>
        )}
      </div>
      
      {showChatInput && (
         <div className="w-full pb-4 space-y-4">
          {displaySuggestions.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Para empezar, puedes probar con:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {displaySuggestions.map((s, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(s)}
                    className="rounded-full text-xs md:text-sm"
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
      )}
    </div>
  );
}
