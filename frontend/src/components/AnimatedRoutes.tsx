import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Login } from '@/pages/Login';
import { Wizard } from '@/pages/Wizard';
import { Dashboard } from '@/pages/Dashboard';
import { DashboardPreview } from '@/pages/DashboardPreview';
import { ProfileSetup } from '@/pages/ProfileSetup';
import { ProgramSetup } from '@/pages/ProgramSetup';
import { useAppStore } from '@/store';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAppStore((state) => state.user);

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Page transition variants - subtle fade in with slight upward movement
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

// Snappy, professional transition timing
const pageTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.2,
};

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageWrapper>
              <Login />
            </PageWrapper>
          }
        />
        <Route
          path="/preview"
          element={
            <PageWrapper>
              <DashboardPreview />
            </PageWrapper>
          }
        />
        <Route
          path="/profile-setup"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <ProfileSetup />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/program-setup"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <ProgramSetup />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/wizard"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <Wizard />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <PageWrapper>
                <Dashboard />
              </PageWrapper>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
