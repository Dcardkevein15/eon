'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CachedProfile, ProfileData, DreamInterpretationDoc, Chat, DreamSpecialist } from '@/lib/types';
import { interpretDreamAction, analyzeVoiceMessageAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, Loader2, Wand2, Info, BookOpen, Trash2, Mic, Square, Route } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { v4 as uuidv4 } from 'uuid';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { query, collection, orderBy } from 'firebase/firestore';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import DreamSpecialistSelection from '@/components/dreams/DreamSpecialistSelection';
import { useTour } from '@/hooks/use-interactive-tour';

// Custom hook for managing state in localStorage
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.log(error);
    } finally {
        setLoading(false);
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue, loading] as const;
}


function DreamHistorySidebar({ dreams, isLoading, onSelectDream, onDeleteDream }: { dreams: DreamInterpretationDoc[], isLoading: boolean, onSelectDream: (id: string) => void, onDeleteDream: (id: string) => void }) {
  
  const getFormattedDate = (dateString: string | Date) => {
    if (!dateString) return 'Fecha desconocida';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="h-full flex flex-col bg-sidebar-background border-r border-sidebar-border text-sidebar-foreground">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Diario de Sueños
            </h2>
        </div>
      </div>
      <ScrollArea className="flex-1">
         {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-20 w-full bg-sidebar-accent" />
              <Skeleton className="h-20 w-full bg-sidebar-accent" />
              <Skeleton className="h-20 w-full bg-sidebar-accent" />
            </div>
          ) : dreams.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground mt-8">
              <p>Tu diario está vacío. ¡Interpreta tu primer sueño para empezar!</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {[...dreams].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(dream => (
                <div key={dream.id} className="relative group/item">
                    <button onClick={() => onSelectDream(dream.id)} className="w-full text-left">
                        <Card className="bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent hover:border-primary/50 transition-colors">
                            <CardHeader className="p-3">
                                <CardTitle className="text-sm font-semibold truncate text-sidebar-foreground">{dream.interpretation.dreamTitle}</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">{getFormattedDate(dream.createdAt)}</CardDescription>
                            </CardHeader>
                        </Card>
                    </button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/item:opacity-100 text-red-400 hover:bg-red-500/10 hover:text-red-400">
                            <Trash2 className="w-4 h-4"/>
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar este sueño?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción es permanente y no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteDream(dream.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                </div>
              ))}
            </div>
          )}
      </ScrollArea>
    </div>
  )
}

// Helper to convert blob URL to data URI
const blobUrlToDataUri = (blobUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        fetch(blobUrl)
            .then(res => res.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
    });
};

type AnalysisStep = 'input' | 'specialist';

export default function DreamWeaverPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { startTour } = useTour('dreams');

  const [dreamText, setDreamText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('input');
  
  // --- Voice Recording State ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [dreamHistory, setDreamHistory, isLoadingHistory] = useLocalStorage<DreamInterpretationDoc[]>('dream-journal', []);

  const chatsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'desc')) : undefined),
    [user?.uid, firestore]
  );
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);

  useEffect(() => {
    if (user) {
      const storageKey = `psych-profile-${user.uid}`;
      const cachedItem = localStorage.getItem(storageKey);
      if (cachedItem) {
        try {
          const data: CachedProfile = JSON.parse(cachedItem);
          setProfile(data.profile);
        } catch (e) {
          console.error("Failed to parse cached profile", e);
          setProfileError("No se pudo cargar tu perfil psicológico. La interpretación del sueño puede ser menos precisa.");
        }
      } else {
        setProfileError("No se ha generado un perfil psicológico. Ve a la sección 'Perfil Psicológico' para crear uno y obtener interpretaciones más profundas.");
      }
    }
  }, [user]);

   const handleStartRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];
        
        mediaRecorderRef.current.ondataavailable = event => {
            audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            setRecordedAudioUrl(audioUrl);
            mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Error accessing microphone:", err);
        toast({ variant: 'destructive', title: 'Error de Micrófono', description: 'No se pudo acceder al micrófono.' });
    }
  };

  const clearRecording = () => {
      if (recordedAudioUrl) {
          URL.revokeObjectURL(recordedAudioUrl);
      }
      setRecordedAudioUrl(null);
  };

  const handleProceedToSelection = () => {
      if (!dreamText.trim() && !recordedAudioUrl) {
          toast({ variant: 'destructive', title: 'Sueño Vacío', description: 'Por favor, describe o narra tu sueño antes de continuar.' });
          return;
      }
      if (!profile) {
          toast({ variant: 'destructive', title: 'Perfil no encontrado', description: 'Es necesario un perfil psicológico para elegir un especialista.' });
          return;
      }
      setAnalysisStep('specialist');
  };
  
  const handleAnalyzeDream = async (specialist: DreamSpecialist) => {
    setIsAnalyzing(true);
    try {
      let dreamDescription = dreamText;

      if (recordedAudioUrl) {
          const audioDataUri = await blobUrlToDataUri(recordedAudioUrl);
          const voiceAnalysis = await analyzeVoiceMessageAction({ audioDataUri });
          dreamDescription = `Transcripción de la narración: "${voiceAnalysis.transcription}"\n\nNotas adicionales del usuario: ${dreamText}`;
      }

      const interpretation = await interpretDreamAction({
        dreamDescription: dreamDescription,
        userProfile: JSON.stringify(profile),
        perspective: specialist.perspective,
      });

      const newDreamDoc: DreamInterpretationDoc = {
        id: uuidv4(),
        userId: user?.uid || 'local-user',
        dreamDescription: dreamDescription,
        interpretation,
        createdAt: new Date().toISOString(),
      };
      
      setDreamHistory(prevDreams => [...prevDreams, newDreamDoc]);
      
      router.push(`/dreams/analysis?id=${newDreamDoc.id}`);

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error en el análisis',
        description: error.message || 'No se pudo interpretar el sueño. Por favor, inténtalo de nuevo.',
      });
      setAnalysisStep('input'); // Return to input step on error
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleDeleteDream = (id: string) => {
    setDreamHistory(prev => prev.filter(d => d.id !== id));
    toast({ title: 'Éxito', description: 'El sueño ha sido eliminado de tu diario local.' });
  };
  
  const handleSelectDream = (id: string) => {
    router.push(`/dreams/analysis?id=${id}`);
    setIsHistoryOpen(false); // Close sheet on selection
  }


  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar>
          <ChatSidebar chats={chats || []} activeChatId={''} isLoading={chatsLoading} removeChat={() => {}} clearChats={() => {}} />
        </Sidebar>
        <SidebarInset className="flex overflow-hidden">
            <aside className="w-80 border-r border-sidebar-border flex-shrink-0 hidden md:flex overflow-y-auto">
                <DreamHistorySidebar dreams={dreamHistory} isLoading={isLoadingHistory} onSelectDream={handleSelectDream} onDeleteDream={handleDeleteDream} />
            </aside>
            <main className="flex-1 flex flex-col overflow-y-auto">
                <div className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border/80 p-4 z-10">
                    <div className="flex items-center justify-between gap-2 max-w-4xl mx-auto">
                        <div className='flex items-center gap-2'>
                           <Button 
                                asChild={analysisStep === 'input'} 
                                variant="ghost" 
                                size="icon" 
                                className="-ml-2 text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                                onClick={() => analysisStep === 'specialist' && setAnalysisStep('input')}
                            >
                                {analysisStep === 'input' ? (
                                    <Link href="/">
                                        <ChevronLeft className="h-5 w-5" />
                                    </Link>
                                ) : (
                                    <ChevronLeft className="h-5 w-5" />
                                )}
                            </Button>
                            <h1 className="text-xl font-bold tracking-tight">Portal de Sueños</h1>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={startTour}>
                                <Route className="h-5 w-5 text-muted-foreground" />
                                <span className="sr-only">Iniciar Recorrido</span>
                            </Button>
                            <div className="md:hidden">
                                <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                                    <Sheet.Trigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <BookOpen className="h-5 w-5" />
                                            <span className="sr-only">Abrir diario de sueños</span>
                                        </Button>
                                    </Sheet.Trigger>
                                    <SheetContent className="p-0 w-[85vw] sm:w-96">
                                         <DreamHistorySidebar dreams={dreamHistory} isLoading={isLoadingHistory} onSelectDream={handleSelectDream} onDeleteDream={handleDeleteDream} />
                                    </SheetContent>
                                </Sheet>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-4">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={analysisStep}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full flex"
                    >
                      {analysisStep === 'input' ? (
                        <div className="w-full max-w-2xl mx-auto text-center space-y-8 my-auto">
                             <div className="space-y-2">
                                 <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
                                    ¿Qué te ha mostrado tu subconsciente?
                                 </h2>
                                 <p className="text-lg text-muted-foreground">Describe o narra tu sueño con todos los detalles que recuerdes. Luego, elige un especialista para la interpretación.</p>
                             </div>
                            
                             {profileError && (
                                <Alert variant="default" className="text-left bg-yellow-900/20 border-yellow-500/30 text-yellow-200">
                                    <Info className="h-4 w-4 text-yellow-400" />
                                    <AlertTitle className="text-yellow-300">Contexto Limitado</AlertTitle>
                                    <AlertDescription>
                                        {profileError}
                                    </AlertDescription>
                                </Alert>
                             )}

                            <div className="space-y-4">
                                <div className="relative">
                                    <Textarea
                                        value={dreamText}
                                        onChange={(e) => setDreamText(e.target.value)}
                                        placeholder="Añade aquí cualquier detalle escrito, o usa este espacio para notas mientras grabas..."
                                        className="min-h-[160px] bg-card/80 border-border rounded-xl p-4 text-base ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 transition-all duration-300"
                                    />
                                </div>
                                 <div className="flex flex-col items-center gap-4">
                                    {recordedAudioUrl && (
                                         <div className="p-2 border rounded-lg bg-card/80 flex items-center gap-2 group w-full max-w-sm">
                                            <audio src={recordedAudioUrl} controls className="h-10 flex-grow" />
                                            <Button 
                                              type="button" 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-8 w-8 text-destructive flex-shrink-0"
                                              onClick={clearRecording}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                    )}
                                    <Button onClick={handleStartRecording} variant="outline" className={cn("w-full max-w-sm", isRecording && "bg-red-900/20 text-red-400 border-red-500/50 hover:bg-red-900/30")}>
                                         {isRecording ? (
                                            <>
                                                <Square className="mr-2 h-5 w-5 fill-current" />
                                                Detener Grabación
                                            </>
                                         ) : (
                                            <>
                                                <Mic className="mr-2 h-5 w-5" />
                                                {recordedAudioUrl ? 'Grabar de Nuevo' : 'Narrar mi Sueño'}
                                            </>
                                         )}
                                    </Button>
                                 </div>
                            </div>

                             <Button
                                onClick={handleProceedToSelection}
                                disabled={isAnalyzing || (!profile && !authLoading)}
                                size="lg"
                                className="w-full sm:w-auto text-base px-8 py-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all transform hover:scale-105"
                             >
                                <Wand2 className="mr-3 h-5 w-5" />
                                Elegir Especialista
                             </Button>
                        </div>
                      ) : (
                        <DreamSpecialistSelection 
                            onSelectSpecialist={handleAnalyzeDream}
                            isLoading={isAnalyzing}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
