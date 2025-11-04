'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, Bookmark, CheckCircle, FileText, Heart, Loader2, Star, TrendingUp } from 'lucide-react';
import type { Article, User } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
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
  const readPercentage = totalArticles > 0 ? (readArticlesCount / totalArticles) * 100 : 0;
  
  const topCategories = useMemo(() => {
    if (!userData?.readArticles || articles.length === 0) return [];
    const readSlugs = Object.keys(userData.readArticles);
    const read_articles = articles.filter(a => readSlugs.includes(a.slug));
    const categoryCounts = read_articles.reduce((acc, article) => {
        acc[article.category] = (acc[article.category] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [userData, articles]);


  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline"><Book className="mr-2 h-4 w-4" />Ver historial</Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <Book className="w-6 h-6 text-primary" />
            Mi Actividad en el Blog
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-8">
            {/* Stats Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tus Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progreso de Lectura</span>
                    <span className="font-bold">{readArticlesCount} / {totalArticles}</span>
                  </div>
                  <Progress value={readPercentage} />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-accent"/>Tus Categorías Favoritas</h4>
                  {topCategories.length > 0 ? (
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {topCategories.map(([category, count]) => (
                            <li key={category} className="flex justify-between">
                                <span className="capitalize">{category.replace(/-/g, ' ')}</span>
                                <span>{count} artículos</span>
                            </li>
                        ))}
                      </ul>
                  ) : <p className="text-sm text-muted-foreground">Aún no has leído ningún artículo.</p>}
                </div>
              </CardContent>
            </Card>

            {/* Favorites Section */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-red-500"/>
                Artículos Favoritos
              </h3>
              {favoritedArticles.length > 0 ? (
                <div className="space-y-3">
                  {favoritedArticles.map(article => (
                    <Link key={article.id} href={`/blog/${article.category}/${article.slug}`} passHref>
                        <div className="block border p-3 rounded-lg hover:bg-accent/10">
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
                <p className="text-sm text-muted-foreground text-center py-4">No has guardado ningún artículo como favorito todavía.</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
