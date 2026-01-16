import { useState } from 'react';
import { X, AlertTriangle, Zap, Battery, Calendar, TrendingUp, MessageSquare } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import type { FeedbackCategory } from '@/types';

interface WorkoutFeedbackModalProps {
  weekNumber: number;
  dayNumber: number;
  sessionFocus: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categories: FeedbackCategory[], feedbackText: string) => Promise<void>;
}

const feedbackOptions: { category: FeedbackCategory; label: string; icon: any; color: string }[] = [
  {
    category: 'injury',
    label: 'Injury/Pain',
    icon: AlertTriangle,
    color: 'text-red-400',
  },
  {
    category: 'muscle_fatigue',
    label: 'Muscle Fatigue',
    icon: Battery,
    color: 'text-orange-400',
  },
  {
    category: 'excessive_soreness',
    label: 'Excessive Soreness',
    icon: AlertTriangle,
    color: 'text-yellow-400',
  },
  {
    category: 'low_energy',
    label: 'Low Energy',
    icon: Battery,
    color: 'text-blue-400',
  },
  {
    category: 'schedule_conflict',
    label: 'Schedule Conflict',
    icon: Calendar,
    color: 'text-purple-400',
  },
  {
    category: 'feeling_strong',
    label: 'Feeling Strong',
    icon: TrendingUp,
    color: 'text-lime-400',
  },
  {
    category: 'other',
    label: 'Other',
    icon: MessageSquare,
    color: 'text-zinc-400',
  },
];

export function WorkoutFeedbackModal({
  weekNumber,
  dayNumber,
  sessionFocus,
  isOpen,
  onClose,
  onSubmit,
}: WorkoutFeedbackModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<FeedbackCategory[]>([]);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleCategory = (category: FeedbackCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      alert('Please select at least one feedback category');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(selectedCategories, feedbackText);
      // Reset and close
      setSelectedCategories([]);
      setFeedbackText('');
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <Card className="w-full max-w-2xl bg-zinc-900 border-zinc-800">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-lime-400">
                Workout Feedback
              </h2>
              <p className="text-zinc-400 mt-1">
                Week {weekNumber}, Day {dayNumber} - {sessionFocus}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>

          {/* Instructions */}
          <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <p className="text-sm text-zinc-300">
              Select all that apply to help us adjust your workout accordingly.
              Our AI coach will analyze your feedback and modify today's session
              to better match your current state.
            </p>
          </div>

          {/* Category Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              How are you feeling?
            </label>
            <div className="grid grid-cols-2 gap-3">
              {feedbackOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedCategories.includes(option.category);

                return (
                  <button
                    key={option.category}
                    onClick={() => toggleCategory(option.category)}
                    disabled={isSubmitting}
                    className={`
                      flex items-center gap-3 p-4 rounded-lg border-2 transition-all
                      ${
                        isSelected
                          ? 'border-lime-400 bg-lime-400/10'
                          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Icon
                      size={20}
                      className={isSelected ? 'text-lime-400' : option.color}
                    />
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? 'text-lime-400' : 'text-zinc-300'
                      }`}
                    >
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Text Feedback */}
          <div className="mb-6">
            <label
              htmlFor="feedback-text"
              className="block text-sm font-medium text-zinc-300 mb-2"
            >
              Additional Details (Optional)
            </label>
            <textarea
              id="feedback-text"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              disabled={isSubmitting}
              placeholder="Provide any additional context about how you're feeling or what adjustments you'd like..."
              className="
                w-full h-24 px-4 py-3 bg-zinc-800 border border-zinc-700
                rounded-lg text-zinc-200 placeholder:text-zinc-500
                focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400
                disabled:opacity-50 disabled:cursor-not-allowed
                resize-none
              "
              maxLength={500}
            />
            <p className="text-xs text-zinc-500 mt-1">
              {feedbackText.length}/500 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || selectedCategories.length === 0}
              className="flex-1 bg-lime-500 hover:bg-lime-600 text-zinc-950 font-semibold"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Zap size={16} className="animate-pulse" />
                  Analyzing...
                </span>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
