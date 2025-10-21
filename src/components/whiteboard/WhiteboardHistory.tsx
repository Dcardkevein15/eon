
'use client';

import type { WhiteboardImageRecord } from '@/lib/types';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Eye, Trash2 } from 'lucide-react';
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

interface WhiteboardHistoryProps {
    history: WhiteboardImageRecord[];
    onSelectImage: (imageUrl: string) => void;
    onDeleteImage: (id: string) => void;
}

export default function WhiteboardHistory({ history, onSelectImage, onDeleteImage }: WhiteboardHistoryProps) {

    const getFormattedDate = (dateString: string) => {
        try {
            return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: es });
        } catch {
            return "Fecha desconocida";
        }
    }
    
    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                <p>El historial de la pizarra está vacío.</p>
                <p className="text-xs mt-1">Las imágenes que generes aparecerán aquí.</p>
            </div>
        )
    }

    return (
        <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
                {history.map(record => (
                    <div key={record.id} className="relative group overflow-hidden rounded-lg border">
                        <Image 
                            src={record.imageUrl}
                            alt={record.prompt}
                            width={300}
                            height={169}
                            className="w-full h-auto object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs font-semibold text-white truncate">{record.prompt}</p>
                             <p className="text-xs text-white/70">{getFormattedDate(record.createdAt)}</p>
                             <div className="flex gap-2 mt-2">
                                <Button size="sm" className="flex-1 h-8" onClick={() => onSelectImage(record.imageUrl)}>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver
                                </Button>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                       <Button variant="destructive" size="sm" className="h-8">
                                            <Trash2 className="w-4 h-4" />
                                       </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar esta imagen?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción eliminará la imagen de tu historial local permanentemente.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDeleteImage(record.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}

    