import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  LifterProfile,
  FullProgram,
  ProgressHistory,
  SessionProgress,
  ExerciseLog,
  WorkoutFeedback,
  CheckInAnalysis,
} from '@/types';

interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Profile
  profile: LifterProfile | null;
  setProfile: (profile: LifterProfile | null) => void;
  updateOneRepMax: (lift: 'squat' | 'bench' | 'deadlift', value: number) => void;
  updateBiometrics: (updates: Partial<LifterProfile['biometrics']>) => void;
  updateProfileName: (name: string) => void;

  // Program
  programs: FullProgram[];
  currentProgram: FullProgram | null;
  addProgram: (program: FullProgram) => void;
  setCurrentProgram: (program: FullProgram | null) => void;
  selectProgramById: (programId: string) => void;
  updateExercise: (weekNum: number, dayNum: number, exerciseIdx: number, updates: Partial<any>) => void;

  // Progress Tracking
  progressHistory: ProgressHistory | null;
  logExercise: (log: ExerciseLog) => void;
  completeSession: (weekNum: number, dayNum: number) => void;
  getSessionProgress: (weekNum: number, dayNum: number) => SessionProgress | undefined;

  // Workout Feedback
  submitWorkoutFeedback: (feedback: WorkoutFeedback) => void;
  getWorkoutFeedback: (weekNum: number, dayNum: number) => WorkoutFeedback | undefined;

  // Session Dating
  scheduleWorkout: (weekNum: number, dayNum: number, date: string) => void;
  getScheduledDate: (weekNum: number, dayNum: number) => string | undefined;

  // Check-ins
  addCheckIn: (checkIn: CheckInAnalysis) => void;
  getRecentCheckIns: (type: 'daily' | 'weekly', limit?: number) => CheckInAnalysis[];

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
      updateBiometrics: (updates) => {
        const profile = get().profile;
        if (!profile) return;

        const newProfile = {
          ...profile,
          biometrics: {
            ...profile.biometrics,
            ...updates,
          },
        };

        set({ profile: newProfile });
      },
      updateProfileName: (name) => {
        const profile = get().profile;
        if (!profile) return;

        set({ profile: { ...profile, name } });
      },

      // Program
      programs: [],
      currentProgram: null,
      addProgram: (program) => {
        const programs = get().programs;
        set({
          programs: [...programs, program],
          currentProgram: program
        });

        // Initialize progress history for new program
        set({
          progressHistory: {
            programId: program.id,
            sessions: [],
            oneRepMaxHistory: [],
            checkIns: [],
          },
        });
      },
      setCurrentProgram: (currentProgram) => {
        set({ currentProgram });

        // Initialize progress history for new program if not exists
        if (currentProgram) {
          const history = get().progressHistory;
          if (!history || history.programId !== currentProgram.id) {
            set({
              progressHistory: {
                programId: currentProgram.id,
                sessions: [],
                oneRepMaxHistory: [],
                checkIns: [],
              },
            });
          }
        }
      },
      selectProgramById: (programId) => {
        const programs = get().programs;
        const program = programs.find(p => p.id === programId);
        if (program) {
          get().setCurrentProgram(program);
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

      // Workout Feedback
      submitWorkoutFeedback: (feedback) => {
        const history = get().progressHistory;
        if (!history) return;

        const sessionId = `${feedback.weekNumber}-${feedback.dayNumber}`;
        let session = history.sessions.find(s => s.sessionId === sessionId);

        if (!session) {
          session = {
            sessionId,
            weekNumber: feedback.weekNumber,
            dayNumber: feedback.dayNumber,
            completed: false,
            exerciseLogs: [],
          };
          history.sessions.push(session);
        }

        session.feedback = feedback;
        set({ progressHistory: { ...history } });
      },
      getWorkoutFeedback: (weekNum, dayNum) => {
        const session = get().getSessionProgress(weekNum, dayNum);
        return session?.feedback;
      },

      // Session Dating
      scheduleWorkout: (weekNum, dayNum, date) => {
        const history = get().progressHistory;
        if (!history) return;

        const sessionId = `${weekNum}-${dayNum}`;
        let session = history.sessions.find(s => s.sessionId === sessionId);

        if (!session) {
          session = {
            sessionId,
            weekNumber: weekNum,
            dayNumber: dayNum,
            completed: false,
            exerciseLogs: [],
          };
          history.sessions.push(session);
        }

        session.scheduledDate = date;
        set({ progressHistory: { ...history } });
      },
      getScheduledDate: (weekNum, dayNum) => {
        const session = get().getSessionProgress(weekNum, dayNum);
        return session?.scheduledDate;
      },

      // Check-ins
      addCheckIn: (checkIn) => {
        const history = get().progressHistory;
        if (!history) return;

        set({
          progressHistory: {
            ...history,
            checkIns: [...history.checkIns, checkIn],
          },
        });
      },
      getRecentCheckIns: (type, limit = 5) => {
        const history = get().progressHistory;
        if (!history) return [];

        return history.checkIns
          .filter(c => c.type === type)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      },

      // UI State
      isSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),

      // Reset
      reset: () => set({
        user: null,
        profile: null,
        programs: [],
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
        programs: state.programs,
        currentProgram: state.currentProgram,
        progressHistory: state.progressHistory,
      }),
    }
  )
);
