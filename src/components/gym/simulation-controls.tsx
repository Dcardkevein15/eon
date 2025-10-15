'use client';

import { useState, useCallback, memo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Sparkles, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Cardiometer from './cardiometer';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  message: z.string().min(1, "El mensaje no puede estar vacío."),
});
type FormValues = z.infer<typeof formSchema>;

interface SimulationControlsProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  suggestions: string[];
  onRefreshSuggestions: () => void;
  isRefreshing: boolean;
  sentimentHistory: number[];
}

const SimulationControls = ({
  onSendMessage,
  isLoading,
  suggestions,
  onRefreshSuggestions,
  isRefreshing,
  sentimentHistory,
}: SimulationControlsProps) => {
  const [showSuggestions, setShowSuggestions] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { message: '' },
  });

  const messageValue = form.watch('message');
  const canSubmit = !isLoading && messageValue.trim().length > 0;

  const handleSubmit: SubmitHandler<FormValues> = (data) => {
    if (!canSubmit) return;
    onSendMessage(data.message);
    form.reset();
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
    form.reset();
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
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-grow">
                  <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                  <span>Sugerencias tácticas:</span>
                </div>
                <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onRefreshSuggestions} disabled={isRefreshing}>
                          <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent><p>Generar nuevas sugerencias</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setShowSuggestions(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                      </TooltipTrigger>
                       <TooltipContent><p>Ocultar sugerencias</p></TooltipContent>
                    </Tooltip>
                </div>
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
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="relative flex items-end gap-2">
          {!showSuggestions && (
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 bottom-2 h-7 w-7 shrink-0 rounded-full"
                    onClick={() => setShowSuggestions(true)}
                  >
                    <Sparkles className="w-4 h-4 text-accent" />
                  </Button>
              </TooltipTrigger>
               <TooltipContent side="top"><p>Mostrar sugerencias</p></TooltipContent>
            </Tooltip>
          )}
          <Textarea
            {...form.register('message')}
            placeholder="Escribe tu respuesta..."
            className="flex-1 resize-none rounded-2xl pr-12 pl-12"
            onKeyDown={handleKeyDown}
            rows={1}
            style={{ minHeight: '44px', maxHeight: '150px' }}
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 bottom-2 h-9 w-9 shrink-0 rounded-full"
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
