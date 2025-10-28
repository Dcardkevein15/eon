
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Download, Trash2, History, Info } from 'lucide-react';
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


// --- MAIN COMPONENT ---

export default function ImageWhiteboard({ isOpen, onClose, conversationHistory }: ImageWhiteboardProps) {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [state, setState] = useState<GenerationState>('idle');
  const { toast } = useToast();
  
  const [history, setHistory] = useLocalStorage<ImageHistoryItem[]>('image-whiteboard-history', []);
  const [loadingHistory, setLoadingHistory] = useLocalStorage<ImageHistoryItem[]>('image-whiteboard-history', []);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, introduce una idea para la imagen.' });
      return;
    }
    
    setState('prompting');
    setImageUrl(null);
    try {
      const artDirectorResponse = await generateImagePrompt({
        conversationHistory: `${conversationHistory}\nuser: Crea una imagen sobre: ${prompt}`,
      });
      const artisticPrompt = artDirectorResponse.prompt;

      setState('generating');
      const imageResponse = await generateImageX({ prompt: artisticPrompt });
      const generatedImageUrl = imageResponse.imageUrl;
      setImageUrl(generatedImageUrl);

      const newHistoryItem: ImageHistoryItem = {
        id: uuidv4(),
        prompt,
        artisticPrompt,
        imageUrl: generatedImageUrl,
        createdAt: new Date().toISOString(),
      };
      setHistory(prev => [newHistoryItem, ...prev]);

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
    setImageUrl(null);
    setState('idle');
    onClose();
  }

  const isLoading = state === 'prompting' || state === 'generating';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Pizarra de Creación
          </DialogTitle>
          <DialogDescription>
            Describe una idea y la IA lo convertirá en una imagen. Tus creaciones se guardan aquí.
          </DialogDescription>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 h-[calc(100%-80px)]">
           {/* Generation Column */}
          <div className="flex flex-col gap-4">
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

            <div className="relative w-full aspect-video bg-muted/50 rounded-lg flex items-center justify-center border border-dashed">
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                      key="loader"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute text-center text-muted-foreground p-4"
                  >
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="mt-2 text-sm">
                      {state === 'prompting' ? 'El Director de Arte está trabajando...' : 'El Pincel de la IA está pintando...'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {imageUrl && state === 'done' && (
                  <motion.div
                      key="image"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-full"
                  >
                    <Image src={imageUrl} alt="Imagen generada" layout="fill" objectFit="contain" className="rounded-lg" />
                  </motion.div>
                )}
              </AnimatePresence>
              {state === 'idle' && !imageUrl && (
                  <p className="text-sm text-muted-foreground">La imagen aparecerá aquí.</p>
              )}
              {state === 'error' && (
                  <p className="text-sm text-destructive">Error al generar la imagen. Inténtalo de nuevo.</p>
              )}
            </div>
            
            {imageUrl && state === 'done' && (
              <Button onClick={() => handleDownload(imageUrl)} variant="secondary" className="w-full">
                <Download className="mr-2" />
                Descargar Imagen
              </Button>
            )}
          </div>

          {/* History Column */}
          <div className="flex flex-col gap-4">
             <h3 className="text-lg font-semibold flex items-center gap-2 text-muted-foreground">
                <History className="h-5 w-5"/>
                Creaciones Anteriores
             </h3>
             <ScrollArea className="flex-1 border rounded-lg p-2 bg-muted/20">
                {history.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                        <TooltipProvider>
                        {history.map(item => (
                            <Card key={item.id} className="relative group overflow-hidden aspect-square">
                                <Image src={item.imageUrl} alt={item.prompt} layout="fill" objectFit="cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-xs text-white/90 font-semibold truncate">{item.prompt}</p>
                                    <div className="flex gap-1 mt-1">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/80 hover:bg-white/20 hover:text-white" onClick={() => handleDownload(item.imageUrl)}>
                                                    <Download className="h-4 w-4"/>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Descargar</p></TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={() => handleDeleteFromHistory(item.id)}>
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
                        <p className="text-sm">Tu historial de imágenes está vacío. ¡Crea tu primera obra de arte!</p>
                    </div>
                )}
             </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
