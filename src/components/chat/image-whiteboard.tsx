
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Download } from 'lucide-react';
import { generateImagePrompt } from '@/ai/flows/generate-image-prompt';
import { generateImageX } from '@/ai/flows/generate-image-x';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';

interface ImageWhiteboardProps {
  isOpen: boolean;
  onClose: () => void;
  conversationHistory: string;
}

type GenerationState = 'idle' | 'prompting' | 'generating' | 'done' | 'error';

export default function ImageWhiteboard({ isOpen, onClose, conversationHistory }: ImageWhiteboardProps) {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [state, setState] = useState<GenerationState>('idle');
  const { toast } = useToast();

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Por favor, introduce una idea para la imagen.' });
      return;
    }
    
    setState('prompting');
    try {
      // 1. Generate an artistic prompt
      const artDirectorResponse = await generateImagePrompt({
        conversationHistory: `${conversationHistory}\nuser: Crea una imagen sobre: ${prompt}`,
      });
      const artisticPrompt = artDirectorResponse.prompt;

      // 2. Generate the image with the artistic prompt
      setState('generating');
      const imageResponse = await generateImageX({ prompt: artisticPrompt });

      setImageUrl(imageResponse.imageUrl);
      setState('done');
    } catch (error: any) {
      console.error('Image generation failed:', error);
      toast({ variant: 'destructive', title: 'Error de Generación', description: error.message || 'No se pudo generar la imagen.' });
      setState('error');
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `nimbus-art-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleClose = () => {
    // Reset state only when closing
    setPrompt('');
    setImageUrl(null);
    setState('idle');
    onClose();
  }

  const isLoading = state === 'prompting' || state === 'generating';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Pizarra de Creación
          </DialogTitle>
          <DialogDescription>
            Describe una idea o concepto y la IA lo convertirá en una imagen visual.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: Un mapa mental de mis preocupaciones"
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleGenerateImage()}
            />
            <Button onClick={handleGenerateImage} disabled={isLoading || !prompt.trim()}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
              <span className="ml-2 hidden sm:inline">
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
                    className="absolute text-center text-muted-foreground"
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
            <Button onClick={handleDownload} variant="secondary" className="w-full">
              <Download className="mr-2" />
              Descargar Imagen
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
