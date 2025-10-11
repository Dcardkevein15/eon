'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Wand2, Loader2, X } from 'lucide-react';
import type { HabitLoopData } from './psychological-profile';
import { generateBreakdownExerciseAction } from '@/app/actions';
import type { GenerateBreakdownExerciseOutput } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent } from '../ui/card';
import { Separator } from '../ui/separator';

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
    setExercise(null); // Clear previous exercise
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
        <DialogContent className="p-0 m-0 w-screen h-screen max-w-full sm:max-w-full block rounded-none border-none">
          <DialogClose className="fixed top-4 right-4 z-50 h-9 w-9 bg-red-600/80 hover:bg-red-700 text-white rounded-full flex items-center justify-center transition-colors">
            <X className="h-5 w-5" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
          
          <ScrollArea className="h-full w-full">
            <div className="container mx-auto max-w-4xl py-12 sm:py-20 px-4">
              {isLoading && !exercise && (
                <div className="flex flex-col items-center justify-center h-[80vh] text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                  <h2 className="text-2xl font-semibold">Generando tu ejercicio...</h2>
                  <p className="text-muted-foreground mt-2">La IA está creando una guía personalizada para ti.</p>
                </div>
              )}

              {exercise && (
                <div className="animate-in fade-in duration-500">
                  {/* Header */}
                  <header className="text-center mb-12">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-primary">{exercise.title}</h1>
                    <div className="prose prose-lg dark:prose-invert max-w-3xl mx-auto mt-4 text-muted-foreground">
                      <ReactMarkdown>{exercise.introduction}</ReactMarkdown>
                    </div>
                  </header>

                  <Separator className="my-12" />

                  {/* Content Grid */}
                  <div className="grid md:grid-cols-5 gap-8">
                    {/* Main Exercise Steps */}
                    <div className="md:col-span-3">
                      <Card className="bg-transparent border-none shadow-none">
                        <CardContent className="p-0">
                          <div className="prose prose-base dark:prose-invert max-w-none">
                            <ReactMarkdown>{exercise.exerciseSteps}</ReactMarkdown>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Final Thought */}
                    <div className="md:col-span-2">
                      <Card className="bg-card/50 sticky top-20">
                         <CardContent className="p-6">
                           <div className="prose prose-sm dark:prose-invert max-w-none">
                             <h3 className="text-accent font-semibold">Reflexión Final</h3>
                             <ReactMarkdown>{exercise.finalThought}</ReactMarkdown>
                           </div>
                         </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}