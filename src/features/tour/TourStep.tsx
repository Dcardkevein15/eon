'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { usePopper } from 'react-popper';
import { Button } from '@/components/ui/button';
import { TourStep as TourStepType } from './tour-steps';

interface TourStepProps {
  step: TourStepType;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
}

const TourStep: React.FC<TourStepProps> = ({ step, currentStep, totalSteps, onNext, onPrev, onStop }) => {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const popperRef = useRef<HTMLDivElement>(null);
  const [arrowRef, setArrowRef] = useState<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Use useLayoutEffect to find the element and avoid flicker
  useLayoutEffect(() => {
    let element: HTMLElement | null = null;
    const interval = setInterval(() => {
      element = document.querySelector(step.selector);
      if (element) {
        setTargetElement(element);
        clearInterval(interval);
      }
    }, 100); // Check every 100ms

    return () => clearInterval(interval);
  }, [step.selector]);

  const { styles, attributes, update } = usePopper(targetElement, popperRef.current, {
    placement: step.placement || 'bottom',
    modifiers: [
      { name: 'offset', options: { offset: [0, 12] } },
      { name: 'arrow', options: { element: arrowRef } },
      { name: 'preventOverflow', options: { padding: 16 } },
      { name: 'flip', options: { padding: 16 } },
    ],
  });
  
  // Effect to handle dynamic content and visibility
  useEffect(() => {
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      const timer = setTimeout(() => {
        setIsVisible(true);
        if (update) update();
      }, 300); // Delay to allow for scrolling

      return () => clearTimeout(timer);
    }
  }, [targetElement, update]);


  return (
    <AnimatePresence>
      {targetElement && isVisible && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={onStop}
          />

          {/* Highlight */}
          <motion.div
            initial={{
              x: targetElement.getBoundingClientRect().left,
              y: targetElement.getBoundingClientRect().top,
              width: targetElement.getBoundingClientRect().width,
              height: targetElement.getBoundingClientRect().height,
            }}
            animate={{
              x: targetElement.getBoundingClientRect().left,
              y: targetElement.getBoundingClientRect().top,
              width: targetElement.getBoundingClientRect().width,
              height: targetElement.getBoundingClientRect().height,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 left-0 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] z-[101]"
            style={{
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 15px rgba(255, 255, 255, 0.5)',
              pointerEvents: 'none',
            }}
          />

          {/* Popper Content */}
          <div ref={popperRef} style={styles.popper} {...attributes.popper} className="z-[102]">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="w-80 rounded-lg border bg-background shadow-2xl"
            >
              <div className="p-4">
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{step.content}</p>
              </div>
              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-xs text-muted-foreground">
                  {currentStep + 1} / {totalSteps}
                </span>
                <div className="flex items-center gap-2">
                   {currentStep > 0 && (
                    <Button variant="ghost" size="sm" onClick={onPrev}>
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Anterior
                    </Button>
                   )}
                  <Button size="sm" onClick={onNext}>
                    {currentStep === totalSteps - 1 ? 'Finalizar' : 'Siguiente'}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 text-muted-foreground"
                onClick={onStop}
              >
                <X className="h-4 w-4" />
              </Button>
               <div ref={setArrowRef} style={styles.arrow} {...attributes.arrow} className="popper-arrow" />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TourStep;
