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
}

// 2. The Request sent to the AI Agent
export interface ProgramGenerationRequest {
  goal: 'peaking' | 'hypertrophy' | 'strength_block';
  weeks: number; // e.g. 8, 12
  daysPerWeek: number;
  limitations: string[]; // e.g., "Low back injury"
  focusAreas: string[]; // e.g., "Lockout strength"
}

// 3. The AI-Generated Response Structure
export interface LiftingSession {
  dayNumber: number; // 1-7
  focus: string; // e.g., "Squat Volume"
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
}

// Additional types for authentication
export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
}
