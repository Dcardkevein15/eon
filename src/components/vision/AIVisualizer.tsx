'use client';

import { Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AIVisualizer = ({ state }: { state: 'listening' | 'thinking' | 'speaking' }) => {
  return (
    <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
      <AnimatePresence>
        <motion.div
          key={state}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5 }}
          className="absolute"
        >
          {state === 'listening' && (
            <motion.div
              className="w-full h-full rounded-full bg-primary/10"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {state === 'speaking' && (
            <motion.div
              className="w-full h-full rounded-full border-2 border-accent"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {state === 'thinking' && (
             <Brain className="w-24 h-24 text-primary animate-pulse" />
          )}
        </motion.div>
      </AnimatePresence>
       <div className="absolute rounded-full w-full h-full border border-border/50" />
    </div>
  );
};

export default AIVisualizer;
