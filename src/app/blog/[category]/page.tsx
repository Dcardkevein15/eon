'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { generateArticleTitles } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, LogIn, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useCollection, useFirestore } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ArticleCard from '@/components/blog/ArticleCard';
import FilterTabs from '@/components/blog/FilterTabs';
import type { Article, SuggestedArticleTitle, User } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';

function slugify(text: string) {
  return text.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
}

type FilterValue = 'all' | 'generated' | 'new';

function ArticleListPageContent() {
  const params = useParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const firestore = useFirestore();
  const initialFetchDone = useRef(false);

  const [filter, setFilter] = useState<FilterValue>('all');
  const [titles, setTitles] = useState<SuggestedArticleTitle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const categorySlug = Array.isArray(params.category) ? params.category[0] : params.category;
  const formattedCategory = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const articlesQuery = useMemo(() => firestore ? query(collection(firestore, 'articles'), where('category', '==', categorySlug)) : undefined, [firestore, categorySlug]);
  const { data: generatedArticles, loading: articlesLoading } = useCollection<Article>(articlesQuery);

  const fetchTitles = useCallback(async (forceRefresh: boolean = false) => {
    const setLoadingState = forceRefresh ? setIsRefreshing : setIsLoading;
    setLoadingState(true);
    try {
        const result = await generateArticleTitles({ category: formattedCategory });
        const suggestedWithSlugs = result.titles.map(title => ({
            title,
            category: formattedCategory,
            categorySlug: categorySlug,
            slug: slugify(title),
            createdAt: new Date().toISOString()
        }));
        setTitles(suggestedWithSlugs);
    } catch (error) {
      console.error('Failed to generate article titles:', error);
      toast({ variant: 'destructive', title: 'Error al cargar artículos', description: 'No se pudieron generar los títulos.' });
    } finally {
      setLoadingState(false);
    }
  }, [formattedCategory, categorySlug, toast]);

  useEffect(() => {
    if (!authLoading && !initialFetchDone.current) {
        initialFetchDone.current = true;
        fetchTitles();
    }
  }, [authLoading, fetchTitles]);

  const filteredItems = useMemo(() => {
    const generatedSlugs = new Set(generatedArticles?.map(a => a.slug));
    
    switch (filter) {
      case 'generated':
        return generatedArticles || [];
      case 'new':
        return titles.filter(t => !generatedSlugs.has(t.slug));
      case 'all':
      default:
        const combined = [...(generatedArticles || [])];
        const newTitles = titles.filter(t => !generatedSlugs.has(t.slug));
        return [...combined, ...newTitles];
    }
  }, [filter, generatedArticles, titles]);
  
  const renderContent = () => {
    if (isLoading || articlesLoading) {
      return Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-40 w-full" />);
    }
    if (!user) {
      return (
        <Alert className="col-span-full">
          <LogIn className="h-4 w-4" />
          <AlertTitle>Acceso Restringido</AlertTitle>
          <AlertDescription>Debes iniciar sesión para ver los artículos de esta categoría.</AlertDescription>
        </Alert>
      );
    }
    if (filteredItems.length === 0 && !isLoading) {
      return (
        <div className="text-center py-8 col-span-full">
          <p className="text-muted-foreground">No se encontraron artículos para esta categoría.</p>
          <Button onClick={() => fetchTitles(true)} disabled={isRefreshing} className="mt-4">
            {isRefreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Intentar Generar de Nuevo
          </Button>
        </div>
      );
    }
    return filteredItems.map((item) => (
      <motion.div key={item.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <ArticleCard item={item} categorySlug={categorySlug} />
      </motion.div>
    ));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <Button asChild variant="ghost" className="-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
              <Link href="/blog"><ChevronLeft className="h-4 w-4 mr-2" />Volver a Categorías</Link>
            </Button>
            {user && (
              <Button onClick={() => fetchTitles(true)} variant="outline" size="sm" disabled={isRefreshing || isLoading}>
                {isRefreshing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Nuevos Títulos
              </Button>
            )}
          </div>
          <div className="mt-4">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary">{formattedCategory}</h1>
            <p className="text-muted-foreground mt-2">{user ? 'Artículos generados por IA. Elige uno para leerlo o genera uno nuevo.' : 'Inicia sesión para explorar nuestros artículos.'}</p>
          </div>
        </header>

        {user && <FilterTabs filter={filter} setFilter={setFilter} />}

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default function ArticleListPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <ArticleListPageContent />
        </Suspense>
    );
}
