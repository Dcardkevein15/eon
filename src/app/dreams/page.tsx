
'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { CachedProfile, ProfileData, DreamInterpretationDoc, Chat, DreamSpecialist, DreamAudioDraft } from '@/lib/types';
import { interpretDreamAction, analyzeDreamVoiceAction } from '@/app/dreams/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, Loader2, Wand2, Info, BookOpen, Trash2, Mic, Square, Pause, Play, Ear, Calendar, Clock as ClockIcon } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow, format } from 'date-fns';
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { v4 as uuidv4 } from 'uuid';
import { useAuth, useFirestore, useCollection } from '@/firebase';
import { query, collection, orderBy, doc, setDoc, deleteDoc, getDocs, Timestamp } from 'firebase/firestore';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatePresence, motion } from 'framer-motion';
import DreamSpecialistSelection from '@/components/dreams/DreamSpecialistSelection';
import AudioVisualizer from '@/components/dreams/AudioVisualizer';
import RecordingControls from '@/components/dreams/RecordingControls';

type AnalysisStep = 'input' | 'specialist';
type RecordingStatus = 'idle' | 'recording' | 'paused' | 'transcribing' | 'done';

const SILENCE_TIMEOUT = 7000; // 7 seconds

export default function DreamWeaverPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // --- STATE MANAGEMENT ---
  const [dreamText, setDreamText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('input');

  // --- RECORDING STATE ---
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [transcriptionMagic, setTranscriptionMagic] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const chatsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'desc')) : undefined),
    [user?.uid, firestore]
  );
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);

  const dreamsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/dreams`), orderBy('createdAt', 'desc')) : undefined),
    [user?.uid, firestore]
  );
  const { data: dreamHistory, loading: isLoadingHistory } = useCollection<DreamInterpretationDoc>(dreamsQuery);

  // --- PROFILE LOADING ---
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


  // --- CORE ACTIONS ---
  const handleProceedToSelection = () => {
      if (!dreamText.trim() && !recordedAudioUrl) {
          toast({ variant: 'destructive', title: 'Sueño Vacío', description: 'Por favor, describe o graba tu sueño antes de continuar.' });
          return;
      }
      if (!profile) {
          toast({ variant: 'destructive', title: 'Perfil no encontrado', description: 'Es necesario un perfil psicológico para elegir un especialista.' });
          return;
      }
      setAnalysisStep('specialist');
  };
  
  const handleAnalyzeDream = async (specialist: DreamSpecialist) => {
    if (!user || !firestore) return;
    setIsAnalyzing(true);
    try {
        let dreamDescription = dreamText;
        if(recordedAudioUrl && !dreamText){
            const { transcription } = await analyzeDreamVoiceAction({ audioDataUri: recordedAudioUrl });
            dreamDescription = transcription;
        }

        const interpretationResult = await interpretDreamAction({
            dreamDescription: dreamDescription,
            userProfile: profile ? JSON.stringify(profile) : '{}',
            perspective: specialist.perspective,
        });

        let dreamTitle = "Sueño Sin Título";
        try {
            const titleMatch = interpretationResult.interpretationText.match(/^#\s*(.*)/);
            if (titleMatch && titleMatch[1]) {
                dreamTitle = titleMatch[1];
            }
        } catch (e) { console.error("Could not parse dream title", e); }
        
        const dreamId = uuidv4();
        const newDreamDoc: Omit<DreamInterpretationDoc, 'id'> = {
            userId: user.uid,
            dreamDescription: dreamDescription,
            interpretation: { 
                interpretationText: interpretationResult.interpretationText,
                dreamTitle: dreamTitle,
            },
            createdAt: new Date().toISOString(),
        };

        const dreamRef = doc(firestore, `users/${user.uid}/dreams`, dreamId);
        await setDoc(dreamRef, newDreamDoc);
      
        clearRecording();
        router.push(`/dreams/analysis?id=${dreamId}`);

    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error en el análisis', description: error.message || 'No se pudo interpretar el sueño.' });
      setAnalysisStep('input');
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleDeleteDream = async (id: string) => {
    if (!user || !firestore) return;
    try {
        await deleteDoc(doc(firestore, `users/${user.uid}/dreams`, id));
        toast({ title: 'Éxito', description: 'El sueño ha sido eliminado de tu diario.' });
    } catch (error) {
        console.error("Error deleting dream:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el sueño.' });
    }
  };
  
  const handleClearHistory = async () => {
    if (!user || !firestore || !dreamHistory) return;
    const dreamsCollectionRef = collection(firestore, `users/${user.uid}/dreams`);
    try {
        const querySnapshot = await getDocs(dreamsCollectionRef);
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        toast({ title: 'Éxito', description: 'Tu diario de sueños ha sido vaciado.' });
    } catch (error) {
        console.error("Error clearing dream history:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo limpiar el historial.' });
    }
  };
  
  const handleSelectDream = (id: string) => {
    router.push(`/dreams/analysis?id=${id}`);
    setIsHistoryOpen(false);
  };

  // --- RECORDING LOGIC ---
  const blobToDataUri = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const transcribeAndSetText = async (audioBlob: Blob) => {
    setRecordingStatus('transcribing');
    setAudioStream(null);
    try {
        const audioDataUri = await blobToDataUri(audioBlob);
        setRecordedAudioUrl(audioDataUri);
        const { transcription } = await analyzeDreamVoiceAction({ audioDataUri });
        setTranscriptionMagic(transcription);
        
        let i = 0;
        const intervalId = setInterval(() => {
            setDreamText(transcription.substring(0, i+1));
            i++;
            if (i > transcription.length) {
                clearInterval(intervalId);
                setRecordingStatus('done');
            }
        }, 20); // Typing effect speed

    } catch (error) {
        toast({ variant: "destructive", title: "Error de transcripción", description: "No se pudo transcribir el audio." });
        setRecordingStatus('idle');
    }
  };

  const startSilenceDetection = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
        if(mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
            toast({ title: "Grabación finalizada", description: "Se detectó un silencio prolongado." });
        }
    }, SILENCE_TIMEOUT);
  }, [toast]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      setRecordedAudioUrl(null);
      
      mediaRecorderRef.current.addEventListener("dataavailable", event => {
        audioChunksRef.current.push(event.data);
        startSilenceDetection();
      });

      mediaRecorderRef.current.addEventListener("stop", () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if(audioBlob.size > 0) {
            transcribeAndSetText(audioBlob);
        }
        mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      });
      
      mediaRecorderRef.current.start(1000); // Trigger dataavailable every second
      setRecordingStatus('recording');
      startSilenceDetection();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({ variant: "destructive", title: "Error de Micrófono", description: "No se pudo acceder al micrófono." });
    }
  };

  const handlePauseOrResume = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.pause();
        setRecordingStatus('paused');
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    } else if (mediaRecorderRef.current?.state === 'paused') {
        mediaRecorderRef.current.resume();
        setRecordingStatus('recording');
        startSilenceDetection();
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
        mediaRecorderRef.current.stop();
    }
  };
  
  const clearRecording = () => {
    setRecordedAudioUrl(null);
    setDreamText('');
    setRecordingStatus('idle');
  };

  const DreamHistorySidebar = ({ dreams, isLoading, onSelectDream, onDeleteDream, onClearHistory }: { dreams: DreamInterpretationDoc[], isLoading: boolean, onSelectDream: (id: string) => void, onDeleteDream: (id: string) => void, onClearHistory: () => void }) => {
  
    const getFormattedDate = (dateString: string | Date | Timestamp) => {
      if (!dateString) return { relative: 'Fecha desconocida', absolute: '' };
      try {
        const date = dateString instanceof Timestamp ? dateString.toDate() : new Date(dateString);
        return {
            relative: formatDistanceToNow(date, { addSuffix: true, locale: es }),
            absolute: format(date, "d MMM, HH:mm", { locale: es })
        };
      } catch {
        return { relative: 'Fecha inválida', absolute: '' };
      }
    };

    const sortedDreams = useMemo(() => {
        if (!dreams) return [];
        return [...dreams].sort((a, b) => {
             const timeA = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
             const timeB = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
             return timeB - timeA;
        })
    }, [dreams]);
  
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
            ) : sortedDreams.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground mt-8">
                <p>Tu diario está vacío. ¡Interpreta tu primer sueño para empezar!</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {sortedDreams.map(dream => {
                  const { relative, absolute } = getFormattedDate(dream.createdAt);
                  return (
                  <div key={dream.id} className="relative group/item flex items-center gap-2">
                      <button onClick={() => onSelectDream(dream.id)} className="flex-grow text-left">
                          <Card className="bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent hover:border-primary/50 transition-colors">
                              <CardHeader className="p-3">
                                  <CardTitle className="text-sm font-semibold truncate text-sidebar-foreground">{dream.interpretation?.dreamTitle || 'Sueño sin título'}</CardTitle>
                                  <CardDescription className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                      <span className='flex items-center gap-1.5'><Calendar className="w-3 h-3"/> {absolute}</span>
                                      <span className='flex items-center gap-1.5'><ClockIcon className="w-3 h-3"/> {relative}</span>
                                  </CardDescription>
                              </CardHeader>
                          </Card>
                      </button>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive">
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
                  )
                })}
              </div>
            )}
        </ScrollArea>
         {dreamHistory && dreamHistory.length > 0 && (
           <div className="p-2 border-t border-sidebar-border">
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                     <Button variant="ghost" size="sm" className="w-full justify-center text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="mr-2 h-3 w-3" />
                      Limpiar Diario
                     </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esto eliminará permanentemente TODOS los sueños de tu diario. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">Sí, limpiar todo</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
           </div>
        )}
      </div>
    )
  };


  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background text-foreground">
        <Sidebar>
          <ChatSidebar chats={chats || []} activeChatId={''} isLoading={chatsLoading} removeChat={() => {}} clearChats={() => {}} startNewChat={() => Promise.resolve()} />
        </Sidebar>
        <SidebarInset className="flex overflow-hidden">
            <aside className="w-80 border-r border-sidebar-border flex-shrink-0 hidden md:flex overflow-y-auto">
                <DreamHistorySidebar dreams={dreamHistory || []} isLoading={isLoadingHistory} onSelectDream={handleSelectDream} onDeleteDream={handleDeleteDream} onClearHistory={handleClearHistory} />
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
                            <div className="md:hidden">
                                <Sheet open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <BookOpen className="h-5 w-5" />
                                            <span className="sr-only">Abrir diario de sueños</span>
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent className="p-0 w-[85vw] sm:w-96">
                                        <SheetHeader className="sr-only">
                                            <SheetTitle>Diario de Sueños</SheetTitle>
                                            <SheetDescription>Explora tus sueños interpretados anteriormente.</SheetDescription>
                                        </SheetHeader>
                                         <DreamHistorySidebar dreams={dreamHistory || []} isLoading={isLoadingHistory} onSelectDream={handleSelectDream} onDeleteDream={handleDeleteDream} onClearHistory={handleClearHistory} />
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
                                 <p className="text-lg text-muted-foreground">Describe o relata tu sueño. Luego, elige un especialista para la interpretación.</p>
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
                                {recordingStatus !== 'idle' && (
                                  <div className="w-full h-20 rounded-lg bg-transparent flex items-center justify-center">
                                      <AudioVisualizer stream={audioStream} />
                                  </div>
                                )}
                                {recordedAudioUrl && recordingStatus === 'done' && (
                                    <div className="p-2 border rounded-lg bg-card flex items-center gap-2 group justify-center">
                                        <audio src={recordedAudioUrl} controls className="h-10 max-w-full" />
                                    </div>
                                )}
                                <div className="relative">
                                    <Textarea
                                        value={dreamText}
                                        onChange={(e) => setDreamText(e.target.value)}
                                        placeholder="Escribe o graba tu sueño aquí..."
                                        className="min-h-[160px] bg-card/80 border-border rounded-xl p-4 pr-12 text-base ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-2 transition-all duration-300"
                                        disabled={recordingStatus === 'transcribing'}
                                    />
                                    <div className="absolute right-3 top-3">
                                      <RecordingControls
                                        status={recordingStatus}
                                        onStart={handleStartRecording}
                                        onPause={handlePauseOrResume}
                                        onResume={handlePauseOrResume}
                                        onStop={handleStopRecording}
                                        onClear={clearRecording}
                                      />
                                    </div>
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
