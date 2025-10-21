
'use client';

import React, { useEffect, useState } from 'react';
import type { WhiteboardState } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { BrainCircuit, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface WhiteboardProps {
  state: WhiteboardState | null;
  isLoading: boolean;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ state, isLoading }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (isLoading) {
    return <Skeleton className="w-full h-full" />;
  }

  if (!isClient) {
    return <Skeleton className="w-full h-full" />;
  }

  if (!state || !state.imageUrl) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 bg-background/50">
            <ImageIcon className="w-12 h-12 text-primary/50 mb-4" />
            <h3 className="font-semibold text-lg text-foreground">Esta es tu Pizarra Visual</h3>
            <p className="mt-2 max-w-sm">La IA generará una imagen artística para visualizar tus ideas. Prueba con: <strong className="text-primary/80">"Crea un mapa mental de mis metas"</strong>.</p>
        </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-4">
        <div className="relative w-full h-full">
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
