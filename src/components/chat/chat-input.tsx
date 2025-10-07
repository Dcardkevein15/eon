'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  memo,
} from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Sparkles, Paperclip, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { getSmartComposeSuggestions } from '@/app/actions';
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import Image from 'next/image';

const chatSchema = z.object({
  message: z.string(),
});

type ChatFormValues = z.infer<typeof chatSchema>;

interface ChatInputProps {
  onSendMessage: (message: string, imageUrl?: string) => void;
  isLoading: boolean;
  chatHistory: Message[];
}

const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ onSendMessage, isLoading, chatHistory }, ref) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const localTextareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);

    useImperativeHandle(ref, () => localTextareaRef.current as HTMLTextAreaElement);

    const form = useForm<ChatFormValues>({
      resolver: zodResolver(chatSchema),
      defaultValues: { message: '' },
    });

    const messageValue = form.watch('message');
    const isMessageEmpty = !messageValue || messageValue.trim() === '';
    const canSubmit = !isLoading && (!isMessageEmpty || !!attachedImage);

    const handleSuggestion = (suggestion: string) => {
      if (isLoading) return;
      onSendMessage(suggestion);
      form.reset();
      setSuggestions([]);
    };

    const handleSubmit: SubmitHandler<ChatFormValues> = (data) => {
      if (!canSubmit) return;
      onSendMessage(data.message, attachedImage || undefined);
      form.reset();
      setSuggestions([]);
      setAttachedImage(null);
    };

    const fetchSuggestions = useCallback(async () => {
      if (chatHistory.length === 0 || !showSuggestions) return;
      const historyString = chatHistory
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');
      const newSuggestions = await getSmartComposeSuggestions(historyString);
      setSuggestions(newSuggestions.slice(0, 3));
    }, [chatHistory, showSuggestions]);

    useEffect(() => {
      if (chatHistory.length > 0) {
        fetchSuggestions();
      }
    }, [chatHistory, fetchSuggestions]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (canSubmit) {
          form.handleSubmit(handleSubmit)();
        }
      }
    };
    
    const handleAttachClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachedImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
      // Reset file input to allow selecting the same file again
      event.target.value = '';
    };

    useEffect(() => {
      if (localTextareaRef.current) {
        localTextareaRef.current.style.height = 'auto';
        localTextareaRef.current.style.height = `${localTextareaRef.current.scrollHeight}px`;
      }
    }, [messageValue]);

    return (
      <TooltipProvider delayDuration={200}>
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {suggestions.length > 0 && !isLoading && showSuggestions && (
           <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground w-full">
              <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Sugerencias:</span>
            </div>
            {suggestions.map((s, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestion(s)}
                className="rounded-full text-xs md:text-sm whitespace-normal h-auto"
              >
                {s}
              </Button>
            ))}
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="w-full"
          >
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            {attachedImage && (
              <div className="relative mb-2 w-28 h-28 group">
                <Image src={attachedImage} alt="Preview" layout="fill" className="rounded-lg object-cover" />
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setAttachedImage(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                     <div className={cn(
                        "relative flex w-full items-end overflow-hidden rounded-2xl border bg-card transition-all",
                        isFocused ? "ring-2 ring-primary/50" : "ring-0"
                     )}>
                        <div className="flex items-center pl-2">
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
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleAttachClick}>
                                  <Paperclip className="h-5 w-5" />
                                  <span className="sr-only">Adjuntar archivo</span>
                                </Button>
                              </TooltipTrigger>
                               <TooltipContent>
                                <p>Adjuntar archivo</p>
                              </TooltipContent>
                            </Tooltip>
                        </div>
                        <Textarea
                          {...field}
                          ref={localTextareaRef}
                          placeholder="Cuéntame cómo te sientes..."
                          className="flex-1 resize-none self-center border-none bg-transparent px-3 py-3 text-base shadow-none outline-none ring-0 focus-visible:ring-0 max-h-48"
                          onKeyDown={handleKeyDown}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                          rows={1}
                        />
                         <div className="flex items-end self-end p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                  type="submit"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 rounded-full transition-colors"
                                  disabled={!canSubmit}
                                >
                                  <Send className="w-4 h-4" />
                                  <span className="sr-only">Enviar mensaje</span>
                                </Button>
                            </TooltipTrigger>
                             <TooltipContent>
                                <p>Enviar Mensaje</p>
                              </TooltipContent>
                          </Tooltip>
                         </div>
                      </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>
       </TooltipProvider>
    );
  }
);

ChatInput.displayName = 'ChatInput';

export default memo(ChatInput);
