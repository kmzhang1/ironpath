import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LifterProfile, FullProgram, ProgressHistory, SessionProgress, ExerciseLog } from '@/types';

interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Profile
  profile: LifterProfile | null;
  setProfile: (profile: LifterProfile | null) => void;
  updateOneRepMax: (lift: 'squat' | 'bench' | 'deadlift', value: number) => void;

  // Program
  currentProgram: FullProgram | null;
  setCurrentProgram: (program: FullProgram | null) => void;
  updateExercise: (weekNum: number, dayNum: number, exerciseIdx: number, updates: Partial<any>) => void;

  // Progress Tracking
  progressHistory: ProgressHistory | null;
  logExercise: (log: ExerciseLog) => void;
  completeSession: (weekNum: number, dayNum: number) => void;
  getSessionProgress: (weekNum: number, dayNum: number) => SessionProgress | undefined;

  // UI State
  isSidebarOpen: boolean;
  toggleSidebar: () => void;

  // Reset
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),

      // Profile
      profile: null,
      setProfile: (profile) => set({ profile }),
      updateOneRepMax: (lift, value) => {
        const profile = get().profile;
        if (!profile) return;

        const newProfile = {
          ...profile,
          oneRepMax: {
            ...profile.oneRepMax,
            [lift]: value,
          },
        };

        set({ profile: newProfile });

        // Log to history
        const history = get().progressHistory;
        if (history) {
          set({
            progressHistory: {
              ...history,
              oneRepMaxHistory: [
                ...history.oneRepMaxHistory,
                {
                  date: new Date().toISOString(),
                  squat: newProfile.oneRepMax.squat,
                  bench: newProfile.oneRepMax.bench,
                  deadlift: newProfile.oneRepMax.deadlift,
                },
              ],
            },
          });
        }
      },

      // Program
      currentProgram: null,
      setCurrentProgram: (currentProgram) => {
        set({ currentProgram });

        // Initialize progress history for new program
        if (currentProgram) {
          set({
            progressHistory: {
              programId: currentProgram.id,
              sessions: [],
              oneRepMaxHistory: [],
            },
          });
        }
      },
      updateExercise: (weekNum, dayNum, exerciseIdx, updates) => {
        const program = get().currentProgram;
        if (!program) return;

        const newProgram = { ...program };
        const week = newProgram.weeks.find(w => w.weekNumber === weekNum);
        if (!week) return;

        const session = week.sessions.find(s => s.dayNumber === dayNum);
        if (!session) return;

        session.exercises[exerciseIdx] = {
          ...session.exercises[exerciseIdx],
          ...updates,
        };

        set({ currentProgram: newProgram });
      },

      // Progress Tracking
      progressHistory: null,
      logExercise: (log) => {
        const history = get().progressHistory;
        if (!history) return;

        const sessionId = `${log.weekNumber}-${log.dayNumber}`;
        let session = history.sessions.find(s => s.sessionId === sessionId);

        if (!session) {
          session = {
            sessionId,
            weekNumber: log.weekNumber,
            dayNumber: log.dayNumber,
            completed: false,
            exerciseLogs: [],
          };
          history.sessions.push(session);
        }

        // Update or add exercise log
        const existingLogIdx = session.exerciseLogs.findIndex(
          e => e.exerciseId === log.exerciseId
        );

        if (existingLogIdx >= 0) {
          session.exerciseLogs[existingLogIdx] = log;
        } else {
          session.exerciseLogs.push(log);
        }

        set({ progressHistory: { ...history } });
      },
      completeSession: (weekNum, dayNum) => {
        const history = get().progressHistory;
        if (!history) return;

        const sessionId = `${weekNum}-${dayNum}`;
        const session = history.sessions.find(s => s.sessionId === sessionId);

        if (session) {
          session.completed = true;
          session.completedAt = new Date().toISOString();
          set({ progressHistory: { ...history } });
        }
      },
      getSessionProgress: (weekNum, dayNum) => {
        const history = get().progressHistory;
        if (!history) return undefined;

        const sessionId = `${weekNum}-${dayNum}`;
        return history.sessions.find(s => s.sessionId === sessionId);
      },

      // UI State
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      // Reset
      reset: () => set({
        user: null,
        profile: null,
        currentProgram: null,
        progressHistory: null,
        isSidebarOpen: false,
      }),
    }),
    {
      name: 'ironpath-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        currentProgram: state.currentProgram,
        progressHistory: state.progressHistory,
      }),
    }
  )
);
