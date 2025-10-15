'use client';

import { useState, useCallback, memo, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Message, SimulationScenario } from '@/lib/types';
import Cardiometer from './cardiometer';
import { getTacticalAdviceAction } from '@/app/actions';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';


const formSchema = z.object({
  message: z.string().min(1, "El mensaje no puede estar vacío."),
});
type FormValues = z.infer<typeof formSchema>;

interface SimulationControlsProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  scenario: SimulationScenario | null;
  conversationHistory: Message[];
  sentimentHistory: number[];
}

const SimulationControls = ({ 
    onSendMessage, 
    isLoading,
    scenario,
    conversationHistory,
    sentimentHistory,
}: SimulationControlsProps) => {
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: '' },
  });

  const messageValue = form.watch('message');
  const canSubmit = !isLoading && messageValue.trim().length > 0;

  const handleSuggestionClick = (suggestion: string) => {
    if (isLoading) return;
    onSendMessage(suggestion);
    form.reset();
    setSuggestions([]);
  };

  const fetchSuggestions = useCallback(async () => {
    if (!scenario || !conversationHistory) return;
    
    const historyString = conversationHistory
      .map((m) => `${m.role === 'user' ? 'Usuario' : 'Personaje'}: ${m.content}`)
      .join('\n');
      
    const result = await getTacticalAdviceAction({
        scenarioTitle: scenario.title,
        conversationHistory: historyString,
    });
    setSuggestions(result.suggestions);

  }, [scenario, conversationHistory]);

  useEffect(() => {
    // Fetch suggestions when a new message from the assistant arrives
    if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'assistant') {
       if (showSuggestions) {
         fetchSuggestions();
       }
    }
  }, [conversationHistory, fetchSuggestions, showSuggestions]);

  const handleSubmit: SubmitHandler<FormValues> = (data) => {
    if (!canSubmit) return;
    onSendMessage(data.message);
    form.reset();
    setSuggestions([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) {
        form.handleSubmit(handleSubmit)();
      }
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-2 md:p-4 space-y-3">
          {suggestions.length > 0 && showSuggestions && (
             <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground w-full">
                  <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                  <span>Sugerencias Tácticas:</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setShowSuggestions(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {suggestions.map((s, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(s)}
                        className="rounded-full text-xs md:text-sm whitespace-normal h-auto py-1.5 px-3"
                      >
                        {s}
                      </Button>
                    ))}
                </div>
              </div>
          )}
          <form onSubmit={form.handleSubmit(handleSubmit)} className="relative flex items-end gap-2">
              <div className="flex items-center pl-1 self-center">
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setShowSuggestions(!showSuggestions)}>
                          <Sparkles className={cn("h-5 w-5", showSuggestions && "text-accent")} />
                          <span className="sr-only">Toggle Suggestions</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{showSuggestions ? 'Ocultar' : 'Mostrar'} Sugerencias</p>
                    </TooltipContent>
                 </Tooltip>
              </div>
              <Textarea
                {...form.register('message')}
                placeholder="Escribe tu respuesta..."
                className="flex-1 resize-none rounded-2xl pr-12"
                onKeyDown={handleKeyDown}
                rows={1}
                style={{ minHeight: '44px', maxHeight: '150px' }}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-3 bottom-2 h-9 w-9 shrink-0 rounded-full"
                disabled={!canSubmit}
              >
                <Send className="w-4 h-4" />
                <span className="sr-only">Enviar mensaje</span>
              </Button>
          </form>

          <div className="flex items-center justify-end gap-2">
              <Cardiometer sentimentHistory={sentimentHistory} />
          </div>
      </div>
    </TooltipProvider>
  );
};

export default memo(SimulationControls);
