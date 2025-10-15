'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/logo';
import ChatInput from './chat-input';
import { getSuggestions } from '@/app/actions';
import type { Message, PromptSuggestion } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { useTypingEffect } from '@/hooks/use-typing-effect';
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
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';


interface EmptyChatProps {
  createChat: (firstMessage: Omit<Message, 'id'>) => Promise<string | undefined>;
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

const featureCards = [
    {
        id: 1,
        title: 'Espacio de Desahogo',
        Icon: HeartHandshake,
        description: 'Un lugar seguro y confidencial para expresar tus emociones y pensamientos sin juicios, disponible 24/7.',
        detailedDescription: 'Encuentra un refugio digital donde cada palabra es bienvenida. Nuestro sistema está diseñado para escuchar sin prejuicios, permitiéndote explorar tus sentimientos más profundos con total libertad y confidencialidad. Es tu espacio para ser vulnerable.'
    },
    {
        id: 2,
        title: 'Orientación Profesional',
        Icon: Stethoscope,
        description: 'Recibe análisis preliminares y recomendaciones basadas en principios psicológicos sólidos.',
        detailedDescription: 'Nuestra IA, entrenada con extensos conocimientos de psicología, identifica patrones y te ofrece perspectivas basadas en evidencia. No es un diagnóstico, sino una poderosa herramienta de autoconocimiento para entender mejor el "porqué" de tus sentimientos.'
    },
    {
        id: 3,
        title: 'Respuestas Empáticas',
        Icon: MessageCircleHeart,
        description: 'Conversa con una IA entrenada para un trato comprensivo, cálido y profesional.',
        detailedDescription: 'Más allá de los datos, hemos enseñado a Nimbus a comprender el matiz emocional. Espera respuestas que validen tu experiencia, te hagan sentir comprendido y te guíen con la calidez y el respeto que mereces en tu viaje interior.'
    },
];

const TriptychCard = ({ card, isSelected, onSelect }: { card: typeof featureCards[0], isSelected: boolean, onSelect: (id: number) => void }) => {
  return (
     <motion.div
      layoutId={`card-container-${card.id}`}
      onClick={() => onSelect(card.id)}
      className={cn(
        "absolute w-56 h-44 md:w-72 md:h-48 rounded-2xl cursor-pointer shadow-2xl shadow-primary/10 border border-border/30",
         isSelected && "pointer-events-none"
      )}
       style={{
          transformOrigin: 'bottom center',
       }}
       initial={false}
       animate={isSelected ? {
           opacity: 0,
           transition: { duration: 0.3, delay: 0.1 }
       } : {}}
    >
        <Card className="w-full h-full bg-card/70 backdrop-blur-sm hover:border-primary/50 transition-colors duration-300">
            <CardHeader className="items-center text-center p-4">
                <motion.div layoutId={`card-icon-${card.id}`}>
                    <card.Icon className="w-8 h-8 text-accent" />
                </motion.div>
                <CardTitle>
                    <motion.span layoutId={`card-title-${card.id}`} className="text-base md:text-lg">
                        {card.title}
                    </motion.span>
                </CardTitle>
            </CardHeader>
            <CardContent className="text-center text-xs md:text-sm text-muted-foreground p-4 pt-0">
                {card.description}
            </CardContent>
        </Card>
    </motion.div>
  )
}

const ExpandedCard = ({ card, onDeselect }: { card: typeof featureCards[0], onDeselect: () => void }) => {
    const displayText = useTypingEffect(card.detailedDescription, 50);

    return (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-lg"
          onClick={onDeselect}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
            <motion.div 
                className="w-[90vw] max-w-lg h-auto rounded-2xl shadow-2xl shadow-primary/20 border border-primary/30 overflow-hidden" 
                layoutId={`card-container-${card.id}`}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the card
            >
                <Card className="w-full h-full bg-card/80">
                     <CardHeader className="items-center text-center p-6">
                        <motion.div layoutId={`card-icon-${card.id}`}>
                            <card.Icon className="w-10 h-10 text-accent" />
                        </motion.div>
                        <CardTitle>
                            <motion.span layoutId={`card-title-${card.id}`} className="text-2xl">
                                {card.title}
                            </motion.span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-base text-muted-foreground p-6 pt-0 min-h-[150px]">
                        <p>{displayText}</p>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    )
}


export default function EmptyChat({ createChat }: EmptyChatProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [suggestionsPool, setSuggestionsPool] = useState<PromptSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  const chatInputRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
  
  const handleCreateChat = useCallback(async (input: string, imageUrl?: string) => {
      if ((!input.trim() && !imageUrl) || isCreatingChat) return;

      setIsCreatingChat(true);
      const firstMessage: Omit<Message, 'id'> = {
          role: 'user',
          content: input,
          timestamp: Timestamp.now(),
          ...(imageUrl && { imageUrl }),
      };
      await createChat(firstMessage);
      // isCreatingChat will remain true, as the page will redirect.
  }, [createChat, isCreatingChat]);

  const handleSuggestionClick = (suggestion: string) => {
    handleCreateChat(suggestion);
  };

  const handleNewConversation = () => {
    chatInputRef.current?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => inputRef.current?.focus(), 400);
  };
  
  const selectedFeature = useMemo(() => featureCards.find(c => c.id === selectedId), [selectedId]);


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
          
          <div className="w-full max-w-5xl mx-auto pt-16 pb-12" id="features">
             <div className="relative h-56 flex items-center justify-center">
                 {featureCards.map((card, index) => {
                    const xOffset = isMobile ? 100 : 150;
                    const xAnimate = isMobile ? 200 : 300;
                    return (
                        <motion.div
                            key={card.id}
                            className="absolute"
                            initial={{
                                x: (index - 1) * (xOffset * 0.8),
                                scale: index === 1 ? 1 : 0.9,
                                rotateY: index === 0 ? 15 : index === 2 ? -15 : 0,
                                zIndex: index === 1 ? 10 : 0
                            }}
                            animate={{
                                x: selectedId === null ? (index - 1) * xOffset : (index - 1) * xAnimate,
                                scale: selectedId === null ? (index === 1 ? 1 : 0.9) : (card.id === selectedId ? 1 : 0.8),
                                opacity: selectedId === null ? 1 : (card.id === selectedId ? 0 : 0.5),
                                rotateY: selectedId === null ? (index === 0 ? 15 : index === 2 ? -15 : 0) : 0,
                                zIndex: card.id === selectedId ? 20 : (selectedId === null && index === 1 ? 10 : 0)
                            }}
                            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        >
                          <TriptychCard card={card} isSelected={selectedId === card.id} onSelect={() => setSelectedId(card.id)}/>
                        </motion.div>
                    )
                 })}
             </div>
             <AnimatePresence>
                {selectedFeature && (
                    <ExpandedCard card={selectedFeature} onDeselect={() => setSelectedId(null)}/>
                )}
             </AnimatePresence>
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
                      className="p-4 rounded-lg bg-card hover:bg-card/80 border border-card-border/50 text-left transition-all duration-200 hover:border-primary/50 hover:scale-[1.02] flex items-start gap-4 disabled:opacity-50"
                      disabled={isCreatingChat}
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
            onSendMessage={handleCreateChat}
            isLoading={isCreatingChat}
            chatHistory={[]}
          />
        </div>
      </div>
    </div>
  );
}
