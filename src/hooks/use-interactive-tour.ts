'use client';

import { create } from 'zustand';
import { useEffect } from 'react';

const TOUR_STORAGE_KEY = 'interactive_tour_status';
const MAX_AUTO_SHOWS = 7;

type TourState = {
  step: number;
  isActive: boolean;
  viewCount: number;
  isCompleted: boolean;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  finishTour: () => void;
  loadState: () => void;
};

const useTourStore = create<TourState>((set, get) => ({
  step: 0,
  isActive: false,
  viewCount: 0,
  isCompleted: false,
  
  loadState: () => {
    try {
      const storedState = localStorage.getItem(TOUR_STORAGE_KEY);
      if (storedState) {
        const { viewCount, isCompleted } = JSON.parse(storedState);
        set({ 
          viewCount: typeof viewCount === 'number' ? viewCount : 0,
          isCompleted: typeof isCompleted === 'boolean' ? isCompleted : false,
        });
      }
    } catch (error) {
      console.error("Failed to load tour state from localStorage", error);
    }
  },

  startTour: () => {
    set({ isActive: true, step: 0 });
    const { viewCount, isCompleted } = get();
    // We only increment the view count when the user *starts* the tour,
    // not just when the app loads.
    const newViewCount = viewCount + 1;
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ viewCount: newViewCount, isCompleted }));
    set({ viewCount: newViewCount });
  },

  nextStep: () => set(state => ({ step: state.step + 1 })),
  
  prevStep: () => set(state => ({ step: Math.max(0, state.step - 1) })),
  
  goToStep: (step: number) => set({ step }),

  finishTour: () => {
    set({ isActive: false, isCompleted: true });
    const { viewCount } = get();
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ viewCount, isCompleted: true }));
  },
}));

// A hook to initialize and use the tour store
export const useTour = () => {
  const store = useTourStore();

  useEffect(() => {
    // Load state from localStorage once on mount
    store.loadState();
  }, []);

  useEffect(() => {
    const { viewCount, isCompleted, isActive, startTour } = store;
    // Automatically start the tour if conditions are met and it's not already active
    if (!isCompleted && viewCount < MAX_AUTO_SHOWS && !isActive) {
        // Use a small timeout to ensure the UI is ready
        const timer = setTimeout(() => {
            startTour();
        }, 1500); 
        return () => clearTimeout(timer);
    }
  }, [store.viewCount, store.isCompleted]); // Re-evaluate only when these change

  return store;
};
