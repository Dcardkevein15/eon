
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import type { CachedProfile, ProfileData, DreamInterpretationDoc } from '@/lib/types';
import { interpretDreamAction, getDreamHistoryAction, deleteDreamAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, Loader2, Wand2, Info, BookOpen, Trash2, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Sidebar, SidebarProvider, SidebarInset, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useCollection, useFirestore } from '@/firebase';
import type { Chat } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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


function DreamHistorySidebar({ dreams, isLoading, onSelectDream, onDeleteDream, onRefresh }: { dreams: DreamInterpretationDoc[], isLoading: boolean, onSelectDream: (id: string) => void, onDeleteDream: (id: string) => void, onRefresh: () => void }) {
  
  const getFormattedDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha desconocida';
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Diario de Sueños
            </h2>
            <Button variant="ghost" size="icon" onClick={onRefresh} disabled={isLoading}>
                <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}/>
            </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
         {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : dreams.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground mt-8">
              <p>Tu diario está vacío. ¡Interpreta tu primer sueño para empezar!</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {dreams.map(dream => (
                <div key={dream.id} className="relative group/item">
                    <button onClick={() => onSelectDream(dream.id)} className="w-full text-left">
                        <Card className="hover:bg-muted/50 transition-colors">
                            <CardHeader className="p-3">
                                <CardTitle className="text-sm font-semibold truncate">{dream.interpretation.dreamTitle}</CardTitle>
                                <CardDescription className="text-xs">{getFormattedDate(dream.createdAt)}</CardDescription>
                            </CardHeader>
                        </Card>
                    </button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover/item:opacity-100">
                            <Trash2 className="w-4 h-4 text-destructive"/>
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


export default function DreamWeaverPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [dream, setDream] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  const [dreamHistory, setDreamHistory] = useState<DreamInterpretationDoc[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // --- Start Data Fetching for Sidebar ---
  const chatsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'desc')) : undefined),
    [user?.uid, firestore]
  );
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);
  // --- End Data Fetching for Sidebar ---

  const fetchDreamHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
        const token = await user.getIdToken();
        const history = await getDreamHistoryAction(token);
        setDreamHistory(history);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo cargar tu historial de sueños.' });
    } finally {
        setHistoryLoading(false);
    }
  }, [user, toast]);

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
      
      fetchDreamHistory();
    } else if (!authLoading) {
      setHistoryLoading(false);
    }
  }, [user, authLoading, fetchDreamHistory]);
  

  const handleAnalyzeDream = async () => {
    if (!dream.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, describe tu sueño.' });
      return;
    }
    if (!profile) {
       toast({ variant: 'destructive', title: 'Perfil no encontrado', description: 'Es necesario un perfil psicológico para interpretar el sueño.' });
       return;
    }
    if (!user) {
       toast({ variant: 'destructive', title: 'Error de autenticación', description: 'Debes iniciar sesión para analizar un sueño.' });
       return;
    }

    setIsAnalyzing(true);
    try {
      const token = await user.getIdToken();
      const result = await interpretDreamAction({
        dreamDescription: dream,
        userProfile: JSON.stringify(profile),
      }, token);

      await fetchDreamHistory();
      router.push(`/dreams/analysis?id=${result.id}`);

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error en el análisis',
        description: error.message || 'No se pudo interpretar el sueño. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteDream = async (id: string) => {
    if (!user) return;
    
    const originalHistory = [...dreamHistory];
    setDreamHistory(prev => prev.filter(d => d.id !== id));

    try {
        const token = await user.getIdToken();
        await deleteDreamAction(id, token);
        toast({ title: 'Éxito', description: 'El sueño ha sido eliminado.' });
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo eliminar el sueño.' });
        setDreamHistory(originalHistory); // Revert on error
    }
  };


  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar>
          <ChatSidebar chats={chats || []} activeChatId={''} isLoading={chatsLoading} removeChat={() => {}} clearChats={() => {}} />
        </Sidebar>
        <SidebarInset className="flex overflow-hidden">
            <aside className="w-80 border-r flex-shrink-0 hidden md:block overflow-y-auto">
                <DreamHistorySidebar dreams={dreamHistory} isLoading={historyLoading} onSelectDream={(id) => router.push(`/dreams/analysis?id=${id}`)} onDeleteDream={handleDeleteDream} onRefresh={fetchDreamHistory} />
            </aside>
            <main className="flex-1 flex flex-col overflow-y-auto bg-gradient-to-b from-background via-slate-900 to-black text-foreground">
                <div className="sticky top-0 bg-transparent backdrop-blur-sm border-b border-white/10 p-4 sm:p-6 z-10">
                    <div className="flex items-center gap-2 max-w-5xl mx-auto">
                        <Button asChild variant="ghost" size="icon" className="-ml-2 hover:bg-white/10">
                            <Link href="/">
                                <ChevronLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                         <h1 className="text-2xl font-bold tracking-tight text-white">Portal de Sueños</h1>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl mx-auto text-center space-y-8 animate-in fade-in-50 duration-700">
                         <div className="space-y-2">
                             <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-primary via-fuchsia-400 to-amber-300">
                                ¿Qué te ha mostrado el subconsciente?
                             </h2>
                             <p className="text-lg text-slate-400">Describe tu sueño con todos los detalles que recuerdes. La IA conectará sus símbolos con tu viaje interior.</p>
                         </div>
                        
                         {profileError && (
                            <Alert variant="destructive" className="text-left bg-yellow-900/20 border-yellow-500/30">
                                <Info className="h-4 w-4 text-yellow-400" />
                                <AlertTitle className="text-yellow-300">Contexto Limitado</AlertTitle>
                                <AlertDescription className="text-yellow-200/80">
                                    {profileError}
                                </AlertDescription>
                            </Alert>
                         )}

                        <div className="relative">
                            <Textarea
                                value={dream}
                                onChange={(e) => setDream(e.target.value)}
                                placeholder="Anoche soñé que estaba en una casa que no conocía, y todas las puertas desaparecían..."
                                className="min-h-[200px] bg-slate-900/50 border-slate-700 rounded-xl p-4 text-base ring-offset-background focus-visible:ring-2 focus-visible:ring-primary/80 focus-visible:ring-offset-0 transition-all duration-300"
                            />
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none rounded-b-xl" />
                        </div>

                         <Button
                            onClick={handleAnalyzeDream}
                            disabled={isAnalyzing || !profile || authLoading}
                            size="lg"
                            className="w-full sm:w-auto text-lg px-8 py-6 rounded-full bg-primary/90 hover:bg-primary shadow-lg shadow-primary/20 transition-all transform hover:scale-105"
                         >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                    Analizando...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="mr-3 h-5 w-5" />
                                    Interpretar mi Sueño
                                </>
                            )}
                         </Button>
                    </div>
                </div>
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

    
