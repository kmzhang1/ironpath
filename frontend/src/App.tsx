import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './store';
import { Login } from './pages/Login';
import { Wizard } from './pages/Wizard';
import { Dashboard } from './pages/Dashboard';
import { getCurrentUser } from './services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((state) => state.user);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { user, setUser } = useAppStore();

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Only check if we don't already have a user in state
        if (!user) {
          const currentUser = await getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            console.log('Session restored for user:', currentUser.email);
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  // Show nothing while checking session to avoid flash of login page
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/wizard"
            element={
              <ProtectedRoute>
                <Wizard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
