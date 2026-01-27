import { useEffect, useState, useRef } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './store';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { syncUserProfile, getUserPrograms } from './services/api';
import { ThemeProvider } from './contexts/ThemeContext';
import { AnimatedRoutes } from './components/AnimatedRoutes';
import type { User } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Separate component that has access to navigate
function AppContent() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const isAuthInitializedRef = useRef(false);
  const hasCompletedInitialNavigationRef = useRef(false);
  const { setUser, setPrograms, setCurrentProgram, setProfile } = useAppStore();
  const navigate = useNavigate();

  // Handle pending navigation in a separate effect
  useEffect(() => {
    if (pendingNavigation) {
      console.log('🚀 Executing navigation to:', pendingNavigation);

      // Small delay to ensure Zustand store has updated
      const timer = setTimeout(() => {
        navigate(pendingNavigation, { replace: true });
        setPendingNavigation(null);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [pendingNavigation, navigate]);

  // Handle authentication state changes
  useEffect(() => {
    console.log('🔧 Setting up Supabase auth listener...');
    let isMounted = true;

    // Handle the initial session
    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          console.warn('⚠️ Supabase is not configured');
          if (isMounted) setIsCheckingSession(false);
          return;
        }

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Error getting session:', error);
          if (isMounted) setIsCheckingSession(false);
          return;
        }

        if (session?.user && isMounted) {
          console.log('✅ Found existing session for:', session.user.email);
          await handleAuthenticatedUser(session.user);
          isAuthInitializedRef.current = true;
        } else {
          console.log('ℹ️ No existing session found');
          if (isMounted) {
            setIsCheckingSession(false);
            isAuthInitializedRef.current = true;
          }
        }
      } catch (error) {
        console.error('❌ Error initializing auth:', error);
        if (isMounted) {
          setIsCheckingSession(false);
          isAuthInitializedRef.current = true;
        }
      }
    };

    // Helper function to handle authenticated user
    const handleAuthenticatedUser = async (supabaseUser: any) => {
      // Prevent repeated navigation after initial setup
      if (hasCompletedInitialNavigationRef.current) {
        console.log('⏭️ Skipping navigation - already completed initial setup');
        return;
      }

      try {
        const appUser: User = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.full_name ||
                supabaseUser.user_metadata?.name ||
                'Anonymous',
          email: supabaseUser.email || '',
          picture: supabaseUser.user_metadata?.avatar_url ||
                   supabaseUser.user_metadata?.picture || '',
        };

        console.log('👤 Setting user:', appUser.email);
        setUser(appUser);

        // Sync with backend
        console.log('🔄 Syncing user profile with backend...');
        await syncUserProfile(appUser);

        // Load programs
        console.log('📚 Loading user programs...');
        const programs = await getUserPrograms(appUser.id);
        console.log(`✅ Found ${programs.length} program(s)`);
        console.log('Programs data:', JSON.stringify(programs.map(p => ({ id: p.id, title: p.title, hasProfile: !!p.profile })), null, 2));

        if (programs.length > 0) {
          console.log('Setting programs in store...');
          setPrograms(programs);
          console.log('Setting current program:', programs[0].id);
          setCurrentProgram(programs[0]);

          // Set profile from program data
          if (programs[0].profile) {
            console.log('✅ Profile found in program:', programs[0].profile.name);
            setProfile(programs[0].profile);

            // Wait for next tick to ensure store updates have propagated
            await new Promise(resolve => setTimeout(resolve, 0));

            console.log('🚀 Preparing navigation to /dashboard');
            setPendingNavigation('/dashboard');
            hasCompletedInitialNavigationRef.current = true;
          } else {
            // Legacy programs without profile - redirect to profile setup first
            console.warn('⚠️ No profile found in program (legacy data) - redirecting to profile setup');
            setPendingNavigation('/profile-setup');
            hasCompletedInitialNavigationRef.current = true;
          }
        } else {
          // No programs - check if user has completed profile setup
          // If profile exists but no programs, redirect to dashboard which will show "Create First Program"
          try {
            const profileResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/profiles/${appUser.id}`);
            if (profileResponse.ok) {
              const savedProfile = await profileResponse.json();
              console.log('✅ Found saved profile but no programs, redirecting to dashboard to show create program prompt');
              setProfile(savedProfile.profile);
              // Redirect to dashboard - it will show the "Create Your First Program" button
              setPendingNavigation('/dashboard');
              hasCompletedInitialNavigationRef.current = true;
            } else {
              console.log('🚀 No profile found, redirecting to profile setup');
              setPendingNavigation('/profile-setup');
              hasCompletedInitialNavigationRef.current = true;
            }
          } catch (error) {
            console.log('🚀 Could not load profile, redirecting to profile setup (new user flow)');
            setPendingNavigation('/profile-setup');
            hasCompletedInitialNavigationRef.current = true;
          }
        }
      } catch (error) {
        console.error('❌ Error handling authenticated user:', error);
        // On error, still allow navigation but to a safe default
        setPendingNavigation('/wizard');
        hasCompletedInitialNavigationRef.current = true;
      } finally {
        // Stop showing loading screen
        setIsCheckingSession(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth state changed:', event, 'user:', session?.user?.email, 'initialized:', isAuthInitializedRef.current);

        // Skip INITIAL_SESSION events - we handle those in initializeAuth
        if (event === 'INITIAL_SESSION') {
          console.log('⏭️ Skipping INITIAL_SESSION (already handled by initializeAuth)');
          return;
        }

        // Only handle SIGNED_IN events from OAuth redirect (not on initial load)
        // The initial load is handled by initializeAuth
        if (event === 'SIGNED_IN' && session?.user) {
          if (!isAuthInitializedRef.current) {
            console.log('⏭️ Skipping SIGNED_IN event (will be handled by initializeAuth)');
            return;
          }
          console.log('✅ User signed in via OAuth redirect - handling auth');
          await handleAuthenticatedUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          console.log('👋 User signed out');
          setUser(null);
          setPrograms([]);
          setCurrentProgram(null);
          isAuthInitializedRef.current = false;
          hasCompletedInitialNavigationRef.current = false;
          setPendingNavigation('/');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('🔄 Token refreshed');
        }
      }
    );

    // Initialize auth
    initializeAuth();

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up auth listener');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, setUser, setPrograms, setCurrentProgram, setProfile]);

  // Show loading while checking session
  if (isCheckingSession) {
    console.log('🔄 Still checking session, showing loading screen...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  console.log('✅ Session check complete, rendering routes');
  return <AnimatedRoutes />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
