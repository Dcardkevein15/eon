'use client';

import { useState, useCallback, memo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, LifeBuoy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getTacticalAdviceAction } from '@/app/actions';
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
    scenario,
    conversationHistory,
    sentimentHistory,
}: SimulationControlsProps) => {
  const [advice, setAdvice] = useState<string[]>([]);
  const [isGettingAdvice, setIsGettingAdvice] = useState(false);
  
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
    setAdvice([]);
  };

  const handleGetAdvice = useCallback(async () => {
    if (!scenario) return;
    setIsGettingAdvice(true);
    setAdvice([]);
    try {
        const historyString = conversationHistory.map(m => `${m.role === 'user' ? 'Usuario' : 'Personaje'}: ${m.content}`).join('\n');
        const suggestions = await getTacticalAdviceAction({
            scenarioTitle: scenario.title,
            conversationHistory: historyString,
        });
        setAdvice(suggestions);
    } catch (error) {
        console.error("Error getting tactical advice:", error);
        setAdvice(["No se pudieron obtener sugerencias."]);
    } finally {
        setIsGettingAdvice(false);
    }
  }, [scenario, conversationHistory]);

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

        <div className="flex items-center justify-between gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleGetAdvice} disabled={isGettingAdvice}>
                        {isGettingAdvice ? <Loader2 className='mr-2 h-4 w-4 animate-spin'/> : <LifeBuoy className="mr-2 h-4 w-4" />}
                        Asesor Táctico
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                    <div className="space-y-2">
                       <h4 className="font-medium leading-none">Sugerencias Tácticas</h4>
                       <p className="text-sm text-muted-foreground">
                         Prueba una de estas respuestas.
                       </p>
                       <div className="grid gap-2 pt-2">
                            {isGettingAdvice ? (
                                <div className='flex items-center justify-center p-4'>
                                    <Loader2 className='h-6 w-6 animate-spin text-muted-foreground'/>
                                </div>
                            ) : advice.length > 0 ? (
                                advice.map((adv, i) => (
                                    <Button key={i} variant="ghost" className="h-auto text-left justify-start" onClick={() => form.setValue('message', adv)}>
                                        {adv}
                                    </Button>
                                ))
                            ) : (
                                <p className='text-sm text-muted-foreground text-center p-4'>Pide ayuda para obtener sugerencias.</p>
                            )}
                       </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Cardiometer sentimentHistory={sentimentHistory} />
        </div>
    </div>
  );
};

export default memo(SimulationControls);
