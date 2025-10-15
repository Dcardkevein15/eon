'use client';

import { useState, useCallback, memo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Message, SimulationScenario } from '@/lib/types';
import Cardiometer from './cardiometer';


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
    sentimentHistory,
}: SimulationControlsProps) => {
  
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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) {
        form.handleSubmit(handleSubmit)();
      }
    }
  };

  return (
    <div className="p-2 md:p-4 space-y-3">
        <form onSubmit={form.handleSubmit(handleSubmit)} className="relative flex items-end gap-2">
            <Textarea
              {...form.register('message')}
              placeholder="Escribe tu respuesta..."
              className="flex-1 resize-none rounded-2xl pr-20"
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
  );
};

export default memo(SimulationControls);