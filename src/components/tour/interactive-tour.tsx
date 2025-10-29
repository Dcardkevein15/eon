'use client';

import { useEffect, useState } from 'react';
import { useTour } from '@/hooks/use-interactive-tour';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function InteractiveTour() {
  const {
    isActive,
    currentStep,
    step,
    isFirst,
    isLast,
    nextStep,
    prevStep,
    endTour,
  } = useTour();
  
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isActive && step?.selector) {
      const targetElement = document.querySelector(step.selector);
      if (targetElement) {
        setTargetRect(targetElement.getBoundingClientRect());
      } else {
        // If element not found, maybe move to next step or end tour
        console.warn(`Tour step selector not found: ${step.selector}`);
        // Optionally, end tour if an element is crucial
        // endTour(); 
      }
    }
  }, [isActive, currentStep, step]);

  if (!isActive || !step || !targetRect) {
    return null;
  }
  
  // Calculate position of the popup
  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    top: targetRect.bottom + 10,
    left: targetRect.left,
    width: 320, // fixed width
    transform: 'translateX(0)', // Default transform
  };

  // Adjust position if it goes off-screen
  if (popupStyle.left && (popupStyle.left as number) + 320 > window.innerWidth) {
    popupStyle.left = window.innerWidth - 330; // Adjust to stay in viewport
  }
   if (popupStyle.left && (popupStyle.left as number) < 10) {
    popupStyle.left = 10;
  }
  if (popupStyle.top && (popupStyle.top as number) + 200 > window.innerHeight) {
     popupStyle.top = targetRect.top - 200 - 10;
  }

  return (
    <>
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[100]"
        onClick={endTour}
      />
      {/* Highlighted Element */}
      <motion.div
        initial={{
          x: targetRect.x,
          y: targetRect.y,
          width: targetRect.width,
          height: targetRect.height,
        }}
        animate={{
          x: targetRect.x,
          y: targetRect.y,
          width: targetRect.width,
          height: targetRect.height,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6), 0 0 15px rgba(255,255,255,0.5)',
        }}
        className="fixed rounded-md pointer-events-none z-[101]"
      />
      
      {/* Popup Content */}
      <AnimatePresence>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          style={popupStyle}
          className="z-[102]"
        >
          <Card>
            <CardHeader>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{step.content}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Paso {currentStep + 1} de 5
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={endTour}>Terminar</Button>
                <div className='flex gap-1'>
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={prevStep}
                        disabled={isFirst}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button size="icon" onClick={isLast ? endTour : nextStep}>
                       {isLast ? <X className="h-4 w-4"/> : <ArrowRight className="h-4 w-4" />}
                    </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
