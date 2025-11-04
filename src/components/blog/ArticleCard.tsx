'use client';

import Link from 'next/link';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Article, SuggestedArticleTitle } from '@/lib/types';
import { Clock, FileText, Sparkles, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface ArticleCardProps {
  item: Article | SuggestedArticleTitle;
  categorySlug: string;
}

function isGenerated(item: any): item is Article {
  return 'content' in item;
}

export default function ArticleCard({ item, categorySlug }: ArticleCardProps) {
  const isGeneratedArticle = isGenerated(item);
  
  const getFormattedDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true, locale: es });
    } catch { return ''; }
  };
  
  const estimatedTime = isGeneratedArticle ? Math.ceil(item.content.split(/\s+/).length / 200) : 0;

  return (
    <Card className="flex flex-col h-full bg-card/50 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
            <Link href={`/blog/${categorySlug}/${item.slug}`}>{item.title}</Link>
            </CardTitle>
            {isGeneratedArticle ? (
                <Badge variant="secondary" className="flex-shrink-0"><FileText className="w-3 h-3 mr-1.5"/>Leído</Badge>
            ) : (
                <Badge variant="outline" className="flex-shrink-0 border-primary/50 text-primary"><Sparkles className="w-3 h-3 mr-1.5"/>Nuevo</Badge>
            )}
        </div>
        {isGeneratedArticle && (
            <CardDescription className="text-xs flex items-center gap-4 pt-2">
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3"/> {estimatedTime} min de lectura</span>
                <span className="flex items-center gap-1.5"><Star className="w-3 h-3 fill-amber-400 text-amber-500"/> {item.avgRating.toFixed(1)} ({item.ratingCount})</span>
            </CardDescription>
        )}
      </CardHeader>
      <CardFooter className="mt-auto p-4 pt-0">
        <Button asChild variant="ghost" size="sm" className="w-full justify-start text-primary p-0 h-auto">
            <Link href={`/blog/${categorySlug}/${item.slug}`}>
                {isGeneratedArticle ? 'Leer Artículo' : 'Generar Artículo'}
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
