'use client';

import { useState, useEffect, useCallback } from 'react';
import { tourSteps, type TourStep } from '@/components/tour/tour-steps';

const MAX_AUTO_SHOW_COUNT = 7;

export function useTour(tourKey: keyof typeof tourSteps = 'main') {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  
  const TOUR_STORAGE_KEY = `interactive-tour-view-count-${tourKey}`;
  const steps = tourSteps[tourKey] || [];

  useEffect(() => {
    // Only run this on the client
    if (typeof window === 'undefined') return;

    try {
      const storedCount = localStorage.getItem(TOUR_STORAGE_KEY);
      const count = storedCount ? parseInt(storedCount, 10) : 0;
      setViewCount(count);

      if (count < MAX_AUTO_SHOW_COUNT) {
        // Automatically start the tour for new users of this section
        startTour();
      }
    } catch (error) {
      console.error("Could not access localStorage for tour:", error);
    }
  }, [tourKey]); // Re-run when the tourKey changes

  const incrementViewCount = useCallback(() => {
    try {
      const newCount = viewCount + 1;
      localStorage.setItem(TOUR_STORAGE_KEY, newCount.toString());
      setViewCount(newCount);
    } catch (error) {
      console.error("Could not update localStorage for tour:", error);
    }
  }, [viewCount, TOUR_STORAGE_KEY]);

  const startTour = () => {
    if (steps.length > 0) {
      setCurrentStep(0);
      setIsActive(true);
    }
  };

  const endTour = () => {
    if(isActive) { // Only increment if the tour was actually active
      incrementViewCount();
    }
    setIsActive(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      endTour();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return {
    isActive,
    startTour,
    endTour,
    nextStep,
    prevStep,
    currentStep,
    step: steps[currentStep] as TourStep | undefined,
    isFirst: currentStep === 0,
    isLast: currentStep === steps.length - 1,
    isTourActive: isActive, // Exporting an alias for clarity
  };
}
