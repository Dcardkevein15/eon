'use client';

import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import TourStep from './TourStep';
import TourWelcome from './TourWelcome';
import { tourSteps, TourKey, TourStep as TourStepType } from './tour-steps';

const MAX_TOUR_VIEWS = 5;

interface TourContextType {
  startTour: (key: TourKey, force?: boolean) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: number) => void;
  isActive: boolean;
  currentStep: number;
  activeTour: TourStepType[] | null;
}

export const TourContext = createContext<TourContextType | null>(null);

interface TourProviderProps {
  children: ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [activeTourKey, setActiveTourKey] = useState<TourKey | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const activeTour = activeTourKey ? tourSteps[activeTourKey] : null;

  const getTourViewCount = (key: TourKey) => {
    if (typeof window === 'undefined') return 0;
    const count = localStorage.getItem(`tour_views_${key}`);
    return count ? parseInt(count, 10) : 0;
  };

  const incrementTourViewCount = (key: TourKey) => {
    if (typeof window === 'undefined') return;
    const currentCount = getTourViewCount(key);
    localStorage.setItem(`tour_views_${key}`, (currentCount + 1).toString());
  };

  const stopTour = useCallback(() => {
    setActiveTourKey(null);
    setCurrentStep(0);
  }, []);

  const handleWelcomeEnd = useCallback(() => {
    setShowWelcome(false);
    if (activeTourKey) {
        incrementTourViewCount(activeTourKey);
    }
  }, [activeTourKey]);

  const startTour = useCallback((key: TourKey, force = false) => {
    if (!isClient) return;

    const viewCount = getTourViewCount(key);

    if (force || viewCount < MAX_TOUR_VIEWS) {
      // For the main tour, show the welcome animation first.
      if (key === 'main' && !force) {
        setShowWelcome(true);
      }
      setActiveTourKey(key);
      setCurrentStep(0);
       if (force) { // Only increment if forced, as automatic views are handled on welcome end.
         incrementTourViewCount(key);
       }
    }
  }, [isClient]);

  const nextStep = useCallback(() => {
    if (activeTour && currentStep < activeTour.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      stopTour();
    }
  }, [currentStep, activeTour, stopTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const setStep = useCallback((step: number) => {
    if (activeTour && step >= 0 && step < activeTour.length) {
      setCurrentStep(step);
    }
  }, [activeTour]);

  const value = {
    startTour,
    stopTour,
    nextStep,
    prevStep,
    setStep,
    isActive: !!activeTourKey,
    currentStep,
    activeTour,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
      {isClient && showWelcome && <TourWelcome onComplete={handleWelcomeEnd} />}
      {isClient && !showWelcome && activeTour && (
        <TourStep
          key={`${activeTourKey}-${currentStep}`}
          step={activeTour[currentStep]}
          currentStep={currentStep}
          totalSteps={activeTour.length}
          onNext={nextStep}
          onPrev={prevStep}
          onStop={stopTour}
        />
      )}
    </TourContext.Provider>
  );
};
