import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TutorialState {
  isTutorialModeEnabled: boolean;
  toggleTutorialMode: () => void;
  setTutorialMode: (enabled: boolean) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      isTutorialModeEnabled: true, // Default to true
      toggleTutorialMode: () => set((state) => ({ isTutorialModeEnabled: !state.isTutorialModeEnabled })),
      setTutorialMode: (enabled) => set({ isTutorialModeEnabled: enabled }),
    }),
    {
      name: 'tutorial-storage',
    }
  )
);
