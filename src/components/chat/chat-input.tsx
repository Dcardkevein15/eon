'use client';

import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  memo,
} from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Sparkles, Paperclip, X, RefreshCw, Mic, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import Image from 'next/image';

const chatSchema = z.object({
  message: z.string(),
});

type ChatFormValues = z.infer<typeof chatSchema>;

interface ChatInputProps {
  onSendMessage: (message: string, imageUrl?: string, audioDataUri?: string) => void;
  isLoading: boolean;
  suggestions: string[];
  onClearSuggestions: () => void;
  onRefreshSuggestions: () => void;
  isRefreshingSuggestions: boolean;
}

const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  ({ onSendMessage, isLoading, suggestions, onClearSuggestions, onRefreshSuggestions, isRefreshingSuggestions }, ref) => {
    const localTextareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const [isFocused, setIsFocused] = useState(false);
    const [attachedImage, setAttachedImage] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    
    useImperativeHandle(ref, () => localTextareaRef.current as HTMLTextAreaElement);

    const form = useForm<ChatFormValues>({
      resolver: zodResolver(chatSchema),
      defaultValues: { message: '' },
    });

    const messageValue = form.watch('message');
    const isMessageEmpty = !messageValue || messageValue.trim() === '';
    const canSubmit = !isLoading && (!isMessageEmpty || !!attachedImage || !!recordedAudioUrl);

    const blobUrlToDataUri = (blobUrl: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            fetch(blobUrl)
                .then(res => res.blob())
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
        });
    }

    const handleSubmit: SubmitHandler<ChatFormValues> = async (data) => {
      if (!canSubmit) return;
      
      let audioDataUri: string | undefined;
      if (recordedAudioUrl) {
          audioDataUri = await blobUrlToDataUri(recordedAudioUrl);
      }
      
      onSendMessage(data.message, attachedImage || undefined, audioDataUri);
      
      form.reset();
      onClearSuggestions();
      setAttachedImage(null);
      setRecordedAudioUrl(null);
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
    };

    const handleSuggestion = (suggestion: string) => {
      if (isLoading) return;
      onSendMessage(suggestion);
      form.reset();
      onClearSuggestions();
    };

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
      event.target.value = '';
    };

    useEffect(() => {
      if (localTextareaRef.current) {
        localTextareaRef.current.style.height = 'auto';
        const scrollHeight = localTextareaRef.current.scrollHeight;
        const maxHeight = 160; 
        localTextareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      }
    }, [messageValue]);
    
    useEffect(() => {
        if (suggestions.length > 0) {
            setShowSuggestions(true);
        }
    }, [suggestions]);

    const handleToggleSuggestions = () => {
        if (showSuggestions && suggestions.length > 0) {
            onClearSuggestions();
            setShowSuggestions(false);
        } else {
            onRefreshSuggestions();
            setShowSuggestions(true);
        }
    };

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];
            
            mediaRecorderRef.current.addEventListener("dataavailable", event => {
                audioChunksRef.current.push(event.data);
            });

            mediaRecorderRef.current.addEventListener("stop", () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setRecordedAudioUrl(audioUrl);
            });

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };
    
    const clearRecording = () => {
        if (recordedAudioUrl) {
            URL.revokeObjectURL(recordedAudioUrl);
        }
        setRecordedAudioUrl(null);
    }

    return (
      <TooltipProvider delayDuration={200}>
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {showSuggestions && suggestions.length > 0 && !isLoading && (
           <div className="relative flex flex-col items-start gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground w-full">
              <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
              <span>Sugerencias:</span>
            </div>
            <div className="absolute top-0 right-0 flex items-center">
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={onRefreshSuggestions} disabled={isRefreshingSuggestions}>
                          <RefreshCw className={cn("h-3 w-3", isRefreshingSuggestions && "animate-spin")} />
                      </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Recargar Sugerencias</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                  <TooltipTrigger asChild>
                       <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full text-red-500 hover:text-red-500 hover:bg-red-500/10" onClick={() => setShowSuggestions(false)}>
                        <X className="h-4 w-4" />
                      </Button>
                  </TooltipTrigger>
                   <TooltipContent><p>Cerrar Sugerencias</p></TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {suggestions.map((s, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSuggestion(s)}
                  className="rounded-full text-xs md:text-sm whitespace-normal h-auto py-1.5 px-3"
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="w-full"
          >
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            
            {(attachedImage || recordedAudioUrl) && (
              <div className="flex gap-2 mb-2">
                {attachedImage && (
                  <div className="relative w-28 h-28 group">
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
                {recordedAudioUrl && (
                  <div className="p-2 border rounded-lg bg-card flex items-center gap-2 group">
                    <audio src={recordedAudioUrl} controls className="h-10" />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive"
                      onClick={clearRecording}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
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
                                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleToggleSuggestions}>
                                    <Sparkles className={cn("h-5 w-5", suggestions.length > 0 && showSuggestions && "text-accent")} />
                                    <span className="sr-only">Toggle Suggestions</span>
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{showSuggestions && suggestions.length > 0 ? 'Ocultar' : 'Mostrar'} Sugerencias</p>
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
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={isRecording ? handleStopRecording : handleStartRecording} disabled={isLoading}>
                                    {isRecording ? <Square className="h-5 w-5 text-red-500 fill-red-500" /> : <Mic className="h-5 w-5" />}
                                    <span className="sr-only">{isRecording ? 'Detener grabación' : 'Grabar audio'}</span>
                                </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{isRecording ? 'Detener grabación' : 'Grabar audio'}</p>
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
