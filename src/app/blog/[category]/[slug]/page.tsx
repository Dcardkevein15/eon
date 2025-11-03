
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { generateArticleContent } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, AlertTriangle, LogIn, Sparkles, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { useAuth, useFirestore } from '@/firebase';
import { useDocument } from '@/firebase/use-doc';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { doc, setDoc, serverTimestamp, updateDoc, increment, collection, query, where, getDocs, limit } from 'firebase/firestore';
import type { Article, User } from '@/lib/types';


export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialTitle, setInitialTitle] = useState('');

  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  

  const articleRef = useMemo(() => firestore && slug ? doc(firestore, 'articles', slug) : undefined, [firestore, slug]);
  const userRef = useMemo(() => firestore && user ? doc(firestore, 'users', user.uid) : undefined, [firestore, user]);

  const { data: article, loading: articleLoading } = useDocument<Article>(articleRef);
  const { data: userData, loading: userLoading } = useDocument<User>(userRef);

  // This effect fetches the original title if the article doesn't exist yet.
  useEffect(() => {
    if (firestore && slug && !article && !articleLoading) {
      const fetchTitle = async () => {
        const q = query(
            collection(firestore, 'suggestedArticleTitles'),
            where('slug', '==', slug),
            limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const suggestedTitleDoc = querySnapshot.docs[0];
            setInitialTitle(suggestedTitleDoc.data().title);
        } else {
            // Fallback for slugs that might not be in the suggestions
             setInitialTitle(slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        }
      };
      fetchTitle();
    }
  }, [firestore, slug, article, articleLoading]);


  const title = article?.title || initialTitle;
  const credits = userData?.articleGenerationCredits ?? 0;

  const handleGenerateArticle = async () => {
    if (!user || !firestore || !slug || !userRef || credits <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No tienes créditos suficientes o no has iniciado sesión.' });
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateArticleContent({
        category: category.replace(/-/g, ' '),
        slug,
        title,
      });
      
      if (!result.content) {
          throw new Error("La IA no pudo generar el contenido del artículo.");
      }
      
      const newArticleData = {
        title,
        slug,
        category,
        content: result.content,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(firestore, 'articles', slug), newArticleData);
      await updateDoc(userRef, {
          articleGenerationCredits: increment(-1),
      });

      toast({
        title: "¡Artículo Generado!",
        description: "Tu crédito ha sido utilizado."
      })
      // The useDocument hook will automatically update the UI with the new article.

    } catch (err: any) {
      console.error('Failed to generate or save article content:', err);
      setError('No se pudo generar el artículo. Por favor, inténtelo de nuevo más tarde.');
      toast({
        variant: 'destructive',
        title: 'Error de Generación',
        description: 'No se pudo generar o guardar el contenido del artículo.',
      });
    } finally {
      setIsGenerating(false);
    }
  };


  const renderContent = () => {
    const isLoading = articleLoading || authLoading || userLoading || (initialTitle === '' && !article);

    if (isLoading) {
       return (
          <div className="space-y-6">
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
          </div>
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
    
    if (!article) {
        return (
            <div className="text-center border rounded-lg p-8 bg-card/50">
                <h2 className="text-2xl font-bold text-primary">Artículo no Generado</h2>
                <p className="text-muted-foreground mt-2">Este artículo aún no ha sido creado por nuestra IA.</p>
                <div className='mt-6'>
                    <Button onClick={handleGenerateArticle} disabled={isGenerating || credits <= 0}>
                        {isGenerating ? (
                            <><Sparkles className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
                        ) : (
                            <><Wand2 className="mr-2 h-4 w-4" /> Gastar 1 crédito para generar</>
                        )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">Te quedan {credits} créditos.</p>
                </div>
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <ReactMarkdown
              className="prose dark:prose-invert max-w-none"
            >
              {article.content}
            </ReactMarkdown>
          </motion.div>
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
        <h1 className="text-3xl font-bold !mb-8 tracking-tight">{title}</h1>
        {renderContent()}
      </div>
    </div>
  );
}
