'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wand2, Loader2 } from 'lucide-react';
import type { HabitLoopData } from './psychological-profile';
import { generateBreakdownExerciseAction } from '@/app/actions';
import type { GenerateBreakdownExerciseOutput } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface BreakdownExerciseGeneratorProps {
  habitLoop: HabitLoopData;
}

export default function BreakdownExerciseGenerator({ habitLoop }: BreakdownExerciseGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [exercise, setExercise] = useState<GenerateBreakdownExerciseOutput | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setIsOpen(true);
    try {
      const result = await generateBreakdownExerciseAction({ habitLoop });
      setExercise(result);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo generar el ejercicio. Por favor, inténtalo de nuevo.',
      });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button onClick={handleGenerate} disabled={isLoading} size="sm" className="mt-4 w-full">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        Crear Ejercicio para Mí
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">{exercise?.title || 'Generando Ejercicio...'}</DialogTitle>
            {exercise && (
                 <DialogDescription asChild>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                      <ReactMarkdown>{exercise.introduction}</ReactMarkdown>
                    </div>
                </DialogDescription>
            )}
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] my-4">
             <div className="px-1 py-4">
                {isLoading && !exercise && (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {exercise && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{exercise.exerciseSteps}</ReactMarkdown>
                    <hr />
                    <ReactMarkdown>{exercise.finalThought}</ReactMarkdown>
                </div>
                )}
             </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
