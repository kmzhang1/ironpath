import { useState } from 'react';
import { X, TrendingUp, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import type { CheckInAnalysis } from '@/types';

interface CheckInModalProps {
  type: 'daily' | 'weekly';
  isOpen: boolean;
  onClose: () => void;
  onPerformCheckIn: (type: 'daily' | 'weekly') => Promise<CheckInAnalysis>;
}

export function CheckInModal({
  type,
  isOpen,
  onClose,
  onPerformCheckIn,
}: CheckInModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<CheckInAnalysis | null>(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="w-full max-w-3xl bg-zinc-900 border-zinc-800 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-lime-400 flex items-center gap-2">
                {type === 'daily' ? <Calendar size={28} /> : <TrendingUp size={28} />}
                {typeLabel} Check-In
              </h2>
              <p className="text-zinc-400 mt-1">
                Review your progress and get AI-powered insights
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
              disabled={isLoading}
            >
              <X size={24} />
            </button>
          </div>

          {!analysis && !isLoading && (
            <>
              {/* Info */}
              <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <p className="text-sm text-zinc-300 mb-3">
                  {type === 'daily'
                    ? "Let's review your workout from today and see how you're progressing."
                    : "Let's analyze your entire week of training and identify areas for improvement."}
                </p>
                <ul className="text-sm text-zinc-400 space-y-1 list-disc list-inside">
                  <li>Analyze adherence and completion rate</li>
                  <li>Review average intensity (RPE) and volume</li>
                  <li>Get personalized insights from our AI coach</li>
                  <li>Receive recommendations for upcoming workouts</li>
                  {type === 'weekly' && (
                    <li>Determine if program adjustments are needed</li>
                  )}
                </ul>
              </div>

              {/* Start Button */}
              <Button
                onClick={handleCheckIn}
                className="w-full bg-lime-500 hover:bg-lime-600 text-zinc-950 font-semibold py-4"
              >
                Start {typeLabel} Check-In
              </Button>
            </>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-zinc-700 border-t-lime-400 mb-4"></div>
              <p className="text-zinc-400 animate-pulse">
                Analyzing your progress...
              </p>
            </div>
          )}

          {analysis && !isLoading && (
            <div className="space-y-6">
              {/* Metrics Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase mb-1">Completed</p>
                  <p className="text-2xl font-bold text-lime-400 font-mono">
                    {analysis.metrics.sessionsCompleted}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">sessions</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase mb-1">Planned</p>
                  <p className="text-2xl font-bold text-zinc-300 font-mono">
                    {analysis.metrics.sessionsPlanned}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">sessions</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                  <p className="text-xs text-zinc-500 uppercase mb-1">Adherence</p>
                  <p className="text-2xl font-bold text-lime-400 font-mono">
                    {(analysis.metrics.adherenceRate * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">completion</p>
                </div>
                {analysis.metrics.averageRPE && (
                  <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <p className="text-xs text-zinc-500 uppercase mb-1">Avg RPE</p>
                    <p className="text-2xl font-bold text-zinc-300 font-mono">
                      {analysis.metrics.averageRPE.toFixed(1)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">intensity</p>
                  </div>
                )}
              </div>

              {/* Insights */}
              <div>
                <h3 className="text-lg font-semibold text-lime-400 mb-3 flex items-center gap-2">
                  <TrendingUp size={20} />
                  Key Insights
                </h3>
                <div className="space-y-2">
                  {analysis.insights.map((insight, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                    >
                      <CheckCircle size={20} className="text-lime-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-zinc-300">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="text-lg font-semibold text-lime-400 mb-3 flex items-center gap-2">
                  <TrendingUp size={20} />
                  Recommendations
                </h3>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                    >
                      <CheckCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-zinc-300">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Program Adjustments Warning */}
              {analysis.programAdjustmentsNeeded && (
                <div className="p-4 bg-yellow-500/10 rounded-lg border-2 border-yellow-500/50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={24} className="text-yellow-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-yellow-400 font-semibold mb-1">
                        Program Adjustments Recommended
                      </h4>
                      <p className="text-sm text-zinc-300">
                        Based on your recent progress and feedback, we recommend adjusting
                        your training program. Consider reviewing your current plan with
                        these insights in mind.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Close Button */}
              <Button
                onClick={handleClose}
                className="w-full bg-lime-500 hover:bg-lime-600 text-zinc-950 font-semibold"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
