'use client';

import { useState } from 'react';
import type { TorahCodeAnalysis } from '@/lib/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TorahCodeMatrixProps {
  result: TorahCodeAnalysis;
}

export default function TorahCodeMatrix({ result }: TorahCodeMatrixProps) {
  const { matrix, startIndex, skip, foundTerm } = result;

  // Create a set of indices for the main found term for quick lookup
  const mainTermIndices = new Set();
  const wordLength = foundTerm.length;
  const matrixSize = 21;
  const center = Math.floor(matrixSize / 2);
  const centerOfWordIndex = startIndex + Math.floor(wordLength / 2) * skip;
  const matrixStartIndex = centerOfWordIndex - (center * matrixSize) - center;
  
  for (let i = 0; i < wordLength; i++) {
      const globalIndex = startIndex + i * skip;
      const relativeIndex = globalIndex - matrixStartIndex;
      const row = Math.floor(relativeIndex / matrixSize);
      const col = relativeIndex % matrixSize;
      if(row >=0 && row < matrixSize && col >=0 && col < matrixSize) {
         mainTermIndices.add(`${row}-${col}`);
      }
  }


  return (
    <TooltipProvider>
      <div
        className="font-code grid bg-card/50 p-2 rounded-lg border border-border/50"
        style={{
          gridTemplateColumns: `repeat(${matrix.length}, minmax(0, 1fr))`,
          fontFamily: "'Courier New', Courier, monospace",
          direction: 'ltr',
        }}
      >
        {matrix.map((row, rowIndex) =>
          row.map((char, colIndex) => {
            const isMainTerm = mainTermIndices.has(`${rowIndex}-${colIndex}`);
            
            return (
              <Tooltip key={`${rowIndex}-${colIndex}`}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: (rowIndex * matrix.length + colIndex) * 0.01 }}
                    className={cn(
                      'flex items-center justify-center aspect-square text-sm md:text-base transition-all duration-300',
                      isMainTerm
                        ? 'bg-primary/80 text-primary-foreground rounded-sm scale-110 shadow-lg'
                        : 'text-muted-foreground hover:bg-accent/20 hover:text-accent-foreground'
                    )}
                  >
                    {char}
                  </motion.div>
                </TooltipTrigger>
                {isMainTerm && (
                  <TooltipContent>
                    <p>Palabra Clave: {foundTerm}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })
        )}
      </div>
    </TooltipProvider>
  );
}
