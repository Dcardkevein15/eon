'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/logo';
import ChatInput from './chat-input';
import { getSuggestions } from '@/app/actions';
import type { PromptSuggestion } from '@/lib/types';

interface EmptyChatProps {
  createChat: (input: string) => void;
}

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export default function EmptyChat({ createChat }: EmptyChatProps) {
  const [showChatInput, setShowChatInput] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [suggestionsPool, setSuggestionsPool] = useState<PromptSuggestion[]>([]);
  const [displaySuggestions, setDisplaySuggestions] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const fetchAndCacheSuggestions = async () => {
      try {
        const cachedData = localStorage.getItem('suggestionsCache');
        const now = new Date().getTime();

        if (cachedData) {
          const { pool, fetchedAt } = JSON.parse(cachedData);
          if (pool && Array.isArray(pool) && now - fetchedAt < CACHE_TTL) {
            setSuggestionsPool(pool);
            return;
          }
        }

        const newSuggestions = await getSuggestions();
        setSuggestionsPool(newSuggestions);
        localStorage.setItem(
          'suggestionsCache',
          JSON.stringify({ pool: newSuggestions, fetchedAt: now })
        );
      } catch (error) {
        console.error('Failed to fetch or cache suggestions:', error);
      }
    };

    fetchAndCacheSuggestions();
  }, []);

  const selectCategorizedSuggestions = () => {
    if (suggestionsPool.length > 0) {
      const categories = [...new Set(suggestionsPool.map(s => s.category))];
      const shuffledCategories = categories.sort(() => 0.5 - Math.random());
      const selectedCategories = shuffledCategories.slice(0, 6);
      
      const newSuggestions = selectedCategories.map(category => {
        const suggestionsForCategory = suggestionsPool.filter(s => s.category === category);
        return suggestionsForCategory[Math.floor(Math.random() * suggestionsForCategory.length)].text;
      });

      setDisplaySuggestions(newSuggestions);
    }
  };

  useEffect(() => {
    if(suggestionsPool.length > 0) {
      selectCategorizedSuggestions();
    }
  }, [suggestionsPool]);

  const handleNewConversation = () => {
    setShowChatInput(true);
    selectCategorizedSuggestions(); // Refresh suggestions when starting a new chat
  };

  useEffect(() => {
    if (showChatInput) {
      inputRef.current?.focus();
    }
  }, [showChatInput]);

  const handleSuggestionClick = (suggestion: string) => {
    createChat(suggestion);
  };

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <div className="max-w-4xl w-full flex-grow flex flex-col items-center justify-center">
          <AppLogo className="w-16 h-16 md:w-20 md:h-20 mx-auto text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold mt-4">Bienvenido a ¡tu-psicologo-ya!</h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-lg mx-auto">
            Tu asistente profesional para el desahogo y control emocional.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <div className="max-w-4xl w-full flex-grow flex flex-col items-center justify-center">
        <AppLogo className="w-16 h-16 md:w-20 md:h-20 mx-auto text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold mt-4">Bienvenido a ¡tu-psicologo-ya!</h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-lg mx-auto">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {displaySuggestions.map((s, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    onClick={() => handleSuggestionClick(s)}
                    className="text-xs md:text-sm h-auto py-2"
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
