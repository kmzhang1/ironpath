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
  IntensityRating,
} from '@/types';
import {
  syncSessionCompletion,
  syncSessionUncomplete,
  syncIntensityRating,
  syncScheduledDate,
} from '@/services/progressSync';

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
  setPrograms: (programs: FullProgram[]) => void;
  setCurrentProgram: (program: FullProgram | null) => void;
  selectProgramById: (programId: string) => void;
  deleteProgram: (programId: string) => void;
  updateExercise: (weekNum: number, dayNum: number, exerciseIdx: number, updates: Partial<any>) => void;

  // Progress Tracking
  progressHistory: ProgressHistory | null;
  logExercise: (log: ExerciseLog) => void;
  completeSession: (weekNum: number, dayNum: number) => void;
  uncompleteSession: (weekNum: number, dayNum: number) => void;
  getSessionProgress: (weekNum: number, dayNum: number) => SessionProgress | undefined;

  // Workout Feedback
  submitWorkoutFeedback: (feedback: WorkoutFeedback) => void;
  getWorkoutFeedback: (weekNum: number, dayNum: number) => WorkoutFeedback | undefined;

  // Session Dating
  scheduleWorkout: (weekNum: number, dayNum: number, date: string) => void;
  scheduleWorkoutWithCascade: (weekNum: number, dayNum: number, newDate: string, oldDate: string) => void;
  getScheduledDate: (weekNum: number, dayNum: number) => string | undefined;

  // Intensity Rating
  setIntensityRating: (weekNum: number, dayNum: number, rating: IntensityRating) => void;
  getIntensityRating: (weekNum: number, dayNum: number) => IntensityRating | undefined;

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
      setPrograms: (programs) => {
        set({ programs });
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
      deleteProgram: (programId) => {
        const programs = get().programs;
        const currentProgram = get().currentProgram;

        // Remove program from list
        const updatedPrograms = programs.filter(p => p.id !== programId);
        set({ programs: updatedPrograms });

        // If deleting the current program, switch to another or set to null
        if (currentProgram?.id === programId) {
          if (updatedPrograms.length > 0) {
            // Switch to the first remaining program
            get().setCurrentProgram(updatedPrograms[0]);
          } else {
            // No programs left
            set({
              currentProgram: null,
              progressHistory: null
            });
          }
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
        const currentProgram = get().currentProgram;
        if (!history || !currentProgram) return;

        const sessionId = `${weekNum}-${dayNum}`;
        let session = history.sessions.find(s => s.sessionId === sessionId);

        // Create session entry if it doesn't exist
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

        session.completed = true;
        session.completedAt = new Date().toISOString();
        set({ progressHistory: { ...history } });

        // Sync to database (background, non-blocking)
        syncSessionCompletion(
          currentProgram.id,
          weekNum,
          dayNum,
          session.completedAt,
          session.intensityRating,
          session.scheduledDate
        ).catch(error => {
          console.error('Failed to sync completion to database:', error);
          // Keep in localStorage - will retry via retry queue
        });
      },
      uncompleteSession: (weekNum, dayNum) => {
        const history = get().progressHistory;
        const currentProgram = get().currentProgram;
        if (!history || !currentProgram) return;

        const sessionId = `${weekNum}-${dayNum}`;
        const session = history.sessions.find(s => s.sessionId === sessionId);

        if (!session) {
          // No session to uncomplete
          return;
        }

        // Mark as not completed
        session.completed = false;
        session.completedAt = undefined;
        set({ progressHistory: { ...history } });

        // Sync to database (background, non-blocking)
        syncSessionUncomplete(
          currentProgram.id,
          weekNum,
          dayNum
        ).catch(error => {
          console.error('Failed to sync un-completion to database:', error);
          // Keep in localStorage - will retry via retry queue
        });
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
        const currentProgram = get().currentProgram;
        if (!history || !currentProgram) return;

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

        // Sync to database (background, non-blocking)
        syncScheduledDate(
          currentProgram.id,
          weekNum,
          dayNum,
          date
        ).catch(error => {
          console.error('Failed to sync scheduled date to database:', error);
          // Keep in localStorage - will retry via retry queue
        });
      },
      scheduleWorkoutWithCascade: (weekNum, dayNum, newDate, oldDate) => {
        const program = get().currentProgram;
        const history = get().progressHistory;
        if (!program || !history) return;

        // Calculate the date difference in milliseconds
        const oldDateObj = new Date(oldDate);
        const newDateObj = new Date(newDate);
        const dateDiffMs = newDateObj.getTime() - oldDateObj.getTime();

        // Update the current session
        get().scheduleWorkout(weekNum, dayNum, newDate);

        // Find all future sessions and update their dates
        program.weeks.forEach((week) => {
          week.sessions.forEach((session) => {
            // Skip sessions that come before or are the current session
            if (week.weekNumber < weekNum) return;
            if (week.weekNumber === weekNum && session.dayNumber <= dayNum) return;

            // Get the current scheduled date (from progress history or program)
            const existingProgressDate = get().getScheduledDate(week.weekNumber, session.dayNumber);
            const currentDate = existingProgressDate || session.scheduledDate;

            if (currentDate) {
              // Shift the date by the same amount
              const shiftedDate = new Date(new Date(currentDate).getTime() + dateDiffMs);
              get().scheduleWorkout(week.weekNumber, session.dayNumber, shiftedDate.toISOString());
            }
          });
        });
      },
      getScheduledDate: (weekNum, dayNum) => {
        const session = get().getSessionProgress(weekNum, dayNum);
        return session?.scheduledDate;
      },

      // Intensity Rating
      setIntensityRating: (weekNum, dayNum, rating) => {
        const history = get().progressHistory;
        const currentProgram = get().currentProgram;
        if (!history || !currentProgram) return;

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

        session.intensityRating = rating;
        set({ progressHistory: { ...history } });

        // Sync to database (background, non-blocking)
        syncIntensityRating(
          currentProgram.id,
          weekNum,
          dayNum,
          rating
        ).catch(error => {
          console.error('Failed to sync intensity rating to database:', error);
          // Keep in localStorage - will retry via retry queue
        });
      },
      getIntensityRating: (weekNum, dayNum) => {
        const session = get().getSessionProgress(weekNum, dayNum);
        return session?.intensityRating;
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
