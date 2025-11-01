'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BrainCircuit, Heart, Users, GitMerge, Sun, Moon, LogIn, Star, Book, ChevronRight, FileText, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/firebase';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useState, useEffect } from 'react';
import { getRecommendedCategory } from '@/app/actions';
import type { Article, CachedProfile } from '@/lib/types';
import RecommendationLoader from '@/components/blog/RecommendationLoader';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const categories = [
  {
    name: 'Terapia Cognitivo-Conductual',
    slug: 'terapia-cognitivo-conductual',
    description: 'Reestructura tus patrones de pensamiento y comportamiento.',
    icon: BrainCircuit,
    color: 'from-blue-400 to-blue-600',
  },
  {
    name: 'Ansiedad y Estrés',
    slug: 'ansiedad-y-estres',
    description: 'Encuentra la calma y aprende a manejar la presión.',
    icon: GitMerge,
    color: 'from-yellow-400 to-yellow-600',
  },
  {
    name: 'Mindfulness y Aceptación',
    slug: 'mindfulness-y-aceptacion',
    description: 'Vive en el presente y acepta tus pensamientos sin juicio.',
    icon: Sun,
    color: 'from-purple-400 to-purple-600',
  },
  {
    name: 'Relaciones Interpersonales',
    slug: 'relaciones-interpersonales',
    description: 'Mejora tus vínculos con los demás y contigo mismo.',
    icon: Users,
    color: 'from-green-400 to-green-600',
  },
  {
    name: 'Salud Emocional',
    slug: 'salud-emocional',
    description: 'Navega por tus emociones y construye resiliencia.',
    icon: Heart,
    color: 'from-red-400 to-red-600',
  },
  {
    name: 'Crecimiento Personal',
    slug: 'crecimiento-personal',
    description: 'Desbloquea tu potencial y define tu camino.',
    icon: Moon,
    color: 'from-indigo-400 to-indigo-600',
  },
];

export default function BlogCategoriesPage() {
  const { user, loading } = useAuth();
  const firestore = useFirestore();
  const [recommended, setRecommended] = useState<{ name: string; slug: string } | null>(null);
  const [isLoadingRec, setIsLoadingRec] = useState(true);

  // --- Data Fetching for History ---
  const articlesQuery = (firestore ? query(collection(firestore, 'articles'), orderBy('createdAt', 'desc')) : undefined);
  const { data: articles, loading: articlesLoading } = useCollection<Article>(articlesQuery);

  const getFormattedDate = (timestamp: any) => {
    if (!timestamp) return 'Fecha desconocida';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch {
      return 'Fecha inválida';
    }
  };
  
  useEffect(() => {
    if (user && !loading) {
      setIsLoadingRec(true);
      const fetchRecommendation = async () => {
        try {
          const storageKey = `psych-profile-${user.uid}`;
          const cachedItem = localStorage.getItem(storageKey);
          if (cachedItem) {
            const data: CachedProfile = JSON.parse(cachedItem);
            if (data.profile) {
              const recommendation = await getRecommendedCategory(JSON.stringify(data.profile));
              setRecommended({
                name: recommendation.categoryName,
                slug: recommendation.categorySlug,
              });
            }
          }
        } catch (error) {
          console.error("Failed to fetch recommendation:", error);
        } finally {
          setIsLoadingRec(false);
        }
      };
      fetchRecommendation();
    } else if (!loading) {
        setIsLoadingRec(false);
    }
  }, [user, loading]);

  const RecommendedCard = () => {
      if (isLoadingRec) {
          return (
             <div className="sm:col-span-2 lg:col-span-3">
                <RecommendationLoader />
             </div>
          )
      }

      if (!recommended) return null;

      return (
        <motion.div
            className="sm:col-span-2 lg:col-span-3"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
        >
            <Link href={`/blog/${recommended.slug}`} passHref>
                <div className="h-full block group relative overflow-hidden rounded-xl border-2 border-primary bg-card/80 p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                         <div className="p-3 bg-primary/10 rounded-lg">
                            <Star className="h-6 w-6 text-primary" />
                        </div>
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
      )
  }

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

            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                        <Book className="h-5 w-5" />
                        <span className="sr-only">Ver historial de artículos</span>
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col">
                    <div className="flex h-full flex-col">
                        <div className="flex items-center justify-between border-b p-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Book className="h-5 w-5" />
                                Historial de Artículos
                            </h2>
                            <SheetClose className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted">
                                <X className="h-4 w-4" />
                            </SheetClose>
                        </div>
                        <ScrollArea className="flex-1">
                            {articlesLoading ? (
                                <p className="p-6 text-muted-foreground">Cargando historial...</p>
                            ) : articles && articles.length > 0 ? (
                                <div className="p-2">
                                    {articles.map((article, index) => (
                                        <React.Fragment key={article.id}>
                                            <Link href={`/blog/${article.category}/${article.slug}`} passHref>
                                                <div className="block p-4 rounded-lg hover:bg-accent/50 cursor-pointer">
                                                    <p className="font-semibold text-foreground text-base break-words mb-2">{article.title}</p>
                                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-4">
                                                          <span className="flex items-center gap-1.5"><FileText className="w-3 h-3"/> {article.category.replace(/-/g, ' ')}</span>
                                                          <span className="flex items-center gap-1.5"><Calendar className="w-3 h-3"/> {getFormattedDate(article.createdAt)}</span>
                                                        </div>
                                                        <ChevronRight className="w-5 h-5 text-muted-foreground ml-auto flex-shrink-0"/>
                                                    </div>
                                                </div>
                                            </Link>
                                            {index < articles.length - 1 && <Separator />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            ) : (
                                <p className="p-6 text-muted-foreground text-center">No hay artículos generados todavía.</p>
                            )}
                        </ScrollArea>
                    </div>
                </SheetContent>
            </Sheet>
           </div>
          <div className="mt-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-chart-5 via-chart-1 to-chart-2">
              Explora Nuestro Conocimiento
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
              Sumérgete en artículos generados por IA, diseñados para ofrecerte claridad y herramientas prácticas en tu viaje de autoconocimiento.
            </p>
          </div>
        </header>

        { !loading && !user ? (
           <Alert className="max-w-xl mx-auto">
            <LogIn className="h-4 w-4" />
            <AlertTitle>Acceso Exclusivo</AlertTitle>
            <AlertDescription>
              Inicia sesión para explorar nuestras categorías y leer los artículos.
            </AlertDescription>
          </Alert>
        ) : (
          <motion.div
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="visible"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.1,
                },
              },
            }}
          >
            <RecommendedCard />

            {categories.map((category) => (
              <motion.div
                key={category.slug}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
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
        )}
      </div>
    </div>
  );
}
