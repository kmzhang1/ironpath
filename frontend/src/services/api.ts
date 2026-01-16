import type {
  User,
  FullProgram,
  ProgramGenerationRequest,
  LifterProfile,
  FeedbackCategory,
  WorkoutFeedback,
  CheckInAnalysis,
} from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Mock delay to simulate network request
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock auth token (fallback for when Supabase is not configured)
let mockAuthToken: string | null = null;

/**
 * Initiates Google OAuth login flow
 * If Supabase is configured, redirects to Google OAuth
 * Otherwise, falls back to mock authentication for testing
 */
export async function loginWithGoogle(): Promise<User | void> {
  if (isSupabaseConfigured) {
    // Use real Supabase OAuth
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      throw new Error(`Google OAuth failed: ${error.message}`);
    }
    // Function returns void because auth happens via redirect
  } else {
    // Mock OAuth for testing without Supabase
    console.warn('⚠️ Supabase not configured - using mock authentication');
    await delay(1000); // Simulate OAuth redirect

    const mockUser: User = {
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      name: 'John Powerlifter',
      email: 'john@ironpath.ai',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    };

    mockAuthToken = 'mock_token_' + Math.random().toString(36).substr(2, 16);
    return mockUser;
  }
}

/**
 * Handles OAuth callback after Google redirect
 * Extracts user data from Supabase session
 */
export async function handleOAuthCallback(): Promise<User | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data: { session }, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Session retrieval error:', error);
    throw new Error(`Failed to get session: ${error.message}`);
  }

  if (!session) {
    return null;
  }

  const { user: supabaseUser } = session;

  // Map Supabase user to our User type
  const user: User = {
    id: supabaseUser.id,
    name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'Anonymous',
    email: supabaseUser.email || '',
    picture: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
  };

  return user;
}

/**
 * Gets the current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  if (isSupabaseConfigured) {
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();

    if (!supabaseUser) {
      return null;
    }

    return {
      id: supabaseUser.id,
      name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'Anonymous',
      email: supabaseUser.email || '',
      picture: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || '',
    };
  }

  // Mock mode
  if (mockAuthToken) {
    return {
      id: 'user_mock',
      name: 'John Powerlifter',
      email: 'john@ironpath.ai',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    };
  }

  return null;
}

/**
 * Logs out the current user
 */
export async function logout(): Promise<void> {
  if (isSupabaseConfigured) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
  } else {
    await delay(300);
    mockAuthToken = null;
  }
}

/**
 * Generates a realistic powerlifting program based on request
 * Simulates 3-second AI processing delay
 */
export async function generateProgram(
  request: ProgramGenerationRequest,
  profile: LifterProfile
): Promise<FullProgram> {
  await delay(3000); // Simulate AI "thinking"

  if (!mockAuthToken) {
    throw new Error('Not authenticated');
  }

  const programId = 'prog_' + Math.random().toString(36).substr(2, 9);
  const goalName = request.goal === 'peaking' ? 'Competition Peak' :
                   request.goal === 'hypertrophy' ? 'Hypertrophy Block' :
                   'Strength Development';

  // Generate realistic program structure
  const program: FullProgram = {
    id: programId,
    createdAt: new Date().toISOString(),
    title: `${goalName} - ${request.weeks} Week Program`,
    weeks: [],
  };

  // Generate weeks
  for (let weekNum = 1; weekNum <= request.weeks; weekNum++) {
    const microcycle = {
      weekNumber: weekNum,
      sessions: [] as any[],
    };

    // Generate sessions based on daysPerWeek
    for (let dayNum = 1; dayNum <= request.daysPerWeek; dayNum++) {
      const session = generateSession(weekNum, dayNum, request, profile);
      microcycle.sessions.push(session);
    }

    program.weeks.push(microcycle);
  }

  return program;
}

/**
 * Generates a single training session
 */
function generateSession(
  weekNum: number,
  dayNum: number,
  request: ProgramGenerationRequest,
  _profile: LifterProfile
) {
  const focuses = ['Squat', 'Bench Press', 'Deadlift', 'Accessories'];
  const focus = focuses[(dayNum - 1) % focuses.length];

  // Calculate intensity progression
  const weekProgress = (weekNum - 1) / (request.weeks - 1);
  const baseRPE = request.goal === 'peaking' ? 8 :
                  request.goal === 'hypertrophy' ? 7 : 7.5;

  const rpe = request.goal === 'peaking'
    ? Math.min(baseRPE + weekProgress * 2, 10) // Peak to RPE 10
    : baseRPE + (weekProgress * 1.5); // Moderate progression

  const session = {
    dayNumber: dayNum,
    focus: `${focus} ${request.goal === 'hypertrophy' ? 'Volume' : request.goal === 'peaking' ? 'Intensity' : 'Strength'}`,
    exercises: [] as any[],
  };

  // Main lift
  if (dayNum <= 3) {
    const mainLift = dayNum === 1 ? 'Squat' : dayNum === 2 ? 'Bench Press' : 'Deadlift';

    if (request.goal === 'hypertrophy') {
      session.exercises.push({
        name: mainLift,
        sets: 4,
        reps: '8-10',
        rpeTarget: Math.round(rpe * 10) / 10,
        restSeconds: 180,
        notes: 'Controlled tempo, focus on muscle tension',
      });
    } else if (request.goal === 'peaking') {
      const peakingReps = weekNum >= request.weeks - 2 ? '1-3' :
                          weekNum >= request.weeks - 4 ? '3-5' : '5';
      session.exercises.push({
        name: mainLift,
        sets: weekNum >= request.weeks - 2 ? 5 : 4,
        reps: peakingReps,
        rpeTarget: Math.round(rpe * 10) / 10,
        restSeconds: 300,
        notes: weekNum >= request.weeks - 2 ? 'Competition prep - peak intensity' : 'Build strength base',
      });
    } else {
      session.exercises.push({
        name: mainLift,
        sets: 5,
        reps: '5',
        rpeTarget: Math.round(rpe * 10) / 10,
        restSeconds: 240,
        notes: 'Linear strength progression',
      });
    }

    // Variation lift
    const variations = {
      'Squat': ['Pause Squat', 'Front Squat', 'Box Squat', 'Tempo Squat'],
      'Bench Press': ['Close Grip Bench', 'Pause Bench Press', 'Incline Bench Press', 'Spoto Press'],
      'Deadlift': ['Deficit Deadlift', 'Paused Deadlift', 'Romanian Deadlift', 'Block Pulls'],
    };

    const variationOptions = variations[mainLift as keyof typeof variations];
    const variation = variationOptions[weekNum % variationOptions.length];

    session.exercises.push({
      name: variation,
      sets: 3,
      reps: request.goal === 'hypertrophy' ? '10-12' : '6-8',
      rpeTarget: Math.max(rpe - 1, 6),
      restSeconds: 180,
      notes: 'Address weaknesses',
    });

    // Accessories
    const accessories = getAccessories(mainLift, request.goal);
    accessories.forEach((acc) => {
      session.exercises.push(acc);
    });
  } else {
    // Accessory day
    const accessoryExercises = [
      {
        name: 'Leg Press',
        sets: 3,
        reps: '12-15',
        rpeTarget: 7,
        restSeconds: 120,
      },
      {
        name: 'Leg Curl',
        sets: 3,
        reps: '12-15',
        rpeTarget: 7,
        restSeconds: 90,
      },
      {
        name: 'Cable Row',
        sets: 3,
        reps: '10-12',
        rpeTarget: 7,
        restSeconds: 90,
      },
      {
        name: 'Lat Pulldown',
        sets: 3,
        reps: '10-12',
        rpeTarget: 7,
        restSeconds: 90,
      },
      {
        name: 'Ab Wheel Rollouts',
        sets: 3,
        reps: '10-15',
        rpeTarget: 8,
        restSeconds: 60,
        notes: 'Core stability',
      },
    ];

    session.exercises = accessoryExercises;
  }

  return session;
}

/**
 * Returns accessory exercises based on main lift and goal
 */
function getAccessories(mainLift: string, goal: string) {
  const accessories = [];

  if (mainLift === 'Squat') {
    accessories.push(
      {
        name: 'Bulgarian Split Squat',
        sets: 3,
        reps: goal === 'hypertrophy' ? '10-12' : '8-10',
        rpeTarget: 7,
        restSeconds: 120,
        notes: 'Each leg',
      },
      {
        name: 'Leg Extension',
        sets: 3,
        reps: '12-15',
        rpeTarget: 8,
        restSeconds: 90,
      }
    );
  } else if (mainLift === 'Bench Press') {
    accessories.push(
      {
        name: 'Dumbbell Bench Press',
        sets: 3,
        reps: goal === 'hypertrophy' ? '10-12' : '8-10',
        rpeTarget: 7,
        restSeconds: 120,
      },
      {
        name: 'Tricep Dips',
        sets: 3,
        reps: '10-12',
        rpeTarget: 8,
        restSeconds: 90,
      }
    );
  } else if (mainLift === 'Deadlift') {
    accessories.push(
      {
        name: 'Barbell Row',
        sets: 3,
        reps: '8-10',
        rpeTarget: 7,
        restSeconds: 120,
      },
      {
        name: 'Good Mornings',
        sets: 3,
        reps: '10-12',
        rpeTarget: 7,
        restSeconds: 90,
        notes: 'Posterior chain',
      }
    );
  }

  return accessories;
}

/**
 * Saves program (mock - just returns success)
 */
export async function saveProgram(program: FullProgram): Promise<{ success: boolean }> {
  await delay(500);

  if (!mockAuthToken) {
    throw new Error('Not authenticated');
  }

  console.log('Program saved:', program.id);
  return { success: true };
}

/**
 * Submit workout feedback and get AI-adjusted workout
 */
export async function submitWorkoutFeedback(
  weekNumber: number,
  dayNumber: number,
  categories: FeedbackCategory[],
  feedbackText: string | undefined,
  _currentProgram: FullProgram
): Promise<WorkoutFeedback> {
  await delay(2000); // Simulate AI processing

  if (!mockAuthToken) {
    throw new Error('Not authenticated');
  }

  // Mock adjustment logic
  let suggestedAdjustment = 'Based on your feedback: ';

  if (categories.includes('injury')) {
    suggestedAdjustment += 'Removed problematic exercises and reduced intensity. ';
  }
  if (categories.includes('muscle_fatigue') || categories.includes('excessive_soreness')) {
    suggestedAdjustment += 'Reduced volume by 20% and lowered RPE by 1 point. ';
  }
  if (categories.includes('low_energy')) {
    suggestedAdjustment += 'Reduced total sets while maintaining key lifts. ';
  }
  if (categories.includes('feeling_strong')) {
    suggestedAdjustment += 'Increased RPE by 0.5 points to capitalize on good recovery. ';
  }

  suggestedAdjustment += feedbackText ? `Additional notes considered: "${feedbackText}"` : '';

  const feedback: WorkoutFeedback = {
    sessionId: `${weekNumber}-${dayNumber}`,
    weekNumber,
    dayNumber,
    timestamp: new Date().toISOString(),
    categories,
    feedbackText,
    suggestedAdjustment,
  };

  console.log('Workout feedback submitted:', feedback);
  return feedback;
}

/**
 * Perform daily or weekly check-in
 */
export async function performCheckIn(
  type: 'daily' | 'weekly',
  progressHistory: any,
  _currentProgram: FullProgram
): Promise<CheckInAnalysis> {
  await delay(2500); // Simulate AI analysis

  if (!mockAuthToken) {
    throw new Error('Not authenticated');
  }

  // Calculate mock metrics
  const sessions = progressHistory.sessions || [];
  const completedSessions = sessions.filter((s: any) => s.completed).length;
  const totalSessions = sessions.length;

  const insights: string[] = [];
  const recommendations: string[] = [];
  let programAdjustmentsNeeded = false;

  // Mock analysis
  const adherenceRate = totalSessions > 0 ? completedSessions / totalSessions : 0;

  if (adherenceRate >= 0.8) {
    insights.push('Excellent adherence! You completed most of your planned workouts.');
    recommendations.push('Continue with the current program structure.');
  } else if (adherenceRate >= 0.6) {
    insights.push('Good consistency, but there is room for improvement.');
    recommendations.push('Try scheduling workouts at consistent times to improve adherence.');
  } else {
    insights.push('Adherence is below target. Consider adjusting your program.');
    recommendations.push('We may need to reduce training frequency or adjust your schedule.');
    programAdjustmentsNeeded = true;
  }

  // Check for injury/fatigue feedback
  const recentFeedback = sessions
    .filter((s: any) => s.feedback)
    .slice(-5);

  const injuryCount = recentFeedback.filter((s: any) =>
    s.feedback?.categories?.includes('injury')
  ).length;

  if (injuryCount >= 2) {
    insights.push('Multiple injury reports detected. Recovery should be prioritized.');
    recommendations.push('Consider adding more recovery days and reducing training volume.');
    programAdjustmentsNeeded = true;
  }

  const fatigueCount = recentFeedback.filter((s: any) =>
    s.feedback?.categories?.includes('muscle_fatigue') ||
    s.feedback?.categories?.includes('excessive_soreness')
  ).length;

  if (fatigueCount >= 3) {
    insights.push('High fatigue levels observed across multiple sessions.');
    recommendations.push('Reduce intensity (RPE) by 1 point for the next week.');
  }

  const strongCount = recentFeedback.filter((s: any) =>
    s.feedback?.categories?.includes('feeling_strong')
  ).length;

  if (strongCount >= 3) {
    insights.push('Consistently feeling strong! Your body is responding well to training.');
    recommendations.push('Consider slight progressive overload if strength continues to increase.');
  }

  const now = new Date();
  const startDate = type === 'daily'
    ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const checkIn: CheckInAnalysis = {
    type,
    timestamp: now.toISOString(),
    period: {
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    },
    metrics: {
      sessionsCompleted: completedSessions,
      sessionsPlanned: totalSessions || 4, // Mock planned
      adherenceRate,
      averageRPE: 7.8, // Mock
      totalVolume: undefined,
    },
    insights,
    recommendations,
    programAdjustmentsNeeded,
  };

  console.log('Check-in performed:', checkIn);
  return checkIn;
}
