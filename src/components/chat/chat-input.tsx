'use client';

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, CornerDownLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from '@/components/ui/form';
import { getSmartComposeSuggestions } from '@/app/actions';
import type { Message } from '@/lib/types';

const chatSchema = z.object({
  message: z.string().min(1, 'El mensaje no puede estar vacío'),
});

type ChatFormValues = z.infer<typeof chatSchema>;

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  chatHistory: Message[];
}

const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(({ onSendMessage, isLoading, chatHistory }, ref) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const localTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  useImperativeHandle(ref, () => localTextareaRef.current as HTMLTextAreaElement);

  const form = useForm<ChatFormValues>({
    resolver: zodResolver(chatSchema),
    defaultValues: { message: '' },
  });

  const handleSuggestion = (suggestion: string) => {
    if (isLoading) return;
    onSendMessage(suggestion);
    form.reset();
    setSuggestions([]);
  };

  const handleSubmit: SubmitHandler<ChatFormValues> = (data) => {
    if(isLoading) return;
    onSendMessage(data.message);
    form.reset();
    setSuggestions([]);
  };

  const fetchSuggestions = useCallback(async () => {
    if (chatHistory.length === 0) return;
    const historyString = chatHistory
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');
    const newSuggestions = await getSmartComposeSuggestions(historyString);
    setSuggestions(newSuggestions.slice(0, 3));
  }, [chatHistory]);

  useEffect(() => {
    if (chatHistory.length > 0) {
      fetchSuggestions();
    }
  }, [chatHistory, fetchSuggestions]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.handleSubmit(handleSubmit)();
    }
  };
  
  useEffect(() => {
    if (localTextareaRef.current) {
        localTextareaRef.current.style.height = 'auto';
        localTextareaRef.current.style.height = `${localTextareaRef.current.scrollHeight}px`;
    }
  }, [form.watch('message')]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full">
      {suggestions.length > 0 && !isLoading && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 text-accent" />
            Sugerencias:
          </div>
          {suggestions.map((s, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => handleSuggestion(s)}
              className="rounded-full text-xs md:text-sm"
            >
              {s}
            </Button>
          ))}
        </div>
      )}
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="relative flex items-end w-full space-x-2"
        >
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormControl>
                  <Textarea
                    {...field}
                    ref={localTextareaRef}
                    placeholder="Cuéntame cómo te sientes..."
                    className="pr-12 md:pr-16 resize-none max-h-40 text-sm md:text-base"
                    onKeyDown={handleKeyDown}
                    rows={1}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-1">
            <p className="text-xs text-muted-foreground hidden md:block">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className='text-base'>⇧</span> + <CornerDownLeft className="h-3 w-3" />
              </kbd> para nueva línea
            </p>
            <Button type="submit" size="icon" className="h-8 w-8 md:h-10 md:w-10" disabled={isLoading || !form.formState.isValid}>
              <Send className="w-4 h-4" />
              <span className="sr-only">Enviar mensaje</span>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
});

ChatInput.displayName = "ChatInput";

export default ChatInput;
