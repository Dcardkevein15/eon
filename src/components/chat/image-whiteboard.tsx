'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Download, Trash2, History, Image as ImageIcon, Sparkles, X } from 'lucide-react';
import { generateImagePrompt } from '@/ai/flows/generate-image-prompt';
import { generateImageX } from '@/ai/flows/generate-image-x';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';

// --- TYPES ---
type ImageHistoryItem = {
  id: string;
  prompt: string;
  artisticPrompt: string;
  imageUrl: string;
  createdAt: string;
};

type GenerationState = 'idle' | 'prompting' | 'generating' | 'done' | 'error';

const DB_NAME = 'ImageHistoryDB';
const STORE_NAME = 'images';
const MAX_HISTORY_ITEMS = 1000;

// --- IndexedDB Hook ---
const useImageHistoryStore = () => {
    const [history, setHistory] = useState<ImageHistoryItem[]>([]);
    const [db, setDb] = useState<IDBDatabase | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = () => {
            const dbInstance = request.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => {
            setDb(request.result);
        };

        request.onerror = () => {
            console.error('Error opening IndexedDB', request.error);
            setIsLoading(false);
        };
    }, []);

    useEffect(() => {
        if (db) {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = () => {
                const sortedHistory = getAllRequest.result.sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setHistory(sortedHistory);
                setIsLoading(false);
            };
            getAllRequest.onerror = () => {
                console.error("Error fetching history from IndexedDB", getAllRequest.error);
                setIsLoading(false);
            }
        }
    }, [db]);

    const addImageToHistory = useCallback(async (item: ImageHistoryItem) => {
        if (!db) return;

        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        store.add(item);

        const countRequest = store.count();
        countRequest.onsuccess = () => {
            if (countRequest.result > MAX_HISTORY_ITEMS) {
                const cursorRequest = store.openCursor(null, 'next'); // oldest is first
                cursorRequest.onsuccess = () => {
                    const cursor = cursorRequest.result;
                    if (cursor) {
                        store.delete(cursor.primaryKey);
                    }
                };
            }
        };

        setHistory(prev => [item, ...prev].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, MAX_HISTORY_ITEMS));


    }, [db]);

    const deleteImageFromHistory = useCallback(async (id: string) => {
        if (!db) return;
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(id);
        setHistory(prev => prev.filter(item => item.id !== id));
    }, [db]);

    return { history, addImageToHistory, deleteImageFromHistory, isLoadingHistory: isLoading };
};


// --- MAIN COMPONENT ---
export default function ImageWhiteboard({ isOpen, onClose, conversationHistory }: { isOpen: boolean; onClose: () => void; conversationHistory: string }) {
  const [prompt, setPrompt] = useState('');
  const [currentArtisticPrompt, setCurrentArtisticPrompt] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [state, setState] = useState<GenerationState>('idle');
  const { toast } = useToast();
  const { history, addImageToHistory, deleteImageFromHistory, isLoadingHistory } = useImageHistoryStore();


  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, introduce una idea para la imagen.' });
      return;
    }
    
    setState('prompting');
    setCurrentImageUrl(null);
    setCurrentArtisticPrompt('');

    try {
      // 1. Generate artistic prompt
      const artDirectorResponse = await generateImagePrompt({
        conversationHistory: `${conversationHistory}\nuser: Crea una imagen sobre: ${prompt}`,
      });
      const artisticPrompt = artDirectorResponse.prompt;
      setCurrentArtisticPrompt(artisticPrompt);

      // 2. Generate image
      setState('generating');
      const imageResponse = await generateImageX({ prompt: artisticPrompt });
      
      if (!imageResponse.imageUrl || !imageResponse.imageUrl.startsWith('data:image')) {
        throw new Error('La IA no devolvió una URL de imagen válida.');
      }
      const generatedImageUrl = imageResponse.imageUrl;
      setCurrentImageUrl(generatedImageUrl);

      // 3. Add to history
      const newHistoryItem: ImageHistoryItem = {
        id: uuidv4(),
        prompt,
        artisticPrompt,
        imageUrl: generatedImageUrl,
        createdAt: new Date().toISOString(),
      };
      await addImageToHistory(newHistoryItem);

      setState('done');
    } catch (error: any) {
      console.error('Image generation failed:', error);
      toast({ variant: 'destructive', title: 'Error de Generación', description: error.message || 'No se pudo generar la imagen.' });
      setState('error');
    }
  };

  const handleDownload = (url: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `nimbus-art-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleClose = () => {
    onClose();
  }

  const isLoading = state === 'prompting' || state === 'generating';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="p-0 m-0 w-screen h-screen max-w-full block rounded-none border-none bg-black/50 backdrop-blur-md">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="animated-border"></div>
        </div>
        <div className="relative z-10 w-full h-full flex flex-col p-4 sm:p-6 md:p-8">
            <DialogClose className="fixed top-4 right-4 z-50 h-9 w-9 bg-background/50 hover:bg-background/80 text-foreground rounded-full flex items-center justify-center transition-colors">
                <X className="h-5 w-5" />
                <span className="sr-only">Cerrar</span>
            </DialogClose>
            
            <DialogHeader className="text-center pt-4 sm:pt-0">
              <DialogTitle className="flex items-center justify-center gap-2 text-2xl sm:text-3xl text-white">
                <Wand2 className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                Pizarra de Creación
              </DialogTitle>
              <DialogDescription className="text-white/70">
                Forja tus pensamientos en imágenes. Las creaciones se guardan en tu dispositivo.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="create" className="w-full flex-1 flex flex-col overflow-hidden mt-4">
                <div className="flex justify-center">
                     <TabsList className="grid w-full max-w-md grid-cols-2 bg-background/50 text-muted-foreground border-border border">
                        <TabsTrigger value="create" className="gap-2">
                            <Sparkles className="h-4 w-4"/>
                            Crear
                        </TabsTrigger>
                        <TabsTrigger value="history" className="gap-2">
                            <History className="h-4 w-4"/>
                            Historial ({history.length})
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Create Tab */}
                <TabsContent value="create" className="flex-1 flex flex-col gap-4 p-1 mt-4">
                    <div className="flex gap-2">
                        <Input
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Ej: Un mapa mental de mis preocupaciones"
                            disabled={isLoading}
                            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleGenerateImage()}
                            className="bg-background/80 border-border text-base h-12"
                        />
                        <Button onClick={handleGenerateImage} disabled={isLoading || !prompt.trim()} className="w-44 h-12 text-base">
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2"/>}
                            <span className="truncate">
                            {state === 'prompting' ? 'Creando...' : state === 'generating' ? 'Forjando...' : 'Generar'}
                            </span>
                        </Button>
                    </div>

                    <div className="relative w-full flex-1 bg-background/30 rounded-lg flex items-center justify-center border border-dashed border-white/20">
                         <AnimatePresence>
                            {isLoading && (
                            <motion.div
                                key="loader"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute text-center text-white/80 p-4"
                            >
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                <p className="mt-4 text-sm font-semibold">
                                {state === 'prompting' ? 'El Director de Arte está trabajando...' : 'El Pincel de la IA está pintando...'}
                                </p>
                            </motion.div>
                            )}
                        </AnimatePresence>
                        <AnimatePresence>
                            {currentImageUrl && state === 'done' && (
                            <motion.div
                                key="image"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full h-full relative p-4"
                            >
                                <Image src={currentImageUrl} alt={prompt} layout="fill" objectFit="contain" className="rounded-lg" />
                                <div className="absolute top-2 right-2">
                                    <Button size="icon" variant="secondary" onClick={() => handleDownload(currentImageUrl)}>
                                        <Download className="h-5 w-5"/>
                                    </Button>
                                </div>
                            </motion.div>
                            )}
                        </AnimatePresence>
                        {state === 'idle' && !currentImageUrl && (
                            <div className="text-center text-white/60 p-4">
                                <ImageIcon className="h-12 w-12 mx-auto mb-2"/>
                                <p className="text-sm font-semibold">El lienzo espera tus ideas.</p>
                            </div>
                        )}
                        {state === 'error' && (
                            <p className="text-sm text-destructive">Error al generar la imagen. Inténtalo de nuevo.</p>
                        )}
                    </div>
                </TabsContent>

                {/* History Tab */}
                 <TabsContent value="history" className="flex-1 flex flex-col mt-4 overflow-hidden">
                    <ScrollArea className="h-full px-1 py-4">
                        {isLoadingHistory ? (
                             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {[...Array(10)].map((_, i) => <Skeleton key={i} className="aspect-square bg-muted/20" />)}
                             </div>
                        ) : history.length > 0 ? (
                            <>
                            <p className="text-xs text-white/50 text-center mb-4">Mostrando las últimas {history.length} de hasta {MAX_HISTORY_ITEMS} imágenes guardadas en este dispositivo.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                <TooltipProvider>
                                {history.filter(item => item.imageUrl).map(item => (
                                    <Card key={item.id} className="relative group overflow-hidden aspect-square bg-background/50 border-border/50">
                                        <Image 
                                          src={item.imageUrl}
                                          alt={item.prompt} 
                                          layout="fill" 
                                          objectFit="cover"
                                          unoptimized
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-xs text-white/90 font-semibold truncate">{item.prompt}</p>
                                            <div className="flex gap-1 mt-1">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/80 hover:bg-white/20 hover:text-white" onClick={() => handleDownload(item.imageUrl)}>
                                                            <Download className="h-4 w-4"/>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Descargar</p></TooltipContent>
                                                </Tooltip>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={() => deleteImageFromHistory(item.id)}>
                                                            <Trash2 className="h-4 w-4"/>
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Eliminar</p></TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                                </TooltipProvider>
                            </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-white/60 p-4">
                                <div className="max-w-xs">
                                    <History className="h-12 w-12 mx-auto mb-2"/>
                                    <p className="text-sm font-semibold">Tu historial está vacío.</p>
                                    <p className="text-xs">Ve a la pestaña "Crear" para generar tu primera obra de arte.</p>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
