'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import type { CachedProfile, ProfileData, DreamInterpretation } from '@/lib/types';
import { interpretDreamAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChevronLeft, Loader2, Wand2, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useCollection, useFirestore } from '@/firebase';
import type { Chat } from '@/lib/types';
import { collection, query, orderBy } from 'firebase/firestore';


export default function DreamWeaverPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [dream, setDream] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // --- Start Data Fetching for Sidebar ---
  const chatsQuery = useMemo(
    () => (user?.uid && firestore ? query(collection(firestore, `users/${user.uid}/chats`), orderBy('createdAt', 'desc')) : undefined),
    [user?.uid, firestore]
  );
  const { data: chats, loading: chatsLoading } = useCollection<Chat>(chatsQuery);
  // --- End Data Fetching for Sidebar ---

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

    setIsAnalyzing(true);
    try {
      const result = await interpretDreamAction({
        dreamDescription: dream,
        userProfile: JSON.stringify(profile),
      });

      // Store result in session storage and redirect
      sessionStorage.setItem('dream-analysis-result', JSON.stringify(result));
      router.push('/dreams/analysis');

    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error en el análisis',
        description: error.message || 'No se pudo interpretar el sueño. Por favor, inténtalo de nuevo.',
      });
      setIsAnalyzing(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background">
        <Sidebar>
          <ChatSidebar chats={chats || []} activeChatId={''} isLoading={chatsLoading} removeChat={() => {}} clearChats={() => {}} />
        </Sidebar>
        <SidebarInset>
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
                            disabled={isAnalyzing || !profile}
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
