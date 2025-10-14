'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import type { CachedProfile, ProfileData, DreamInterpretationDoc } from '@/lib/types';
import { interpretDreamAction } from '@/app/actions';
import { collection, addDoc, serverTimestamp, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, Loader2, Wand2, Info, BookOpen, Trash2, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Sidebar, SidebarProvider, SidebarInset, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import type { Chat } from '@/lib/types';
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

function DreamHistorySidebar({ dreams, isLoading, onSelectDream, onDeleteDream }: { dreams: DreamInterpretationDoc[], isLoading: boolean, onSelectDream: (id: string) => void, onDeleteDream: (id: string) => Promise<void> }) {
  
  const getFormattedDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha desconocida';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-r border-slate-800 text-slate-200">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-400" />
                Diario de Sueños
            </h2>
        </div>
      </div>
      <ScrollArea className="flex-1">
         {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-20 w-full bg-slate-800" />
              <Skeleton className="h-20 w-full bg-slate-800" />
              <Skeleton className="h-20 w-full bg-slate-800" />
            </div>
          ) : dreams.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400 mt-8">
              <p>Tu diario está vacío. ¡Interpreta tu primer sueño para empezar!</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {dreams.map(dream => (
                <div key={dream.id} className="relative group/item">
                    <button onClick={() => onSelectDream(dream.id)} className="w-full text-left">
                        <Card className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-sky-500/50 transition-colors">
                            <CardHeader className="p-3">
                                <CardTitle className="text-sm font-semibold truncate text-slate-100">{dream.interpretation.dreamTitle}</CardTitle>
                                <CardDescription className="text-xs text-slate-400">{getFormattedDate(dream.createdAt)}</CardDescription>
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


export default function DreamWeaverPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [dream, setDream] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // --- Start Data Fetching for Sidebar (Chat History) ---
  const chatsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'desc')) : undefined),
    [user?.uid, firestore]
  );
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);
  // --- End Data Fetching for Sidebar (Chat History) ---

  // --- Start Data Fetching for Dream History ---
  const dreamsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/dreams`), orderBy('createdAt', 'desc')) : undefined),
    [user?.uid, firestore]
  );
  const { data: dreamHistory, loading: historyLoading } = useCollection<DreamInterpretationDoc>(dreamsQuery);
  // --- End Data Fetching for Dream History ---

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
  
  const handleAnalyzeDream = async () => {
    if (!dream.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, describe tu sueño.' });
      return;
    }
    if (!profile) {
       toast({ variant: 'destructive', title: 'Perfil no encontrado', description: 'Es necesario un perfil psicológico para interpretar el sueño.' });
       return;
    }
    if (!user || !firestore) {
       toast({ variant: 'destructive', title: 'Error de autenticación', description: 'Debes iniciar sesión para analizar un sueño.' });
       return;
    }

    setIsAnalyzing(true);
    try {
      // 1. Get AI Interpretation
      const interpretation = await interpretDreamAction({
        dreamDescription: dream,
        userProfile: JSON.stringify(profile),
      });

      // 2. Save to Firestore
      const dreamsCollectionRef = collection(firestore, `users/${user.uid}/dreams`);
      const dreamDoc = {
        userId: user.uid,
        dreamDescription: dream,
        interpretation,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(dreamsCollectionRef, dreamDoc);
      
      // 3. Redirect to analysis page
      router.push(`/dreams/analysis?id=${docRef.id}`);

    } catch (error: any) {
      console.error(error);
      const isPermissionError = error.code === 'permission-denied';

      if(isPermissionError) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `users/${user.uid}/dreams`,
          operation: 'create',
          requestResourceData: { dreamDescription: dream },
        }));
      }

      toast({
        variant: 'destructive',
        title: 'Error en el análisis',
        description: isPermissionError 
          ? "No tienes permiso para guardar sueños. Revisa las reglas de seguridad."
          : error.message || 'No se pudo interpretar el sueño. Por favor, inténtalo de nuevo.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteDream = async (id: string) => {
    if (!user || !firestore) return;
    
    const dreamDocRef = doc(firestore, `users/${user.uid}/dreams`, id);
    try {
        await deleteDoc(dreamDocRef);
        toast({ title: 'Éxito', description: 'El sueño ha sido eliminado.' });
    } catch(e: any) {
        if(e.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: dreamDocRef.path,
                operation: 'delete',
            }));
        }
        toast({ variant: 'destructive', title: 'Error', description: e.message || 'No se pudo eliminar el sueño.' });
    }
  };


  return (
    <SidebarProvider>
      <div className="flex h-screen bg-slate-950 text-slate-100">
        <Sidebar>
          <ChatSidebar chats={chats || []} activeChatId={''} isLoading={chatsLoading} removeChat={() => {}} clearChats={() => {}} />
        </Sidebar>
        <SidebarInset className="flex overflow-hidden">
            <aside className="w-80 border-r border-slate-800 flex-shrink-0 hidden md:block overflow-y-auto">
                <DreamHistorySidebar dreams={dreamHistory || []} isLoading={historyLoading} onSelectDream={(id) => router.push(`/dreams/analysis?id=${id}`)} onDeleteDream={handleDeleteDream} />
            </aside>
            <main className="flex-1 flex flex-col overflow-y-auto">
                <div className="sticky top-0 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800 p-4 z-10">
                    <div className="flex items-center gap-2 max-w-3xl mx-auto">
                        <Button asChild variant="ghost" size="icon" className="-ml-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                            <Link href="/">
                                <ChevronLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                         <h1 className="text-xl font-bold tracking-tight text-white">Portal de Sueños</h1>
                    </div>
                </div>

                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl mx-auto text-center space-y-8 animate-in fade-in-50 duration-700">
                         <div className="space-y-2">
                             <h2 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-slate-100 via-slate-300 to-sky-400">
                                ¿Qué te ha mostrado tu subconsciente?
                             </h2>
                             <p className="text-lg text-slate-400">Describe tu sueño con todos los detalles que recuerdes. La IA conectará sus símbolos con tu viaje interior.</p>
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

                        <div className="relative">
                            <Textarea
                                value={dream}
                                onChange={(e) => setDream(e.target.value)}
                                placeholder="Anoche soñé que estaba en una casa que no conocía, y todas las puertas desaparecían..."
                                className="min-h-[200px] bg-slate-900 border-slate-700 rounded-xl p-4 text-base ring-offset-slate-950 focus-visible:ring-2 focus-visible:ring-sky-500/80 focus-visible:ring-offset-2 transition-all duration-300"
                            />
                        </div>

                         <Button
                            onClick={handleAnalyzeDream}
                            disabled={isAnalyzing || !profile || authLoading}
                            size="lg"
                            className="w-full sm:w-auto text-base px-8 py-6 rounded-full bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20 transition-all transform hover:scale-105"
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
