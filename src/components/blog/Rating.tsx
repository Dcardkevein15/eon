'use client';

import { useState, useMemo } from 'react';
import { Star } from 'lucide-react';
import { useAuth } from '@/firebase';
import { rateArticle } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Article } from '@/lib/types';

interface RatingProps {
  article: Article;
  refetch: () => void;
}

export default function Rating({ article, refetch }: RatingProps) {
  const { user } = useAuth();
  const [hoverRating, setHoverRating] = useState(0);
  const { toast } = useToast();

  const handleRating = async (rating: number) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Debes iniciar sesión para valorar.' });
      return;
    }
    const result = await rateArticle(article.id, user.uid, rating);
    if (result.success) {
      toast({ title: '¡Gracias por tu valoración!' });
      refetch(); // Refreshes the document data
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar tu valoración.' });
    }
  };

  const avgRating = article.avgRating ?? 0;
  const ratingCount = article.ratingCount ?? 0;

  const stars = useMemo(() => {
    return Array(5).fill(0).map((_, i) => {
      const ratingValue = i + 1;
      const isFilled = ratingValue <= (hoverRating || Math.round(avgRating));
      return (
        <Star
          key={i}
          className={cn(
            'w-5 h-5 cursor-pointer transition-all',
            isFilled ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'
          )}
          onMouseEnter={() => setHoverRating(ratingValue)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => handleRating(ratingValue)}
        />
      );
    });
  }, [hoverRating, avgRating]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1">
            {stars}
            <span className="text-xs text-muted-foreground ml-1">({ratingCount})</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Valoración media: {avgRating.toFixed(2)} de 5</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
