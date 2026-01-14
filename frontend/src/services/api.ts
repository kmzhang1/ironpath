import type { User, FullProgram, ProgramGenerationRequest, LifterProfile } from '@/types';

// Mock delay to simulate network request
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock auth token
let mockAuthToken: string | null = null;

/**
 * Simulates Google OAuth login
 * Returns a mock user object and sets a fake auth token
 */
export async function loginWithGoogle(): Promise<User> {
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

/**
 * Logs out the current user
 */
export async function logout(): Promise<void> {
  await delay(300);
  mockAuthToken = null;
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
      sessions: [],
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
  profile: LifterProfile
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
    exercises: [],
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
