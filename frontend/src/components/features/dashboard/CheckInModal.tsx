import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CheckInAnalysis } from '@/types';

interface CheckInModalProps {
  type: 'daily' | 'weekly';
  isOpen: boolean;
  onClose: () => void;
  onPerformCheckIn: (type: 'daily' | 'weekly') => Promise<CheckInAnalysis>;
}

// Backdrop animation
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

// Modal content animation
const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
};

const modalTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.2,
};

export function CheckInModal({
  type,
  isOpen,
  onClose,
  onPerformCheckIn,
}: CheckInModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CheckInAnalysis | null>(null);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      const result = await onPerformCheckIn(type);
      setAnalysis(result);
    } catch (error) {
      console.error('Check-in failed:', error);
      alert('Failed to perform check-in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setAnalysis(null);
    onClose();
  };

  const typeLabel = type === 'daily' ? 'Daily' : 'Weekly';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
          onClick={handleClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={modalTransition}
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[var(--card)] border-[var(--border)] shadow-xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--foreground)]">
                {type === 'daily' ? <Calendar size={24} className="text-[var(--primary)]" /> : <TrendingUp size={24} className="text-[var(--primary)]" />}
                {typeLabel} Check-In
              </h2>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Review your progress and get AI-powered insights
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              disabled={isLoading}
            >
              <X size={20} />
            </button>
          </div>

          {!analysis && !isLoading && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30">
                <p className="text-sm mb-3 text-[var(--foreground)]">
                  {type === 'daily'
                    ? "Let's review your workout from today and see how you're progressing."
                    : "Let's analyze your entire week of training and identify areas for improvement."}
                </p>
                <ul className="text-sm space-y-2 list-disc list-inside text-[var(--muted-foreground)]">
                  <li>Analyze adherence and completion rate</li>
                  <li>Review average intensity (RPE) and volume</li>
                  <li>Get personalized insights from our AI coach</li>
                </ul>
              </div>

              <Button
                onClick={handleCheckIn}
                className="w-full py-6 text-base"
              >
                Start {typeLabel} Check-In
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[var(--border)] border-t-[var(--primary)] mb-4"></div>
              <p className="animate-pulse text-sm text-[var(--muted-foreground)]">
                Analyzing your progress...
              </p>
            </div>
          )}

          {analysis && !isLoading && (
            <div className="space-y-6">
              {/* Metrics Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl p-3 border border-[var(--border)] bg-[var(--secondary)]/20 text-center">
                  <p className="text-[10px] uppercase mb-1 text-[var(--muted-foreground)] font-bold">Completed</p>
                  <p className="text-xl font-bold font-mono text-[var(--primary)]">
                    {analysis.metrics.sessionsCompleted}
                  </p>
                </div>
                <div className="rounded-xl p-3 border border-[var(--border)] bg-[var(--secondary)]/20 text-center">
                  <p className="text-[10px] uppercase mb-1 text-[var(--muted-foreground)] font-bold">Planned</p>
                  <p className="text-xl font-bold font-mono text-[var(--foreground)]">
                    {analysis.metrics.sessionsPlanned}
                  </p>
                </div>
                <div className="rounded-xl p-3 border border-[var(--border)] bg-[var(--secondary)]/20 text-center">
                  <p className="text-[10px] uppercase mb-1 text-[var(--muted-foreground)] font-bold">Adherence</p>
                  <p className="text-xl font-bold font-mono text-[var(--primary)]">
                    {(analysis.metrics.adherenceRate * 100).toFixed(0)}%
                  </p>
                </div>
                {analysis.metrics.averageRPE && (
                  <div className="rounded-xl p-3 border border-[var(--border)] bg-[var(--secondary)]/20 text-center">
                    <p className="text-[10px] uppercase mb-1 text-[var(--muted-foreground)] font-bold">Avg RPE</p>
                    <p className="text-xl font-bold font-mono text-[var(--foreground)]">
                      {analysis.metrics.averageRPE.toFixed(1)}
                    </p>
                  </div>
                )}
              </div>

              {/* Insights */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-[var(--foreground)]">
                  <TrendingUp size={16} />
                  Key Insights
                </h3>
                <div className="space-y-2">
                  {analysis.insights.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)] bg-[var(--background)]"
                    >
                      <CheckCircle size={16} className="shrink-0 mt-0.5 text-[var(--primary)]" />
                      <p className="text-sm text-[var(--foreground)]">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}