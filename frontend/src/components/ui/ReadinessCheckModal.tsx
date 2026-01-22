import { useState } from 'react';
import { Button } from './Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { Label } from './Label';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { submitReadinessCheck } from '@/services/api';
import type { ReadinessCheckResponse } from '@/types';

interface ReadinessCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  programId: string;
  weekNumber: number;
  dayNumber: number;
  onComplete: (response: ReadinessCheckResponse) => void;
}

export function ReadinessCheckModal({
  isOpen,
  onClose,
  userId,
  programId,
  weekNumber,
  dayNumber,
  onComplete,
}: ReadinessCheckModalProps) {
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [sorenessFatigue, setSorenessFatigue] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ReadinessCheckResponse | null>(null);

  if (!isOpen) return null;

  const isFormValid = sleepQuality !== null && stressLevel !== null && sorenessFatigue !== null;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const response = await submitReadinessCheck({
        userId,
        programId,
        weekNumber,
        dayNumber,
        sleepQuality: sleepQuality!,
        stressLevel: stressLevel!,
        sorenessFatigue: sorenessFatigue!,
      });

      setResult(response);
    } catch (error) {
      console.error('Failed to submit readiness check:', error);
      alert('Failed to submit readiness check. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptAdjustment = () => {
    if (result) {
      onComplete(result);
      onClose();
    }
  };

  const handleContinueAsPlanned = () => {
    if (result) {
      onComplete({ ...result, shouldAdjustWorkout: false });
      onClose();
    }
  };

  const renderRatingButtons = (
    value: number | null,
    onChange: (value: number) => void,
    labels: { [key: number]: string }
  ) => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              value === n
                ? 'bg-lime-400 text-zinc-900'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Pre-Workout Check</CardTitle>
              <CardDescription>
                Week {weekNumber}, Day {dayNumber}
              </CardDescription>
            </div>
            {!result && (
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
                disabled={isSubmitting}
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!result ? (
            <>
              {/* Sleep Quality */}
              <div className="space-y-2">
                <Label>Sleep Quality</Label>
                {renderRatingButtons(sleepQuality, setSleepQuality, {
                  1: 'Poor',
                  5: 'Excellent',
                })}
                <p className="text-xs text-zinc-500">1 = Poor, 5 = Excellent</p>
              </div>

              {/* Stress Level */}
              <div className="space-y-2">
                <Label>Stress Level</Label>
                {renderRatingButtons(stressLevel, setStressLevel, {
                  1: 'Very Stressed',
                  5: 'Relaxed',
                })}
                <p className="text-xs text-zinc-500">1 = Very Stressed, 5 = Relaxed</p>
              </div>

              {/* Soreness/Fatigue */}
              <div className="space-y-2">
                <Label>Soreness/Fatigue</Label>
                {renderRatingButtons(sorenessFatigue, setSorenessFatigue, {
                  1: 'Extremely Sore',
                  5: 'Fresh',
                })}
                <p className="text-xs text-zinc-500">1 = Extremely Sore, 5 = Fresh</p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Continue Workout'
                )}
              </Button>
            </>
          ) : (
            <>
              {/* Results */}
              <div
                className={`p-4 rounded-md ${
                  result.shouldAdjustWorkout
                    ? 'bg-amber-400/10 border border-amber-400/20'
                    : 'bg-lime-400/10 border border-lime-400/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.shouldAdjustWorkout ? (
                    <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-lime-400 mt-0.5 shrink-0" />
                  )}
                  <div className="space-y-2">
                    <div className="font-medium">
                      Readiness Score: {(result.overallReadiness * 100).toFixed(0)}%
                    </div>
                    <p className="text-sm text-zinc-300">{result.recommendation}</p>
                  </div>
                </div>
              </div>

              {result.shouldAdjustWorkout && (
                <div className="p-4 bg-zinc-800 rounded-md space-y-2">
                  <div className="text-sm font-medium">Recommended Adjustment:</div>
                  <p className="text-sm text-zinc-400">
                    {result.adjustmentType === 'reduce_volume' &&
                      'Reduce sets by 30-40% or switch to a recovery-focused session.'}
                    {result.adjustmentType === 'reduce_intensity' &&
                      'Reduce weight/RPE by 1 point or cut 1-2 sets per exercise.'}
                    {result.adjustmentType === 'recovery_session' &&
                      'Consider a full recovery session with light movement only.'}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                {result.shouldAdjustWorkout ? (
                  <>
                    <Button onClick={handleAcceptAdjustment} className="flex-1">
                      Accept Adjustment
                    </Button>
                    <Button
                      onClick={handleContinueAsPlanned}
                      variant="outline"
                      className="flex-1"
                    >
                      Continue as Planned
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleContinueAsPlanned} className="w-full">
                    Start Workout
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
