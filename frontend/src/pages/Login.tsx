import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAppStore } from '@/store';
import { loginWithGoogle, handleOAuthCallback } from '@/services/api';
import { Dumbbell, Loader2, AlertCircle } from 'lucide-react';

export function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const setUser = useAppStore((state) => state.setUser);

  // Handle OAuth callback when returning from Google
  useEffect(() => {
    const handleCallback = async () => {
      // Check if this is an OAuth callback
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const searchParams = new URLSearchParams(window.location.search);

      if (hashParams.has('access_token') || searchParams.has('code')) {
        setIsLoading(true);
        try {
          const user = await handleOAuthCallback();
          if (user) {
            setUser(user);
            navigate('/wizard');
          }
        } catch (err) {
          console.error('OAuth callback error:', err);
          setError('Authentication failed. Please try again.');
        } finally {
          setIsLoading(false);
        }
      }
    };

    handleCallback();
  }, [navigate, setUser]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginWithGoogle();

      // If using mock mode (returns a user), navigate immediately
      if (result) {
        setUser(result);
        navigate('/wizard');
      }
      // Otherwise, Supabase will redirect to Google (function returns void)
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-lime-400 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-12 h-12 text-zinc-950" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-zinc-50">
              IronPath <span className="text-lime-400">AI</span>
            </h1>
            <p className="mt-2 text-zinc-400 font-mono text-sm">
              Powerlifting coaching, algorithmically perfected
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to generate your personalized powerlifting program
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-900 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-11"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

            <div className="text-xs text-zinc-500 text-center">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div className="space-y-1">
            <div className="text-lime-400 font-semibold">AI-Generated</div>
            <div className="text-zinc-500">Custom programs</div>
          </div>
          <div className="space-y-1">
            <div className="text-lime-400 font-semibold">RPE-Based</div>
            <div className="text-zinc-500">Auto-regulation</div>
          </div>
          <div className="space-y-1">
            <div className="text-lime-400 font-semibold">Export Ready</div>
            <div className="text-zinc-500">Excel sheets</div>
          </div>
        </div>
      </div>
    </div>
  );
}
