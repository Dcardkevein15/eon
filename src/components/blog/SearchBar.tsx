'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { searchArticles } from '@/app/actions';
import { Loader2, Newspaper } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Article, SuggestedArticleTitle } from '@/lib/types';

interface SearchBarProps {
    allArticles: (Article | SuggestedArticleTitle)[];
    isLoading: boolean;
}

function isGenerated(item: any): item is Article {
  return 'content' in item;
}

export default function SearchBar({ allArticles, isLoading }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<(Article | SuggestedArticleTitle)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = useCallback((term: string) => {
    if (!term.trim()) {
        setResults([]);
        return;
    }
    setIsSearching(true);
    const lowerCaseTerm = term.toLowerCase();
    const filtered = allArticles.filter(item => 
        item.title.toLowerCase().includes(lowerCaseTerm) || 
        (isGenerated(item) && item.content.toLowerCase().includes(lowerCaseTerm))
    );
    setResults(filtered.slice(0, 10)); // Limit to 10 results
    setIsSearching(false);
  }, [allArticles]);
  
  useEffect(() => {
    const debounce = setTimeout(() => {
        handleSearch(searchTerm);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, handleSearch]);

  const onSelectResult = (item: Article | SuggestedArticleTitle) => {
    setSearchTerm('');
    setResults([]);
    router.push(`/blog/${item.categorySlug || item.category}/${item.slug}`);
  };

  return (
    <Command className="rounded-lg border shadow-md relative overflow-visible">
      <CommandInput 
        placeholder="Buscar en el blog..."
        value={searchTerm}
        onValueChange={setSearchTerm}
      />
      {searchTerm.length > 0 && (
        <CommandList className="absolute top-full mt-2 w-full bg-background rounded-lg border shadow-lg z-50">
          {isLoading || isSearching ? (
            <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando...
            </div>
          ) : results.length > 0 ? (
            <CommandGroup heading="Resultados">
              {results.map((item) => (
                <CommandItem key={item.slug} onSelect={() => onSelectResult(item)} value={item.title}>
                  <Newspaper className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
          )}
        </CommandList>
      )}
    </Command>
  );
}
