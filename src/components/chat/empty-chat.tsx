'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSuggestedPrompts } from '@/app/actions';
import { AppLogo } from '@/components/logo';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface EmptyChatProps {
  createChat: (input: string) => void;
}

export default function EmptyChat({ createChat }: EmptyChatProps) {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    async function fetchPrompts() {
      setLoading(true);
      const suggestedPrompts = await getSuggestedPrompts();
      setPrompts(suggestedPrompts);
      setLoading(false);
    }
    fetchPrompts();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="max-w-2xl w-full text-center">
        <AppLogo className="w-20 h-20 mx-auto text-primary" />
        <h1 className="text-4xl font-bold mt-4">Bienvenido a ¡tu-psicologo-ya!</h1>
        <p className="text-muted-foreground mt-2">
          Tu asistente profesional para el desahogo y control emocional.
        </p>
        
        <Card className="mt-8 text-left">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <h3>Para empezar</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading || !isClient ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-4/5" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prompts.slice(0, 4).map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-between h-auto py-3 text-sm"
                    onClick={() => createChat(prompt)}
                  >
                    <span className="text-left whitespace-normal">{prompt}</span>
                    <ArrowRight className="w-4 h-4 ml-2 flex-shrink-0" />
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}