'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

import { useTour } from '@/hooks/use-interactive-tour';
import { tourSteps, type TourStep } from '@/components/tour/tour-steps';
import { Button } from '@/components/ui/button';

const TourTooltip = () => {
  const { step, isActive, nextStep, prevStep, finishTour } = useTour();
  const currentStep = tourSteps[step];

  useEffect(() => {
    if (isActive) {
      tourSteps.forEach((s, index) => {
        const el = document.getElementById(s.targetId);
        if (el) {
          el.style.transition = 'all 0.3s ease-in-out';
          if (index === step) {
            el.classList.add('tour-highlight');
          } else {
            el.classList.remove('tour-highlight');
          }
        }
      });

      const activeEl = document.getElementById(currentStep.targetId);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
        // Cleanup when tour ends
        tourSteps.forEach((s) => {
            const el = document.getElementById(s.targetId);
            if (el) el.classList.remove('tour-highlight');
        });
    }

    return () => { // Cleanup on unmount
        tourSteps.forEach((s) => {
            const el = document.getElementById(s.targetId);
            if (el) el.classList.remove('tour-highlight');
        });
    }
  }, [step, isActive, currentStep]);

  if (!isActive || !currentStep) {
    return null;
  }
  
  const stepElement = document.getElementById(currentStep.targetId);
  const position = stepElement ? stepElement.getBoundingClientRect() : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed z-[101] p-4 bg-background border border-primary/50 rounded-lg shadow-2xl shadow-primary/20 w-80"
      style={getTooltipPosition(position, currentStep.position)}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg text-primary">{currentStep.title}</h3>
        <button
          onClick={finishTour}
          className="p-1 rounded-full hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {currentStep.description}
      </p>
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Paso {step + 1} de {tourSteps.length}
        </span>
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="outline" size="sm" onClick={prevStep}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
          )}
          {step < tourSteps.length - 1 ? (
            <Button size="sm" onClick={nextStep}>
              Siguiente
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={finishTour}>
              Finalizar
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};


const getTooltipPosition = (rect: DOMRect | null, position: TourStep['position'] = 'bottom') => {
    if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

    const offset = 12; // 12px gap between element and tooltip
    
    switch (position) {
        case 'top':
            return {
                top: rect.top - offset,
                left: rect.left + rect.width / 2,
                transform: 'translate(-50%, -100%)',
            };
        case 'right':
            return {
                top: rect.top + rect.height / 2,
                left: rect.right + offset,
                transform: 'translate(0, -50%)',
            };
        case 'left':
            return {
                top: rect.top + rect.height / 2,
                left: rect.left - offset,
                transform: 'translate(-100%, -50%)',
            };
        case 'bottom':
        default:
             return {
                top: rect.bottom + offset,
                left: rect.left + rect.width / 2,
                transform: 'translateX(-50%)',
            };
    }
};

export default function InteractiveTour() {
  const { isActive } = useTour();

  return (
    <>
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 100;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 12px 6px hsl(var(--primary) / 0.7);
          border-radius: 8px;
        }
      `}</style>
      <AnimatePresence>
        {isActive && <TourTooltip />}
      </AnimatePresence>
    </>
  );
}
