
'use client';

import React, { useEffect, useState } from 'react';
import type { WhiteboardState } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface WhiteboardProps {
  state: WhiteboardState | null;
  isLoading: boolean;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ state, isLoading }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const WelcomeScreen = ({ isLoadingImage }: { isLoadingImage: boolean }) => (
    <div className={cn(
        "flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 bg-background transition-all",
        isLoadingImage && "animate-pulse"
    )}>
        <ImageIcon 
            className={cn(
                "w-12 h-12 text-primary/30 mb-4 transition-all duration-1000",
                isLoadingImage && "text-primary scale-110 [filter:drop-shadow(0_0_8px_hsl(var(--primary)))]"
            )}
        />
        <h3 className={cn(
            "font-semibold text-lg text-foreground/70 transition-all duration-1000",
            isLoadingImage && "text-primary/90"
        )}>
            {isLoadingImage ? 'Generando tu creación visual...' : 'Esta es tu Pizarra Visual'}
        </h3>
        <p className="mt-2 max-w-sm">
            {isLoadingImage 
                ? 'El lienzo de la IA está cobrando vida. Esto puede tardar un momento.' 
                : 'La IA generará una imagen artística para visualizar tus ideas. Prueba con: "Dibuja cómo ves mis miedos".'
            }
        </p>
    </div>
  );

  if (!isClient) {
    return <Skeleton className="w-full h-full bg-background" />;
  }

  if (isLoading) {
    return <WelcomeScreen isLoadingImage={true} />
  }

  if (!state || !state.imageUrl) {
    return <WelcomeScreen isLoadingImage={false} />
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-4">
        <div className="relative w-full h-full animate-in fade-in duration-500">
            <Image 
                src={state.imageUrl}
                alt="Visualización generada por IA"
                layout="fill"
                objectFit="contain"
            />
        </div>
    </div>
  );
};

export default Whiteboard;
