// 1. The User's Context
export interface LifterProfile {
  id: string;
  name: string;
  biometrics: {
    bodyweight: number;
    unit: 'kg' | 'lbs';
    sex: 'male' | 'female'; // Critical for DOTS calc
    age: number;
  };
  oneRepMax: {
    squat: number;
    bench: number;
    deadlift: number;
  };
  // Multi-agent fields (Phase 4)
  trainingAge?: 'novice' | 'intermediate' | 'advanced';
  weakPoints?: string[];
  equipmentAccess?: 'garage' | 'commercial' | 'hardcore';
  preferredSessionLength?: number;
  competitionDate?: string;
  methodologyId?: string;
}

// 2. The Request sent to the AI Agent
export interface ProgramGenerationRequest {
  goal: 'peaking' | 'hypertrophy' | 'strength_block';
  weeks: number; // e.g. 8, 12
  daysPerWeek: number;
  minutesPerWorkout: number; // Target workout duration (30-120 minutes)
  limitations: string[]; // e.g., "Low back injury"
  focusAreas: string[]; // e.g., "Lockout strength"
  startDate?: string; // ISO date when program starts - used to assign workout dates
}

// 3. The AI-Generated Response Structure
export interface LiftingSession {
  dayNumber: number; // 1-7
  focus: string; // e.g., "Squat Volume"
  scheduledDate?: string; // ISO date assigned based on program start date
  exercises: {
    name: string;
    sets: number;
    reps: string; // string allows "3-5" or "AMRAP"
    rpeTarget: number; // 1-10
    restSeconds: number;
    notes?: string;
  }[];
}

export interface ProgramMicrocycle {
  weekNumber: number;
  sessions: LiftingSession[];
}

export interface FullProgram {
  id: string;
  createdAt: string;
  title: string;
  weeks: ProgramMicrocycle[];
  profile?: LifterProfile; // Profile used to generate this program (for restoring state on login)
}

// Additional types for authentication
export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
}

// Progress tracking types
export interface ExerciseLog {
  exerciseId: string; // week-day-exerciseIndex
  weekNumber: number;
  dayNumber: number;
  exerciseIndex: number;
  sets: {
    setNumber: number;
    weight: number;
    reps: number;
    rpe: number;
    completed: boolean;
    notes?: string;
  }[];
  completedAt?: string;
}

// Feedback categories for workout adjustments
export type FeedbackCategory =
  | 'injury'
  | 'muscle_fatigue'
  | 'excessive_soreness'
  | 'low_energy'
  | 'schedule_conflict'
  | 'feeling_strong'
  | 'other';

// Intensity rating for post-workout quick feedback
export type IntensityRating = 'easy' | 'perfect' | 'hard';

export interface WorkoutFeedback {
  sessionId: string;
  weekNumber: number;
  dayNumber: number;
  timestamp: string;
  categories: FeedbackCategory[];
  feedbackText?: string;
  suggestedAdjustment?: string; // AI-generated adjustment
}

export interface SessionProgress {
  sessionId: string; // week-day
  weekNumber: number;
  dayNumber: number;
  completed: boolean;
  completedAt?: string;
  scheduledDate?: string; // ISO 8601 date when workout is scheduled/completed
  exerciseLogs: ExerciseLog[];
  feedback?: WorkoutFeedback;
  intensityRating?: IntensityRating; // Post-workout perceived difficulty
}

export interface CheckInAnalysis {
  type: 'daily' | 'weekly';
  timestamp: string;
  period: {
    startDate: string;
    endDate: string;
  };
  metrics: {
    sessionsCompleted: number;
    sessionsPlanned: number;
    adherenceRate: number;
    averageRPE?: number;
    totalVolume?: number;
  };
  insights: string[]; // AI-generated insights
  recommendations: string[]; // AI-generated recommendations
  programAdjustmentsNeeded: boolean;
}

export interface ProgressHistory {
  programId: string;
  sessions: SessionProgress[];
  oneRepMaxHistory: {
    date: string;
    squat: number;
    bench: number;
    deadlift: number;
  }[];
  checkIns: CheckInAnalysis[];
}

// Multi-Agent System Types (Phase 4)

export interface Methodology {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface ReadinessCheckRequest {
  userId: string;
  programId: string;
  weekNumber: number;
  dayNumber: number;
  sleepQuality: number;
  stressLevel: number;
  sorenessFatigue: number;
}

export interface ReadinessCheckResponse {
  checkId: string;
  overallReadiness: number;
  recommendation: string;
  shouldAdjustWorkout: boolean;
  adjustmentType?: 'reduce_volume' | 'reduce_intensity' | 'recovery_session';
}

export interface AgentMessageRequest {
  message: string;
  profile: LifterProfile;
  currentProgramId?: string;
}

export interface AgentMessageResponse {
  agentUsed: string;
  intentClassification: {
    intent: string;
    confidence: number;
    reasoning: string;
  };
  response: {
    message?: string;
    response?: string;
    requiresProgramGeneration?: boolean;
    requiresFeedbackForm?: boolean;
  };
  timestamp: string;
}
