import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TutorialState {
  isTutorialModeEnabled: boolean;
  toggleTutorialMode: () => void;
  setTutorialMode: (enabled: boolean) => void;
  
  // Triggers for specific tours
  pendingTour: 'nav' | 'dashboard' | null;
  triggerTour: (tour: 'nav' | 'dashboard') => void;
  consumeTour: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      isTutorialModeEnabled: true, // Default to true
      toggleTutorialMode: () => set((state) => ({ isTutorialModeEnabled: !state.isTutorialModeEnabled })),
      setTutorialMode: (enabled) => set({ isTutorialModeEnabled: enabled }),
      
      pendingTour: null,
      triggerTour: (tour) => set({ pendingTour: tour }),
      consumeTour: () => set({ pendingTour: null }),
    }),
    {
      name: 'tutorial-storage',
    }
  )
);
