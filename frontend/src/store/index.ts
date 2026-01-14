import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LifterProfile, FullProgram } from '@/types';

interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Profile
  profile: LifterProfile | null;
  setProfile: (profile: LifterProfile | null) => void;

  // Program
  currentProgram: FullProgram | null;
  setCurrentProgram: (program: FullProgram | null) => void;

  // UI State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // Reset
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),

      // Profile
      profile: null,
      setProfile: (profile) => set({ profile }),

      // Program
      currentProgram: null,
      setCurrentProgram: (currentProgram) => set({ currentProgram }),

      // UI State
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      // Reset
      reset: () => set({
        user: null,
        profile: null,
        currentProgram: null,
        isSidebarOpen: false,
      }),
    }),
    {
      name: 'ironpath-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        currentProgram: state.currentProgram,
      }),
    }
  )
);
