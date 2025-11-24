
'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { generateArticleContent } from '@/app/blog/actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, LogIn, Sparkles, Wand2, Share2, Clock, Star, Heart, User, Edit } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { useAuth, useFirestore, useDocument } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { doc, setDoc, serverTimestamp, updateDoc, increment, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import type { Article, User } from '@/lib/types';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import Rating from '@/components/blog/Rating';

function ArticlePageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialTitle, setInitialTitle] = useState('');
  const [estimatedTime, setEstimatedTime] = useState(0);

  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const articleRef = useMemo(() => firestore && slug ? doc(firestore, 'articles', slug) : undefined, [firestore, slug]);
  const userRef = useMemo(() => firestore && user ? doc(firestore, 'users', user.uid) : undefined, [firestore, user]);

  const { data: article, loading: articleLoading, refetch: refetchArticle } = useDocument<Article>(articleRef);
  const { data: userData, loading: userLoading } = useDocument<User>(userRef);

  useEffect(() => {
    // Read title directly from URL query param to avoid race conditions.
    const titleFromQuery = searchParams.get('title');
    if (titleFromQuery) {
      setInitialTitle(decodeURIComponent(titleFromQuery));
    }
  }, [searchParams]);

  useEffect(() => {
    if (article?.content) {
      const words = article.content.split(/\s+/).length;
      setEstimatedTime(Math.ceil(words / 200)); // Avg reading speed 200 wpm
      if (user && userRef && article?.id) {
          updateDoc(userRef, { [`readArticles.${article.id}`]: true });
      }
    }
  }, [article, user, userRef]);

  const title = article?.title || initialTitle;
  const credits = userData?.articleGenerationCredits ?? 0;

  const handleGenerateArticle = async () => {
    if (!user || !firestore || !slug || !userRef || credits <= 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'No tienes créditos suficientes o no has iniciado sesión.' });
      return;
    }
    if (!title) {
      setError("No se pudo encontrar el título para este artículo.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const result = await generateArticleContent({ category, slug, title });
      if (!result.content || !result.authorRole) throw new Error("La IA no pudo generar el contenido completo.");
      
      const newArticleData: Omit<Article, 'id'> = { title, slug, category, content: result.content, authorRole: result.authorRole, createdAt: serverTimestamp() as Timestamp, avgRating: 0, ratingCount: 0 };
      
      await setDoc(doc(firestore, 'articles', slug), newArticleData);
      await updateDoc(userRef, { articleGenerationCredits: increment(-1) });
      toast({ title: "¡Artículo Generado!", description: "Tu crédito ha sido utilizado." });
    } catch (err: any) {
      setError('No se pudo generar el artículo. Por favor, inténtelo de nuevo más tarde.');
      toast({ variant: 'destructive', title: 'Error de Generación', description: 'No se pudo generar o guardar el contenido del artículo.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Enlace copiado", description: "Puedes compartir el enlace a este artículo." });
  };
  
  const isFavorited = useMemo(() => {
    if (!userData || !article) return false;
    return !!userData.favoriteArticles?.[article.slug];
  }, [userData, article]);

  const toggleFavorite = async () => {
    if (!userRef || !article) return;

    const newFavoriteStatus = !isFavorited;
    const favoriteKey = `favoriteArticles.${article.slug}`;

    try {
      if (newFavoriteStatus) {
        await updateDoc(userRef, { [favoriteKey]: new Date().toISOString() });
        toast({ title: "Guardado en Favoritos" });
      } else {
        const updateData: { [key: string]: any } = {};
        updateData[favoriteKey] = (await import('firebase/firestore')).deleteField();
        await updateDoc(userRef, updateData);
        toast({ title: "Eliminado de Favoritos" });
      }
    } catch (error) {
      console.error("Error updating favorite status:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el estado de favorito." });
    }
  };

  const renderContent = () => {
    const isLoading = articleLoading || authLoading || userLoading || (initialTitle === '' && !article);
    if (isLoading) {
      return (
        <div className="space-y-6 mt-8">
          <Skeleton className="h-4 w-1/4" />
          <div className="space-y-4 pt-4">
            <Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-5/6" /><Skeleton className="h-5 w-full" />
            <Skeleton className="h-20 w-full mt-4" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" />
          </div>
        </div>
      );
    }
    if (!user) {
      return (
        <Alert className="mt-8"><LogIn className="h-4 w-4" /><AlertTitle>Acceso Restringido</AlertTitle><AlertDescription>Debes iniciar sesión para ver este artículo.</AlertDescription></Alert>
      );
    }
    if (error) {
      return (
        <Alert variant="destructive" className="mt-8"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
      );
    }
    if (!article) {
       if (!title) {
        return (
          <Alert variant="destructive" className="mt-8"><AlertTitle>Error</AlertTitle><AlertDescription>No se pudo encontrar el título para este artículo.</AlertDescription></Alert>
        )
      }
      return (
        <div className="text-center border rounded-lg p-8 bg-card/50 mt-8">
          <h2 className="text-2xl font-bold text-primary">Artículo no Generado</h2>
          <p className="text-muted-foreground mt-2">Este artículo aún no ha sido creado por nuestra IA.</p>
          <div className='mt-6'>
            <Button onClick={handleGenerateArticle} disabled={isGenerating || credits <= 0}>
              {isGenerating ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              {credits > 0 ? 'Gastar 1 crédito para generar' : 'No tienes créditos'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">Te quedan {credits} créditos.</p>
          </div>
        </div>
      );
    }
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <ReactMarkdown className="prose dark:prose-invert max-w-none" rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>{article.content}</ReactMarkdown>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <Button asChild variant="ghost" className="-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
            <Link href={`/blog/${category}`}><ChevronLeft className="h-4 w-4 mr-2" />Volver a Artículos</Link>
          </Button>
        </header>
        <h1 className="text-3xl font-bold !mb-4 tracking-tight">{title}</h1>
        {article && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-4">
             {article.authorRole && (
                <div className="flex items-center gap-1.5 font-semibold text-accent"><Edit className="w-4 h-4"/> Escrito por: {article.authorRole}</div>
            )}
          </div>
        )}
        {article && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Lectura de {estimatedTime} min</div>
            <Rating article={article} refetch={refetchArticle} />
            <Button variant="ghost" size="sm" onClick={handleShare} className="flex items-center gap-1.5"><Share2 className="w-4 h-4" />Compartir</Button>
            <Button variant={isFavorited ? 'secondary': 'ghost'} size="sm" onClick={toggleFavorite} className="flex items-center gap-1.5">
                <Heart className={`w-4 h-4 ${isFavorited ? 'text-red-500 fill-current' : ''}`}/>{isFavorited ? 'Favorito' : 'Añadir a favoritos'}
            </Button>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
}

export default function ArticlePage() {
    return (
        <Suspense fallback={<div>Cargando artículo...</div>}>
            <ArticlePageContent />
        </Suspense>
    );
}
