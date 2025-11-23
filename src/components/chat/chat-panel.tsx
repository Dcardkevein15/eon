'use client';

import { useState, useCallback, memo, useEffect, useMemo, useRef } from 'react';
import type { Chat, Message, ProfileData, CachedProfile } from '@/lib/types';
import { generateChatTitle, getAIResponse, getSmartComposeSuggestions, analyzeVoiceMessageAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth, useCollection, useFirestore } from '@/firebase/provider';
import { collection, query, orderBy, Timestamp, doc, getDoc, setDoc, serverTimestamp, onSnapshot, updateDoc, writeBatch } from 'firebase/firestore';
import { updatePsychologicalBlueprint } from '@/ai/flows/update-psychological-blueprint';
import { v4 as uuidv4 } from 'uuid';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SecurityRuleContext } from '@/firebase/errors';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon } from 'lucide-react';
import ImageWhiteboard from '@/components/chat/image-whiteboard';

interface ChatPanelProps {
  chat: Chat;
  appendMessage: (chatId: string, message: Omit<Message, 'id'>) => Promise<void>;
  updateChat: (chatId: string, data: Partial<Chat>) => Promise<void>;
}

function ChatPanel({ chat, appendMessage, updateChat }: ChatPanelProps) {
  const [isResponding, setIsResponding] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isRefreshingSuggestions, setIsRefreshingSuggestions] = useState(false);
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const firestore = useFirestore();
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const messagesQuery = useMemo(
    () =>
      user?.uid && firestore && chat.id
        ? query(
            collection(firestore, `users/${user.uid}/chats/${chat.id}/messages`),
            orderBy('timestamp', 'asc')
          )
        : undefined,
    [user?.uid, firestore, chat.id]
  );
  
  const { data: messages, loading: messagesLoading } = useCollection<Message>(messagesQuery);
  
  const loadProfile = useCallback(() => {
    if (user) {
      const storageKey = `psych-profile-${user.uid}`;
      const cachedItem = localStorage.getItem(storageKey);
      if (cachedItem) {
        try {
          const data: CachedProfile = JSON.parse(cachedItem);
          setProfile(data.profile);
        } catch (e) {
          console.error("Failed to parse cached profile", e);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    }
  }, [user]);

  // Load profile on initial mount and on chat change
  useEffect(() => {
    loadProfile();
  }, [user, chat.id, loadProfile]);
  
  // Add an event listener to reload the profile when the window gets focus
  useEffect(() => {
    window.addEventListener('focus', loadProfile);
    return () => {
      window.removeEventListener('focus', loadProfile);
    };
  }, [loadProfile]);

  const triggerBlueprintUpdate = useCallback(async () => {
    // This function can be expanded if the chatbot needs its own separate "thought" process.
  }, []);
  

  const fetchSuggestions = useCallback(async () => {
    const currentMessages = messages || [];
    if (currentMessages.length === 0) return;
    // This function can be called to manually refresh suggestions.
    setIsRefreshingSuggestions(true);
    try {
        const historyString = currentMessages.map((m) => `${m.role}: ${m.content}`).join('\n');
        const newSuggestions = await getSmartComposeSuggestions(historyString);
        setSuggestions(newSuggestions.slice(0, 3));
    } catch (error) {
        console.error("Error fetching suggestions", error);
    } finally {
        setIsRefreshingSuggestions(false);
    }
  }, [messages]);

  const getAIResponseAndUpdate = useCallback(async (currentMessages: Message[]) => {
    if (!user || !firestore) return;
    setIsResponding(true);
    setSuggestions([]); // Clear previous suggestions immediately
    if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
    }

    try {
      const historyForAI: Message[] = currentMessages.map(m => ({
          ...m,
          timestamp: m.timestamp instanceof Timestamp ? m.timestamp.toDate() : m.timestamp,
      }));

      const { response: aiResponseContent, newRole } = await getAIResponse(
        historyForAI,
        user.uid,
        chat.anchorRole || null,
        profile
      );
      
      if (newRole && newRole !== chat.anchorRole) {
        await updateChat(chat.id, { anchorRole: newRole });
      }
      
      const aiMessage: Omit<Message, 'id'> = {
        role: 'assistant',
        content: aiResponseContent,
        timestamp: Timestamp.now(),
      };
      
      setIsResponding(false); 
      await appendMessage(chat.id, aiMessage);
      
      const updatedMessages = [...currentMessages, { ...aiMessage, id: uuidv4() }];


      // Delayed suggestions logic
      const words = aiResponseContent.split(/\s+/).length;
      const readingTime = Math.max(12000, words * 360); // min 12 seconds
      
      suggestionTimeoutRef.current = setTimeout(async () => {
         const historyString = updatedMessages.map((m) => `${m.role}: ${m.content}`).join('\n');
         const newSuggestions = await getSmartComposeSuggestions(historyString);
         setSuggestions(newSuggestions.slice(0, 3));
      }, readingTime);


      // Title generation
      if (currentMessages.length <= 1 && (chat.title === 'Nuevo Chat' || !chat.title)) {
          const userMessage = currentMessages.find(m => m.role === 'user');
          if (userMessage) {
              const conversationForTitle = `User: ${userMessage.content}\nAssistant: ${aiResponseContent}`;
              const newTitle = await generateChatTitle(conversationForTitle);
              await updateChat(chat.id, { title: newTitle });
          }
      }
      
      triggerBlueprintUpdate();

    } catch (error) {
        console.error("Error getting AI response:", error);
        setIsResponding(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo obtener una respuesta de la IA. Por favor, inténtalo de nuevo.",
        });
    }
  }, [user, firestore, chat, appendMessage, updateChat, toast, triggerBlueprintUpdate, profile]);


 const handleSendMessage = useCallback(async (input: string, audioDataUri?: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para chatear." });
      return;
    }

    const textInput = input.trim();
    if (!textInput && !audioDataUri) return;
    
    let messageContent = textInput;
    
    // If there's audio, transcribe it and enrich the message.
    if (audioDataUri) {
        try {
            const { transcription, intent } = await analyzeVoiceMessageAction({ audioDataUri });
            if (transcription) {
                // Prepend the transcription and intent analysis to the user's text message.
                messageContent = `(Transcripción: "${transcription}")\n(Táctica: ${intent})\n\n${textInput}`.trim();
            } else {
                 messageContent = `(Error al transcribir audio)\n\n${textInput}`.trim();
            }
        } catch (error: any) {
            console.error('Error in voice analysis action:', error);
            const errorMessage = error.message || 'La transcripción de audio falló.';
            messageContent = `(Error de Transcripción: "${errorMessage}")\n\n${textInput}`.trim();
        }
    }

    const userMessage: Omit<Message, 'id'> = {
      role: 'user',
      content: messageContent,
      timestamp: Timestamp.now(),
    };

    await appendMessage(chat.id, userMessage);
    
    // Always get an AI response, even if transcription failed, so the context is not lost.
    await getAIResponseAndUpdate([...(messages || []), { ...userMessage, id: uuidv4() }]);

  }, [user, messages, appendMessage, chat.id, getAIResponseAndUpdate, toast]);


  useEffect(() => {
    // Clear any pending suggestion timeout when the component unmounts or chat changes
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [chat.id]);

  const handleClearSuggestions = () => {
    setSuggestions([]);
    if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
    }
  };


  return (
    <div className="flex flex-col h-full flex-1">
       <header className="flex h-14 items-center justify-between p-2 md:p-4 border-b shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {isMobile && <SidebarTrigger />}
           <div className='min-w-0'>
            <h2 className="text-base md:text-lg font-semibold truncate">
              {chat.title}
            </h2>
            {chat.anchorRole && (
              <p className='text-xs text-muted-foreground truncate'>Rol: {chat.anchorRole}</p>
            )}
           </div>
        </div>
         <div className="flex items-center gap-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsWhiteboardOpen(true)}
                className="text-muted-foreground hover:text-foreground"
            >
                <ImageIcon className="h-5 w-5" />
                <span className="sr-only">Abrir Pizarra de Imagen</span>
            </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={messages || []} isResponding={isResponding || messagesLoading} />
      </div>
      <div className="mt-auto px-2 py-4 md:px-4 md:py-4 border-t bg-background/95 backdrop-blur-sm">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isResponding || messagesLoading}
          suggestions={suggestions}
          onClearSuggestions={handleClearSuggestions}
          onRefreshSuggestions={fetchSuggestions}
          isRefreshingSuggestions={isRefreshingSuggestions}
        />
      </div>
      <ImageWhiteboard
        isOpen={isWhiteboardOpen}
        onClose={() => setIsWhiteboardOpen(false)}
        conversationHistory={messages ? messages.map(m => `${m.role}: ${m.content}`).join('\n') : ''}
      />
    </div>
  );
}

export default memo(ChatPanel);
