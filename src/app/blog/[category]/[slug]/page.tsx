'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getArticleContent } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, AlertTriangle, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  
  const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
        setIsLoading(false);
        return;
    };

    if (category && slug) {
      const fetchContent = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await getArticleContent({
            category: category.replace(/-/g, ' '),
            slug,
            title,
          });
          setContent(result.content);
        } catch (err: any) {
          console.error('Failed to get article content:', err);
          setError('No se pudo cargar el artículo. Por favor, inténtelo de nuevo más tarde.');
          toast({
            variant: 'destructive',
            title: 'Error de Carga',
            description: 'No se pudo generar o recuperar el contenido del artículo.',
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchContent();
    }
  }, [category, slug, title, toast, user, authLoading]);

  const renderContent = () => {
    if (isLoading || authLoading) {
       return (
          <article className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="space-y-4 pt-4">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-5/6" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-20 w-full mt-4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          </article>
        );
    }
    
    if (!user) {
      return (
         <Alert>
          <LogIn className="h-4 w-4" />
          <AlertTitle>Acceso Restringido</AlertTitle>
          <AlertDescription>
            Debes iniciar sesión para ver este artículo.
          </AlertDescription>
        </Alert>
      )
    }

    if (error) {
      return (
          <div className="flex flex-col items-center justify-center text-center py-20">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold">Error al cargar el contenido</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
            <Button onClick={() => router.back()} className="mt-6">
              Volver
            </Button>
          </div>
        );
    }

    return (
        <motion.article
            className="prose prose-lg dark:prose-invert max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1>{title}</h1>
            <ReactMarkdown
              components={{
                h2: ({node, ...props}) => <h2 className="text-2xl font-bold mt-8 mb-4 text-primary" {...props} />,
                p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                a: ({node, ...props}) => <a className="text-accent hover:underline" {...props} />,
              }}
            >
              {content}
            </ReactMarkdown>
          </motion.article>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <Button asChild variant="ghost" className="-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
            <Link href={`/blog/${category}`}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Volver a Artículos
            </Link>
          </Button>
        </header>
        {renderContent()}
      </div>
    </div>
  );
}
