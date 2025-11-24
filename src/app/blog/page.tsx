
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, Heart, Users, GitMerge, Sun, Moon, LogIn, Star, Book, ChevronLeft, Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useFirestore, useCollection, useDocument } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getRecommendedCategory } from '@/app/blog/actions';
import type { Article, CachedProfile, User, SuggestedArticleTitle } from '@/lib/types';
import RecommendationLoader from '@/components/blog/RecommendationLoader';
import BlogHistorySheet from '@/components/blog/BlogHistorySheet';
import { doc, collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import SearchBar from '@/components/blog/SearchBar';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

const categories = [
  { name: 'Terapia Cognitivo-Conductual', slug: 'terapia-cognitivo-conductual', description: 'Reestructura tus patrones de pensamiento.', icon: BrainCircuit, color: 'from-blue-400 to-blue-600' },
  { name: 'Ansiedad y Estrés', slug: 'ansiedad-y-estres', description: 'Encuentra la calma y aprende a manejar la presión.', icon: GitMerge, color: 'from-yellow-400 to-yellow-600' },
  { name: 'Mindfulness y Aceptación', slug: 'mindfulness-y-aceptacion', description: 'Vive en el presente y acepta tus pensamientos.', icon: Sun, color: 'from-purple-400 to-purple-600' },
  { name: 'Relaciones Interpersonales', slug: 'relaciones-interpersonales', description: 'Mejora tus vínculos con los demás.', icon: Users, color: 'from-green-400 to-green-600' },
  { name: 'Salud Emocional', slug: 'salud-emocional', description: 'Navega por tus emociones y construye resiliencia.', icon: Heart, color: 'from-red-400 to-red-600' },
  { name: 'Crecimiento Personal', slug: 'crecimiento-personal', description: 'Desbloquea tu potencial y define tu camino.', icon: Moon, color: 'from-indigo-400 to-indigo-600' },
];

type CachedRecommendation = {
    name: string;
    slug: string;
    profileTimestamp: number;
}

export default function BlogCategoriesPage() {
  const { user, loading } = useAuth();
  const firestore = useFirestore();
  const [recommended, setRecommended] = useState<{ name: string; slug: string } | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const initialFetchDone = React.useRef(false);

  const userDocRef = useMemo(() => user ? doc(firestore, 'users', user.uid) : undefined, [user, firestore]);
  const { data: userData } = useDocument<User>(userDocRef);

  const articlesQuery = useMemo(() => (firestore ? query(collection(firestore, 'articles')) : undefined), [firestore]);
  const { data: articles, loading: articlesLoading } = useCollection<Article>(articlesQuery);

  const suggestedTitlesQuery = useMemo(() => (firestore ? query(collection(firestore, 'suggestedArticleTitles')) : undefined), [firestore]);
  const { data: suggestedTitles, loading: titlesLoading } = useCollection<SuggestedArticleTitle>(suggestedTitlesQuery);

  const fetchRecommendation = useCallback(async () => {
    if (!user) {
      setIsLoadingRec(false);
      return;
    }
    try {
      const profileKey = `psych-profile-${user.uid}`;
      const recommendationKey = `blog-recommendation-${user.uid}`;
      
      const cachedProfileItem = localStorage.getItem(profileKey);
      const cachedRecItem = localStorage.getItem(recommendationKey);

      if (!cachedProfileItem) {
        setIsLoadingRec(false);
        return;
      }

      const profileData: CachedProfile = JSON.parse(cachedProfileItem);
      const currentProfileTimestamp = profileData.lastMessageTimestamp;

      if (cachedRecItem) {
        const recData: CachedRecommendation = JSON.parse(cachedRecItem);
        if (recData.profileTimestamp === currentProfileTimestamp) {
          setRecommended({ name: recData.name, slug: recData.slug });
          setIsLoadingRec(false);
          return;
        }
      }
      
      const recommendation = await getRecommendedCategory(JSON.stringify(profileData.profile));
      const newRecData: CachedRecommendation = { name: recommendation.categoryName, slug: recommendation.categorySlug, profileTimestamp: currentProfileTimestamp };

      setRecommended(newRecData);
      localStorage.setItem(recommendationKey, JSON.stringify(newRecData));
    } catch (error) {
      console.error("Failed to fetch recommendation:", error);
    } finally {
      setIsLoadingRec(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchRecommendation();
    }
  }, [user, loading, fetchRecommendation]);

  const allArticles = useMemo(() => [...(articles || []), ...(suggestedTitles || [])], [articles, suggestedTitles]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-12">
           <div className="flex justify-between items-start">
             <Button asChild variant="ghost" className="-ml-4 text-muted-foreground hover:bg-accent/10 hover:text-foreground">
                <Link href="/">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Volver al Inicio
                </Link>
             </Button>

            <BlogHistorySheet 
              user={user} 
              articles={articles || []}
              userData={userData}
            />
           </div>
          <div className="mt-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
              Explora Nuestro Conocimiento
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Sumérgete en artículos generados por IA, diseñados para ofrecerte claridad y herramientas prácticas en tu viaje de autoconocimiento.
            </p>
          </div>
          <div className="max-w-xl mx-auto mt-8">
             <SearchBar allArticles={allArticles} isLoading={articlesLoading || titlesLoading} />
          </div>
        </header>

        { !loading && !user ? (
           <Alert className="max-w-xl mx-auto">
            <LogIn className="h-4 w-4" />
            <AlertTitle>Acceso Exclusivo</AlertTitle>
            <AlertDescription>Inicia sesión para explorar nuestras categorías y leer los artículos.</AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mb-12">
              {isLoadingRec ? (
                <RecommendationLoader />
              ) : recommended ? (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
                  <Link href={`/blog/${recommended.slug}`} passHref>
                    <div className="h-full block group relative overflow-hidden rounded-xl border-2 border-primary bg-card/80 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20">
                      <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 bg-primary/10 rounded-lg"><Star className="h-6 w-6 text-primary" /></div>
                          <div>
                            <h2 className="text-xl font-bold text-primary">Recomendado para Ti: {recommended.name}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Basado en tu perfil, este tema podría ser especialmente útil para ti ahora.</p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs font-semibold text-primary/90 transition-colors group-hover:text-primary">
                          <span>Explorar Artículos Recomendados</span>
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ) : null}
            </div>

            <motion.div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
              {categories.map((category) => (
                <motion.div key={category.slug} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                  <Link href={`/blog/${category.slug}`} passHref>
                    <div className="h-full block group relative overflow-hidden rounded-xl border border-border bg-card/50 p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10">
                      <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:opacity-20 group-hover:scale-125 transition-all duration-500">
                        <category.icon className="w-32 h-32" />
                      </div>
                      <div className="relative z-10">
                        <div className={`mb-4 inline-block rounded-lg bg-gradient-to-br ${category.color} p-3`}>
                          <category.icon className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">{category.name}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
                        <div className="mt-4 flex items-center text-xs font-semibold text-primary/80 transition-colors group-hover:text-primary">
                          <span>Explorar Categoría</span>
                          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
