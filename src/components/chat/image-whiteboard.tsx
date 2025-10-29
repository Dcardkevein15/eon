'use client';

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Download, Trash2, History, Image as ImageIcon, Sparkles, ImageOff } from 'lucide-react';
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

// --- INDEXEDDB HOOK ---
function useImageHistoryStore() {
  const [history, setHistory] = useState<ImageHistoryItem[]>([]);
  const [db, setDb] = useState<IDBDatabase | null>(null);

  useEffect(() => {
    const request = indexedDB.open('ImageHistoryDB', 1);
    
    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains('images')) {
        dbInstance.createObjectStore('images', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      setDb(dbInstance);
      
      // Load initial data
      const transaction = dbInstance.transaction('images', 'readonly');
      const store = transaction.objectStore('images');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const sortedHistory = getAllRequest.result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setHistory(sortedHistory);
      };
    };
    
    request.onerror = (event) => {
      console.error('IndexedDB error:', (event.target as IDBOpenDBRequest).error);
    };
  }, []);

  const addImage = async (item: ImageHistoryItem) => {
    if (!db) return;

    const transaction = db.transaction('images', 'readwrite');
    const store = transaction.objectStore('images');
    
    // Add new item
    store.put(item);
    
    // Enforce history limit (e.g., 20 items)
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result > 20) {
        const cursorRequest = store.openCursor(null, 'next'); // 'next' gives oldest items first
        let toDelete = countRequest.result - 20;
        cursorRequest.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor && toDelete > 0) {
            cursor.delete();
            toDelete--;
            cursor.continue();
          }
        }
      }
    };

    return new Promise<void>((resolve) => {
      transaction.oncomplete = () => {
        const newHistory = [item, ...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
        setHistory(newHistory);
        resolve();
      };
      transaction.onerror = () => resolve(); // Resolve even on error
    });
  };

  const deleteImage = async (id: string) => {
    if (!db) return;

    const transaction = db.transaction('images', 'readwrite');
    const store = transaction.objectStore('images');
    store.delete(id);

    return new Promise<void>((resolve) => {
      transaction.oncomplete = () => {
        setHistory(prev => prev.filter(item => item.id !== id));
        resolve();
      };
       transaction.onerror = () => resolve();
    });
  };

  return { history, addImage, deleteImage };
}


// --- MAIN COMPONENT ---
export default function ImageWhiteboard({ isOpen, onClose, conversationHistory }: { isOpen: boolean; onClose: () => void; conversationHistory: string }) {
  const [prompt, setPrompt] = useState('');
  const [currentArtisticPrompt, setCurrentArtisticPrompt] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [state, setState] = useState<GenerationState>('idle');
  const { toast } = useToast();
  
  const { history, addImage, deleteImage } = useImageHistoryStore();

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

      // 3. Add to history via IndexedDB hook
      const newHistoryItem: ImageHistoryItem = {
        id: uuidv4(),
        prompt,
        artisticPrompt,
        imageUrl: generatedImageUrl,
        createdAt: new Date().toISOString(),
      };
      await addImage(newHistoryItem);

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

  const handleDeleteFromHistory = (id: string) => {
    deleteImage(id);
  };
  
  const handleClose = () => {
    setPrompt('');
    setCurrentImageUrl(null);
    setState('idle');
    onClose();
  }

  const isLoading = state === 'prompting' || state === 'generating';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Pizarra de Creación
          </DialogTitle>
          <DialogDescription>
            Usa la IA para crear imágenes o revisa tus creaciones. Las imágenes se guardan en tu navegador.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="create" className="w-full flex-1 flex flex-col overflow-hidden">
            <div className="px-6">
                 <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create">
                        <Sparkles className="mr-2 h-4 w-4"/>
                        Crear
                    </TabsTrigger>
                    <TabsTrigger value="history">
                        <History className="mr-2 h-4 w-4"/>
                        Historial ({history.length})
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* Create Tab */}
            <TabsContent value="create" className="flex-1 flex flex-col gap-4 p-6 pt-4 m-0">
                <div className="flex gap-2">
                    <Input
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ej: Un mapa mental de mis preocupaciones"
                        disabled={isLoading}
                        onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleGenerateImage()}
                    />
                    <Button onClick={handleGenerateImage} disabled={isLoading || !prompt.trim()} className="w-44">
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2"/>}
                        <span className="truncate">
                        {state === 'prompting' ? 'Creando prompt...' : state === 'generating' ? 'Generando...' : 'Generar'}
                        </span>
                    </Button>
                </div>

                <div className="relative w-full flex-1 bg-muted/20 rounded-lg flex items-center justify-center border border-dashed">
                     <AnimatePresence>
                        {isLoading && (
                        <motion.div
                            key="loader"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute text-center text-muted-foreground p-4"
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
                            className="w-full h-full relative"
                        >
                            <Image src={currentImageUrl} alt={prompt} layout="fill" objectFit="contain" className="rounded-lg" />
                            <div className="absolute top-2 right-2">
                                <Button size="icon" onClick={() => handleDownload(currentImageUrl)}>
                                    <Download className="h-5 w-5"/>
                                </Button>
                            </div>
                        </motion.div>
                        )}
                    </AnimatePresence>
                    {state === 'idle' && !currentImageUrl && (
                        <div className="text-center text-muted-foreground p-4">
                            <ImageIcon className="h-12 w-12 mx-auto mb-2"/>
                            <p className="text-sm font-semibold">La imagen aparecerá aquí.</p>
                        </div>
                    )}
                    {state === 'error' && (
                        <p className="text-sm text-destructive">Error al generar la imagen. Inténtalo de nuevo.</p>
                    )}
                </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 flex flex-col overflow-y-hidden m-0 pt-4">
                <ScrollArea className="h-full px-6 pb-6">
                    {history.length > 0 ? (
                        <>
                        <p className="text-xs text-muted-foreground text-center mb-4">Mostrando las últimas 20 imágenes guardadas en tu navegador.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <TooltipProvider>
                            {history.filter(item => item.imageUrl).map(item => (
                                <Card key={item.id} className="relative group overflow-hidden aspect-square bg-muted/20">
                                    <Image 
                                      src={item.imageUrl}
                                      alt={item.prompt} 
                                      layout="fill" 
                                      objectFit="cover"
                                      unoptimized
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={() => handleDeleteFromHistory(item.id)}>
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
                        <div className="flex items-center justify-center h-full text-center text-muted-foreground p-4">
                            <div className="max-w-xs">
                                <History className="h-12 w-12 mx-auto mb-2"/>
                                <p className="text-sm font-semibold">Tu historial de esta sesión está vacío.</p>
                                <p className="text-xs">Ve a la pestaña "Crear" para generar tu primera obra de arte.</p>
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
