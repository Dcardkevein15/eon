'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Pilcrow, Type } from 'lucide-react';

type TextSize = 'sm' | 'base' | 'lg';

interface TextSizeControlProps {
  size: TextSize;
  onSizeChange: (size: TextSize) => void;
}

const sizeOptions: { size: TextSize; label: string }[] = [
  { size: 'sm', label: 'S' },
  { size: 'base', label: 'M' },
  { size: 'lg', label: 'L' },
];

export default function TextSizeControl({ size, onSizeChange }: TextSizeControlProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border bg-card/50 p-0.5">
      {sizeOptions.map((option) => (
        <Button
          key={option.size}
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7 rounded-full text-xs',
            size === option.size && 'bg-primary/20 text-primary-foreground'
          )}
          onClick={() => onSizeChange(option.size)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
