import type {
  User,
  FullProgram,
  ProgramGenerationRequest,
  LifterProfile,
  FeedbackCategory,
  WorkoutFeedback,
  CheckInAnalysis,
  Methodology,
  ReadinessCheckRequest,
  ReadinessCheckResponse,
  AgentMessageRequest,
  AgentMessageResponse,
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

    // Sync user profile with backend
    await syncUserProfile(mockUser);

    return mockUser;
  }
}

/**
 * Syncs user profile with backend database
 * Should be called after successful authentication
 */
export async function syncUserProfile(user: User): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${apiUrl}/api/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to sync user profile: ${errorData.detail || response.statusText}`);
    }

    console.log('✅ User profile synced with backend');
  } catch (error) {
    console.error('⚠️ Failed to sync user profile:', error);
    // Don't throw - allow user to continue even if sync fails
  }
}

/**
 * @deprecated This function is no longer needed. OAuth is now handled via
 * Supabase's onAuthStateChange listener in App.tsx.
 * Kept for backward compatibility only.
 */
export async function handleOAuthCallback(): Promise<User | null> {
  console.warn('⚠️ handleOAuthCallback is deprecated and should not be called');
  return null;
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
 * Generates a powerlifting program by calling the backend API
 */
export async function generateProgram(
  request: ProgramGenerationRequest,
  profile: LifterProfile
): Promise<FullProgram> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  console.log('🚀 Sending program generation request to:', `${apiUrl}/api/programs/generate`);
  console.log('📝 Profile:', profile);
  console.log('⚙️ Request params:', request);

  try {

    const response = await fetch(`${apiUrl}/api/programs/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profile: profile,
        request: request,
      }),
    });

    console.log('📡 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error response:', errorData);
      const errorMessage = errorData.detail?.error || errorData.detail || 'Failed to generate program';
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('✅ Program generated successfully:', data);
    return data.program;
  } catch (error) {
    console.error('💥 Program generation error:', error);
    throw error;
  }
}


/**
 * Saves program (no-op - backend already saves it)
 * This function is kept for backward compatibility but does nothing
 * since the backend saves the program when generating it.
 */
export async function saveProgram(program: FullProgram): Promise<{ success: boolean }> {
  await delay(500);
  console.log('Program already saved to backend:', program.id);
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

/**
 * Fetch all programs for a user from the backend
 */
export async function getUserPrograms(userId: string): Promise<FullProgram[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  try {
    // First get the list of program metadata
    const listResponse = await fetch(`${apiUrl}/api/programs/user/${userId}`);

    if (!listResponse.ok) {
      if (listResponse.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch programs: ${listResponse.statusText}`);
    }

    const programList = await listResponse.json();

    if (!programList || programList.length === 0) {
      return [];
    }

    // Fetch full program data for each program
    const programs: FullProgram[] = [];
    for (const programMeta of programList) {
      const programResponse = await fetch(`${apiUrl}/api/programs/${programMeta.id}`);

      if (programResponse.ok) {
        const programData = await programResponse.json();
        programs.push(programData.program);
      }
    }

    return programs;
  } catch (error) {
    console.error('Failed to fetch user programs:', error);
    return [];
  }
}

/**
 * Fetch list of available training methodologies
 */
export async function listMethodologies(): Promise<Methodology[]> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${apiUrl}/api/methodologies/list`);

    if (!response.ok) {
      throw new Error(`Failed to fetch methodologies: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to fetch methodologies:', error);
    return [];
  }
}

/**
 * Submit readiness check and get workout adjustment recommendation
 */
export async function submitReadinessCheck(
  data: ReadinessCheckRequest
): Promise<ReadinessCheckResponse> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const response = await fetch(`${apiUrl}/api/readiness/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit readiness check');
  }

  return await response.json();
}

/**
 * Send message to agent router and get response
 */
export async function sendAgentMessage(
  request: AgentMessageRequest
): Promise<AgentMessageResponse> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const response = await fetch(`${apiUrl}/api/agent/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to send message to agent');
  }

  return await response.json();
}
