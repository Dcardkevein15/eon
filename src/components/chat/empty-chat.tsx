'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSuggestedPrompts } from '@/app/actions';
import { NimbusChatLogo } from '@/components/logo';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface EmptyChatProps {
  createChat: (input: string) => void;
}

export default function EmptyChat({ createChat }: EmptyChatProps) {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        <NimbusChatLogo className="w-20 h-20 mx-auto text-primary" />
        <h1 className="text-4xl font-bold mt-4">Bienvenido a NimbusChat</h1>
        <p className="text-muted-foreground mt-2">
          Tu amigable asistente de IA. Inicia una conversación o prueba una de las siguientes sugerencias.
        </p>
        
        <Card className="mt-8 text-left">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              <span>Para empezar</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-4/5" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {prompts.slice(0, 4).map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="justify-between h-auto py-3"
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
