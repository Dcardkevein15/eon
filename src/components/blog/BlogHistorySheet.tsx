'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Book, Heart, TrendingUp, FileText, Star, Tag, History, Sparkles } from 'lucide-react';
import type { Article, User, SuggestedArticleTitle } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface BlogHistorySheetProps {
  user: User | null;
  articles: Article[];
  userData: User | null;
}

// Helper to check if an item is a fully generated Article
function isGeneratedArticle(item: Article | SuggestedArticleTitle): item is Article {
    return 'content' in item && 'avgRating' in item;
}

const ArticleListItem = ({ article }: { article: Article | SuggestedArticleTitle }) => {
    const isGenerated = isGeneratedArticle(article);
    const avgRating = isGenerated ? article.avgRating ?? 0 : 0;
    const categoryName = ('category' in article ? article.category : '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const slug = 'slug' in article ? article.slug : '';
    const categorySlug = 'categorySlug' in article ? article.categorySlug : article.category;

    if (!slug || !categorySlug) return null; // Don't render if we can't form a valid link

    return (
        <Link href={`/blog/${categorySlug}/${slug}?title=${encodeURIComponent(article.title)}`} passHref>
            <div className="block border p-3 rounded-lg bg-card/50 hover:bg-accent/10 hover:border-primary/50 transition-colors">
                <p className="font-semibold text-sm truncate">{article.title}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1.5">
                    {isGenerated ? (
                         <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500"/>{avgRating.toFixed(1)}</span>
                    ) : (
                        <Badge variant="outline" className="flex-shrink-0 border-primary/50 text-primary text-xs"><Sparkles className="w-3 h-3 mr-1"/>Nuevo</Badge>
                    )}
                   
                    <span className="flex items-center gap-1 capitalize"><Tag className="w-3 h-3"/>{categoryName}</span>
                </div>
            </div>
        </Link>
    );
}


export default function BlogHistorySheet({ user, articles, userData }: BlogHistorySheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const favoritedArticles = useMemo(() => {
    if (!userData?.favoriteArticles || articles.length === 0) return [];
    const favoriteSlugs = Object.keys(userData.favoriteArticles);
    return articles.filter(article => favoriteSlugs.includes(article.slug));
  }, [userData, articles]);

  const readArticles = useMemo(() => {
    if (!userData?.readArticles || articles.length === 0) return [];
    const readSlugs = Object.keys(userData.readArticles);
    return articles.filter(article => readSlugs.includes(article.slug));
  }, [userData, articles]);
  
  const readArticlesCount = readArticles.length;
  const totalArticles = articles.length;
  const readPercentage = totalArticles > 0 ? Math.round((readArticlesCount / totalArticles) * 100) : 0;
  
  const topCategories = useMemo(() => {
    if (readArticles.length === 0) return [];
    const categoryCounts = readArticles.reduce((acc, article) => {
        const categoryName = article.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        acc[categoryName] = (acc[categoryName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [readArticles]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline"><Book className="mr-2 h-4 w-4" />Ver historial</Button>
      </SheetTrigger>
      <SheetContent className="w-full max-w-md p-0 flex flex-col sm:max-w-lg">
        <SheetHeader className="p-4 sm:p-6 pb-0 border-b">
          <SheetTitle className="flex items-center gap-3 text-xl">
            <Book className="w-6 h-6 text-primary" />
            Mi Actividad en el Blog
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="stats" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 mx-auto px-2 pt-2 bg-transparent">
            <TabsTrigger value="stats"><TrendingUp className="w-4 h-4 mr-2" />Estadísticas</TabsTrigger>
            <TabsTrigger value="favorites"><Heart className="w-4 h-4 mr-2" />Favoritos</TabsTrigger>
            <TabsTrigger value="history"><History className="w-4 h-4 mr-2" />Historial</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1">
            <div className="p-4 sm:p-6">
              <TabsContent value="stats" className="m-0 space-y-6">
                <Card className="bg-card/50">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold">Resumen de Actividad</CardTitle>
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
                                <li key={category} className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2 truncate">
                                      <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0"/>
                                      <span className="truncate">{category}</span>
                                    </span>
                                    <span className="font-medium text-muted-foreground text-xs bg-secondary px-2 py-0.5 rounded-full flex-shrink-0">{count} art.</span>
                                </li>
                            ))}
                          </ul>
                      ) : <p className="text-sm text-muted-foreground">Aún no has leído ningún artículo.</p>}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="favorites" className="m-0">
                  {favoritedArticles.length > 0 ? (
                    <div className="space-y-3">
                      {favoritedArticles.map(article => (
                        <ArticleListItem key={article.id} article={article} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-dashed border-2 rounded-lg">
                      <p className="text-sm text-muted-foreground">No has guardado ningún favorito.</p>
                      <p className="text-xs text-muted-foreground/80 mt-1">Haz clic en el ❤️ en un artículo para guardarlo aquí.</p>
                    </div>
                  )}
              </TabsContent>

              <TabsContent value="history" className="m-0">
                  {readArticles.length > 0 ? (
                    <div className="space-y-3">
                      {readArticles.map(article => (
                        <ArticleListItem key={article.id} article={article} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 border-dashed border-2 rounded-lg">
                      <p className="text-sm text-muted-foreground">Tu historial de lectura está vacío.</p>
                      <p className="text-xs text-muted-foreground/80 mt-1">Los artículos que leas aparecerán aquí.</p>
                    </div>
                  )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
