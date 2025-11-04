'use client';

import Link from 'next/link';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Article, SuggestedArticleTitle } from '@/lib/types';
import { Clock, FileText, Sparkles, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ArticleCardProps {
  item: Article | SuggestedArticleTitle;
  categorySlug: string;
}

function isGenerated(item: any): item is Article {
  return 'content' in item;
}

export default function ArticleCard({ item, categorySlug }: ArticleCardProps) {
  const isGeneratedArticle = isGenerated(item);
  
  const estimatedTime = isGeneratedArticle ? Math.ceil(item.content.split(/\s+/).length / 200) : 0;
  const avgRating = isGeneratedArticle ? item.avgRating ?? 0 : 0;
  const ratingCount = isGeneratedArticle ? item.ratingCount ?? 0 : 0;

  return (
    <Card className="flex flex-col h-full bg-card/50 transition-all duration-300 hover:border-primary/50 hover:shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
          <Link href={`/blog/${categorySlug}/${item.slug}`}>{item.title}</Link>
        </CardTitle>
      </CardHeader>
      <CardFooter className="mt-auto p-4 pt-0 flex-col items-start gap-4">
        {/* Metadata section */}
        <div className="flex items-center gap-x-4 gap-y-2 text-xs text-muted-foreground flex-wrap">
           {isGeneratedArticle ? (
                <Badge variant="secondary" className="flex-shrink-0"><FileText className="w-3 h-3 mr-1.5"/>Leído</Badge>
            ) : (
                <Badge variant="outline" className="flex-shrink-0 border-primary/50 text-primary"><Sparkles className="w-3 h-3 mr-1.5"/>Nuevo</Badge>
            )}
           {isGeneratedArticle && (
             <>
                <span className="flex items-center gap-1.5"><Clock className="w-3 h-3"/> {estimatedTime} min</span>
                <span className="flex items-center gap-1.5"><Star className="w-3 h-3 fill-amber-400 text-amber-500"/> {avgRating.toFixed(1)} ({ratingCount})</span>
             </>
           )}
        </div>
        
        {/* Action Button */}
        <Button asChild variant="ghost" size="sm" className="w-full justify-start text-primary p-0 h-auto">
            <Link href={`/blog/${categorySlug}/${item.slug}`}>
                {isGeneratedArticle ? 'Leer Artículo' : 'Generar Artículo'}
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
