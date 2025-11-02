'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { generateArticleTitles } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ArrowRight, FileText, LogIn, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

export default function ArticleListPage() {
  const params = useParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [titles, setTitles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const formattedCategory = category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  useEffect(() => {
    // Define the data fetching logic inside the useEffect hook
    const fetchInitialTitles = async () => {
      if (!user || !category || authLoading) return;

      setIsLoading(true);
      try {
        const result = await generateArticleTitles({ category: formattedCategory });
        setTitles(result.titles);
      } catch (error) {
        console.error('Failed to generate article titles:', error);
        toast({
          variant: 'destructive',
          title: 'Error al cargar artículos',
          description: 'No se pudieron generar los títulos de los artículos. Por favor, intenta de nuevo.',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    // We only want this to run once when the user and category are available.
    if (!authLoading && user) {
        fetchInitialTitles();
    } else if (!authLoading && !user) {
        setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, category]);


  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await generateArticleTitles({ category: formattedCategory });
      setTitles(result.titles);
      toast({
          title: '¡Nuevos títulos cargados!',
      });
    } catch (error) {
       console.error('Failed to generate article titles:', error);
      toast({
        variant: 'destructive',
        title: 'Error al cargar artículos',
        description: 'No se pudieron generar los títulos de los artículos. Por favor, intenta de nuevo.',
      });
    } finally {
        setIsRefreshing(false);
    }
  };


  const renderContent = () => {
     if (isLoading) {
      return (
        Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
        ))
      )
    }

    if (!user) {
      return (
        <Alert>
          <LogIn className="h-4 w-4" />
          <AlertTitle>Acceso Restringido</AlertTitle>
          <AlertDescription>
            Debes iniciar sesión para ver los artículos de esta categoría.
          </AlertDescription>
        </Alert>
      )
    }
    
    if (titles.length === 0 && !isLoading) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">No se encontraron artículos para esta categoría.</p>
                 <Button onClick={handleManualRefresh} disabled={isRefreshing} className="mt-4">
                    {isRefreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Intentar Generar de Nuevo
                </Button>
            </div>
        )
    }

    return (
        titles.map((title) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Link href={`/blog/${category}/${slugify(title)}`} passHref>
                  <Card className="group cursor-pointer bg-card/50 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                          {title}
                        </CardTitle>
                        <CardDescription className="mt-2 flex items-center text-xs">
                          <FileText className="mr-2 h-4 w-4"/>
                          Leer artículo
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                    </CardHeader>
                  </Card>
                </Link>
              </motion.div>
        ))
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-12">
            <div className="flex justify-between items-center">
                <Button asChild variant="ghost" className="-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
                    <Link href="/blog">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Volver a Categorías
                    </Link>
                </Button>
                {user && (
                    <Button onClick={handleManualRefresh} variant="outline" size="sm" disabled={isRefreshing || isLoading}>
                        {isRefreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Nuevos Títulos
                    </Button>
                )}
            </div>
          <div className="mt-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">
              {formattedCategory}
            </h1>
            <p className="text-muted-foreground mt-2">
              { user ? 'Artículos generados por IA para profundizar en este tema. Elige uno para leerlo.' : 'Inicia sesión para explorar nuestros artículos.'}
            </p>
          </div>
        </header>

        <div className="space-y-6">
            {renderContent()}
        </div>
      </div>
    </div>
  );
}
