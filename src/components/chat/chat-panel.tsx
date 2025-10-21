
'use client';

import { useState, useCallback, memo, useEffect, useMemo, useRef } from 'react';
import type { Chat, Message, ProfileData, CachedProfile, WhiteboardState, WhiteboardImageRecord } from '@/lib/types';
import { generateChatTitle, getAIResponse, getSmartComposeSuggestions, analyzeVoiceMessageAction, updateWhiteboardAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import ChatMessages from './chat-messages';
import ChatInput from './chat-input';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, Timestamp, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { updatePsychologicalBlueprint } from '@/ai/flows/update-psychological-blueprint';
import { v4 as uuidv4 } from 'uuid';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { SecurityRuleContext } from '@/firebase/errors';
import { Button } from '../ui/button';
import { LayoutDashboard, Loader2, History } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { useDocument } from '@/firebase/use-doc';
import dynamic from 'next/dynamic';
import WhiteboardHistory from '../whiteboard/WhiteboardHistory';

const Whiteboard = dynamic(() => import('../whiteboard/Whiteboard'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
});


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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(null);


  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const firestore = useFirestore();
  const [cachedProfile, setCachedProfile] = useState<ProfileData | null>(null);
  
  const historyStorageKey = useMemo(() => user ? `whiteboard-history-${user.uid}-${chat.id}` : null, [user, chat.id]);
  const [localHistory, setLocalHistory] = useState<WhiteboardImageRecord[]>([]);

  useEffect(() => {
    if (historyStorageKey) {
      try {
        const storedHistory = localStorage.getItem(historyStorageKey);
        if (storedHistory) {
          setLocalHistory(JSON.parse(storedHistory));
        }
      } catch (e) {
        console.error("Failed to load whiteboard history from localStorage", e);
      }
    }
  }, [historyStorageKey]);

  const updateLocalHistory = (newRecord: WhiteboardImageRecord) => {
    const updatedHistory = [newRecord, ...localHistory].slice(0, 50); // Keep last 50
    setLocalHistory(updatedHistory);
    if (historyStorageKey) {
      localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));
    }
  };

  const deleteFromLocalHistory = (id: string) => {
    const updatedHistory = localHistory.filter(record => record.id !== id);
    setLocalHistory(updatedHistory);
    if (historyStorageKey) {
      localStorage.setItem(historyStorageKey, JSON.stringify(updatedHistory));
    }
  };


  // --- Whiteboard State ---
  const whiteboardDocRef = useMemo(() =>
      user ? doc(firestore, `users/${user.uid}/chats/${chat.id}/whiteboard/main`)
      : undefined,
      [user, firestore, chat.id]
  );
  const { data: whiteboardState, loading: whiteboardLoading } = useDocument<WhiteboardState>(whiteboardDocRef);
  
  useEffect(() => {
    setActiveImageUrl(whiteboardState?.imageUrl || null);
  }, [whiteboardState]);


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
  
  useEffect(() => {
    if (user) {
      const storageKey = `psych-profile-${user.uid}`;
      const cachedItem = localStorage.getItem(storageKey);
      if (cachedItem) {
        try {
          const data: CachedProfile = JSON.parse(cachedItem);
          setCachedProfile(data.profile);
        } catch (e) {
          console.error("Failed to parse cached profile", e);
          localStorage.removeItem(storageKey);
        }
      }
    }
  }, [user]);

  const triggerBlueprintUpdate = useCallback(async (currentMessages: Message[]) => {
      if (!user) return;

      const stateDocRef = doc(firestore, `users/${user.uid}/chatbotState/main`);
      try {
        const previousStateSnap = await getDoc(stateDocRef);
        const previousBlueprint = previousStateSnap.exists()
            ? JSON.stringify(previousStateSnap.data().blueprint, null, 2)
            : "No previous state. This is my first reflection.";

        const fullChatHistory = currentMessages.map(msg => {
            const date = msg.timestamp && typeof (msg.timestamp as any).toDate === 'function' 
              ? (msg.timestamp as Timestamp).toDate() 
              : new Date();
            return `[${date.toISOString()}] ${msg.role}: ${msg.content}`;
          }).join('\n');
        
        const newBlueprint = await updatePsychologicalBlueprint({
            fullChatHistory,
            previousBlueprint,
        });

        const dataToSave = {
            blueprint: newBlueprint,
            updatedAt: serverTimestamp(),
        };
        await setDoc(stateDocRef, dataToSave);

      } catch (error: any) {
         if (error.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
              path: stateDocRef.path,
              operation: 'write',
              requestResourceData: { blueprint: 'Generated by AI', updatedAt: 'Server Timestamp'}
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
         } else {
             console.error("Error updating blueprint:", error);
         }
      }
  }, [user, firestore]);

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
        cachedProfile
      );
      
      if (newRole && newRole !== chat.anchorRole) {
        await updateChat(chat.id, { anchorRole: newRole });
      }

      // Special handling for the visual artist role
      if (newRole === 'El Artista de Conceptos' || chat.anchorRole === 'El Artista de Conceptos') {
          setIsGeneratingImage(true);
          try {
              const { imageUrl, imagePrompt } = await updateWhiteboardAction({
                  conversationHistory: historyForAI.map(m => `${m.role}: ${m.content}`).join('\n'),
                  currentState: whiteboardState || null,
              });
              
              if (imageUrl && whiteboardDocRef) {
                  const newRecord: WhiteboardImageRecord = {
                    id: uuidv4(),
                    imageUrl,
                    prompt: imagePrompt,
                    createdAt: new Date().toISOString(),
                  };
                  updateLocalHistory(newRecord);
                  await setDoc(whiteboardDocRef, { imageUrl }, { merge: true });
              }
          } catch(e) {
              console.error("Error updating whiteboard with image:", e);
              toast({
                  variant: "destructive",
                  title: "Error de Pizarra",
                  description: "No se pudo actualizar la imagen de la pizarra."
              });
          } finally {
              setIsGeneratingImage(false);
          }
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
      if (currentMessages.length === 1 && chat.title === 'Nuevo Chat') {
          const userMessage = currentMessages[0];
          const conversationForTitle = `User: ${userMessage.content}\nAssistant: ${aiResponseContent}`;
          const newTitle = await generateChatTitle(conversationForTitle);
          await updateChat(chat.id, { title: newTitle });
      }
      
      // Blueprint update
      if (updatedMessages.length > 0 && updatedMessages.length % 5 === 0) {
        triggerBlueprintUpdate(updatedMessages);
      }

    } catch (error) {
        console.error("Error getting AI response:", error);
        setIsResponding(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo obtener una respuesta de la IA. Por favor, inténtalo de nuevo.",
        });
    }
  }, [user, firestore, chat, appendMessage, updateChat, toast, triggerBlueprintUpdate, cachedProfile, whiteboardState, whiteboardDocRef, updateLocalHistory]);


  const handleSendMessage = useCallback(async (input: string, imageUrl?: string, audioDataUri?: string) => {
    const currentMessages = messages || [];
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para chatear." });
      return;
    }

    let messageContent = input.trim();
    
    if (!messageContent && !imageUrl && !audioDataUri) return;

    if (audioDataUri) {
      try {
        const { transcription, inferredTone } = await analyzeVoiceMessageAction({ audioDataUri });
        const toneText = `(Tono inferido: ${inferredTone})`;
        messageContent = [toneText, `Transcripción: "${transcription}"`, input.trim()].filter(Boolean).join('\n');
      } catch (error) {
        console.error('Error in voice analysis action:', error);
        toast({
          variant: "destructive",
          title: "Error de Voz",
          description: "No se pudo procesar el mensaje de voz. Inténtalo de nuevo.",
        });
        return;
      }
    }

    const userMessage: Omit<Message, 'id'> = {
      role: 'user',
      content: messageContent,
      timestamp: Timestamp.now(),
      ...(imageUrl && { imageUrl }),
    };
    
    await appendMessage(chat.id, userMessage);
    await getAIResponseAndUpdate([...currentMessages, { ...userMessage, id: uuidv4() }]);

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
            <Button variant="ghost" size="icon" onClick={() => setIsHistoryOpen(true)}>
               <History className="h-5 w-5" />
               <span className="sr-only">Abrir Historial de Pizarra</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsWhiteboardOpen(true)}>
               <LayoutDashboard className="h-5 w-5" />
               <span className="sr-only">Abrir Pizarra</span>
            </Button>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto">
        <ChatMessages messages={messages || []} isResponding={isResponding || messagesLoading} />
      </div>
      <div className="mt-auto px-2 py-4 md:px-4 md:py-4 border-t bg-background/95 backdrop-blur-sm">
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isResponding || messagesLoading || isGeneratingImage}
          suggestions={suggestions}
          onClearSuggestions={handleClearSuggestions}
          onRefreshSuggestions={fetchSuggestions}
          isRefreshingSuggestions={isRefreshingSuggestions}
        />
      </div>
      <Sheet open={isWhiteboardOpen} onOpenChange={setIsWhiteboardOpen}>
          <SheetContent side="right" className="p-0 sm:max-w-xl md:max-w-2xl lg:max-w-3xl !w-[90vw] md:!w-[50vw]">
               <SheetHeader className="p-4 border-b">
                <SheetTitle>Pizarra Colaborativa</SheetTitle>
               </SheetHeader>
               <div className='h-[calc(100%-4.5rem)] w-full'>
                 <Whiteboard state={{...whiteboardState, imageUrl: activeImageUrl}} isLoading={whiteboardLoading || isGeneratingImage} />
               </div>
          </SheetContent>
      </Sheet>
      <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <SheetContent side="right" className="p-0 w-full sm:max-w-md">
               <SheetHeader className="p-4 border-b">
                <SheetTitle>Historial de la Pizarra</SheetTitle>
               </SheetHeader>
               <div className='h-[calc(100%-4.5rem)] w-full'>
                 <WhiteboardHistory 
                    history={localHistory} 
                    onSelectImage={(url) => {
                        setActiveImageUrl(url);
                        setIsHistoryOpen(false);
                        setIsWhiteboardOpen(true);
                    }}
                    onDeleteImage={deleteFromLocalHistory}
                />
               </div>
          </SheetContent>
      </Sheet>
    </div>
  );
}

export default memo(ChatPanel);

    