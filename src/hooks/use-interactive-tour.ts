'use client';

import { useState, useEffect, useCallback } from 'react';
import { tourSteps, type TourStep } from '@/components/tour/tour-steps';

const TOUR_STORAGE_KEY = 'interactive-tour-view-count';
const MAX_AUTO_SHOW_COUNT = 7;

export function useTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    try {
        const storedCount = localStorage.getItem(TOUR_STORAGE_KEY);
        const count = storedCount ? parseInt(storedCount, 10) : 0;
        setViewCount(count);

        if (count < MAX_AUTO_SHOW_COUNT) {
            // Automatically start the tour for new users
            startTour();
        }
    } catch (error) {
        console.error("Could not access localStorage for tour:", error);
    }
  }, []);

  const incrementViewCount = useCallback(() => {
    try {
        const newCount = viewCount + 1;
        localStorage.setItem(TOUR_STORAGE_KEY, newCount.toString());
        setViewCount(newCount);
    } catch (error) {
        console.error("Could not update localStorage for tour:", error);
    }
  }, [viewCount]);

  const startTour = () => {
    setCurrentStep(0);
    setIsActive(true);
  };

  const endTour = () => {
    if(isActive) { // Only increment if the tour was actually active
      incrementViewCount();
    }
    setIsActive(false);
  };

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
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
    step: tourSteps[currentStep] as TourStep | undefined,
    isFirst: currentStep === 0,
    isLast: currentStep === tourSteps.length - 1,
    isTourActive: isActive, // Exporting an alias for clarity
  };
}
