'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Book, Heart, TrendingUp, FileText, Star, Tag } from 'lucide-react';
import type { Article, User } from '@/lib/types';
import { Progress } from '@/components/ui/progress';

interface BlogHistorySheetProps {
  user: User | null;
  articles: Article[];
  userData: User | null;
}

export default function BlogHistorySheet({ user, articles, userData }: BlogHistorySheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const favoritedArticles = useMemo(() => {
    if (!userData?.favoriteArticles || articles.length === 0) return [];
    const favoriteSlugs = Object.keys(userData.favoriteArticles);
    return articles.filter(article => favoriteSlugs.includes(article.slug));
  }, [userData, articles]);

  const readArticlesCount = useMemo(() => userData?.readArticles ? Object.keys(userData.readArticles).length : 0, [userData]);
  const totalArticles = articles.length;
  const readPercentage = totalArticles > 0 ? Math.round((readArticlesCount / totalArticles) * 100) : 0;
  
  const topCategories = useMemo(() => {
    if (!userData?.readArticles || articles.length === 0) return [];
    const readSlugs = Object.keys(userData.readArticles);
    const read_articles = articles.filter(a => readSlugs.includes(a.slug));
    const categoryCounts = read_articles.reduce((acc, article) => {
        const categoryName = article.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        acc[categoryName] = (acc[categoryName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [userData, articles]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline"><Book className="mr-2 h-4 w-4" />Ver historial</Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <Book className="w-6 h-6 text-primary" />
            Mi Actividad en el Blog
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Stats Dashboard */}
            <Card className="bg-card/50">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-muted-foreground">Progreso de Lectura</span>
                    <span className="font-bold">{readArticlesCount} / {totalArticles}</span>
                  </div>
                  <Progress value={readPercentage} aria-label={`${readPercentage}% de artículos leídos`} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-muted-foreground"><TrendingUp className="w-4 h-4 text-accent"/>Tus Categorías Principales</h4>
                  {topCategories.length > 0 ? (
                      <ul className="space-y-2 text-sm text-foreground">
                        {topCategories.map(([category, count]) => (
                            <li key={category} className="flex items-center justify-between capitalize">
                                <span className="flex items-center gap-2">
                                  <Tag className="w-3.5 h-3.5 text-muted-foreground"/>
                                  {category}
                                </span>
                                <span className="font-medium text-muted-foreground text-xs bg-secondary px-2 py-0.5 rounded-full">{count} art.</span>
                            </li>
                        ))}
                      </ul>
                  ) : <p className="text-sm text-muted-foreground">Aún no has leído ningún artículo.</p>}
                </div>
              </CardContent>
            </Card>

            {/* Favorites Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 px-1">
                <Heart className="w-5 h-5 text-red-500 fill-red-500/20"/>
                Artículos Favoritos
              </h3>
              {favoritedArticles.length > 0 ? (
                <div className="space-y-3">
                  {favoritedArticles.map(article => (
                    <Link key={article.id} href={`/blog/${article.category}/${article.slug}?title=${encodeURIComponent(article.title)}`} passHref>
                        <div className="block border p-3 rounded-lg bg-card/50 hover:bg-accent/10 hover:border-primary/50 transition-colors">
                            <p className="font-semibold text-sm truncate">{article.title}</p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500"/>{article.avgRating.toFixed(1)}</span>
                                <span className="flex items-center gap-1 capitalize"><FileText className="w-3 h-3"/>{article.category.replace(/-/g, ' ')}</span>
                            </div>
                        </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-dashed border-2 rounded-lg">
                  <p className="text-sm text-muted-foreground">No has guardado ningún favorito.</p>
                  <p className="text-xs text-muted-foreground/80 mt-1">Haz clic en el ❤️ en un artículo para guardarlo aquí.</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
