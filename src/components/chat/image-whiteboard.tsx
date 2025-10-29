
'use client';

import { useState, useEffect, useCallback } from 'react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';


// --- TYPES AND HOOKS ---

interface ImageWhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  conversationHistory: string;
}

type GenerationState = 'idle' | 'prompting' | 'generating' | 'done' | 'error';

type ImageHistoryItem = {
  id: string;
  prompt: string;
  artisticPrompt: string;
  imageUrl: string;
  createdAt: string;
};

// This type is what we'll actually store in localStorage
type StoredImageHistoryItem = Omit<ImageHistoryItem, 'imageUrl'>;


function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void, boolean] {
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setState(JSON.parse(item));
      }
    } catch (error) {
      console.error("Error al cargar desde localStorage", error);
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setState(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
             console.error("Error al guardar en localStorage", error);
        }
        return valueToStore;
    });
  }, [key]);

  return [state, setValue, isLoading];
}



// --- MAIN COMPONENT ---

const MAX_HISTORY_ITEMS = 20;

export default function ImageWhiteboard({ isOpen, onClose, conversationHistory }: ImageWhiteboardProps) {
  const [prompt, setPrompt] = useState('');
  const [currentArtisticPrompt, setCurrentArtisticPrompt] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [state, setState] = useState<GenerationState>('idle');
  const { toast } = useToast();
  
  const [history, setHistory] = useLocalStorage<StoredImageHistoryItem[]>('image-whiteboard-history', []);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);

   // Re-hydrate the full history with image URLs on mount (relying on browser cache)
   const hydratedHistory: ImageHistoryItem[] = history.map(item => ({
        ...item,
        // Reconstruct the image URL. The browser might have it cached.
        imageUrl: item.artisticPrompt, 
   }));


  useEffect(() => {
    setIsHistoryLoading(true);
    // Simulate loading for better UX, can be adjusted
    setTimeout(() => setIsHistoryLoading(false), 200);
  }, []);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, introduce una idea para la imagen.' });
      return;
    }
    
    setState('prompting');
    setCurrentImageUrl(null);
    setCurrentArtisticPrompt('');

    try {
      const artDirectorResponse = await generateImagePrompt({
        conversationHistory: `${conversationHistory}\nuser: Crea una imagen sobre: ${prompt}`,
      });
      const artisticPrompt = artDirectorResponse.prompt;
      setCurrentArtisticPrompt(artisticPrompt);

      setState('generating');
      const imageResponse = await generateImageX({ prompt: artisticPrompt });
      const generatedImageUrl = imageResponse.imageUrl;
      setCurrentImageUrl(generatedImageUrl);

      // Don't store the heavy imageUrl in localStorage
      const newHistoryItem: StoredImageHistoryItem = {
        id: uuidv4(),
        prompt,
        artisticPrompt,
        createdAt: new Date().toISOString(),
      };
      
      setHistory(prev => [newHistoryItem, ...prev].slice(0, MAX_HISTORY_ITEMS));

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
    setHistory(prev => prev.filter(item => item.id !== id));
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
            Usa la IA para crear imágenes o revisa tus creaciones anteriores.
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
                        Historial
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* Create Tab */}
            <TabsContent value="create" className="flex-1 flex flex-col gap-4 p-6 m-0">
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
            <TabsContent value="history" className="flex-1 flex flex-col overflow-y-hidden m-0">
                <ScrollArea className="h-full px-6 pb-6">
                    {isHistoryLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[...Array(8)].map((_, i) => <Skeleton key={i} className="aspect-square w-full" />)}
                        </div>
                    ) : hydratedHistory.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <TooltipProvider>
                            {hydratedHistory.map(item => (
                                <Card key={item.id} className="relative group overflow-hidden aspect-square bg-muted/20">
                                    <Image 
                                      src={item.imageUrl} // The URL is reconstructed, relies on browser cache
                                      alt={item.prompt} 
                                      layout="fill" 
                                      objectFit="cover"
                                      unoptimized // Important for data URIs
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                    {/* Fallback Icon */}
                                     <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                                        <ImageOff className="w-10 h-10" />
                                    </div>
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
                    ) : (
                        <div className="flex items-center justify-center h-full text-center text-muted-foreground p-4">
                            <div className="max-w-xs">
                                <History className="h-12 w-12 mx-auto mb-2"/>
                                <p className="text-sm font-semibold">Tu historial de imágenes está vacío.</p>
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
