import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { useAppStore } from '@/store';
import { calculateWorkingWeight, matchExerciseToLift } from '@/utils/liftingMath';
import { Edit2, Save, X, CheckCircle } from 'lucide-react';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  rpeTarget: number;
  restSeconds: number;
  notes?: string;
}

interface Props {
  weekNumber: number;
  dayNumber: number;
  exercises: Exercise[];
  sessionCompleted?: boolean;
  onCompleteSession?: () => void;
}

export function EditableExerciseTable({ weekNumber, dayNumber, exercises, sessionCompleted, onCompleteSession }: Props) {
  const { profile, updateExercise } = useAppStore();
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  const handleEdit = (exerciseIdx: number, field: string, value: any) => {
    const key = `${exerciseIdx}-${field}`;
    setEditingCell(key);
    setEditValues({ ...editValues, [key]: value });
  };

  const handleSave = (exerciseIdx: number, field: string) => {
    const key = `${exerciseIdx}-${field}`;
    const value = editValues[key];

    if (value !== undefined) {
      updateExercise(weekNumber, dayNumber, exerciseIdx, { [field]: value });
    }

    setEditingCell(null);
    delete editValues[key];
  };

  const handleCancel = (exerciseIdx: number, field: string) => {
    const key = `${exerciseIdx}-${field}`;
    setEditingCell(null);
    delete editValues[key];
  };

  const getCalculatedWeight = (exercise: Exercise): string => {
    if (!profile) return 'N/A';

    const liftCategory = matchExerciseToLift(exercise.name);
    if (!liftCategory) return 'N/A';

    const oneRepMax = profile.oneRepMax[liftCategory];
    const repsMatch = exercise.reps.match(/(\d+)/);

    if (!repsMatch) return 'N/A';

    const reps = parseInt(repsMatch[1], 10);
    const weight = calculateWorkingWeight(oneRepMax, reps, exercise.rpeTarget);

    return `${weight} ${profile.biometrics.unit}`;
  };

  const renderEditableCell = (
    exerciseIdx: number,
    field: string,
    value: any,
    type: 'text' | 'number' = 'text'
  ) => {
    const key = `${exerciseIdx}-${field}`;
    const isEditing = editingCell === key;

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <Input
            type={type}
            value={editValues[key] ?? value}
            onChange={(e) =>
              setEditValues({
                ...editValues,
                [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value,
              })
            }
            className="h-7 w-20 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave(exerciseIdx, field);
              if (e.key === 'Escape') handleCancel(exerciseIdx, field);
            }}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => handleSave(exerciseIdx, field)}
          >
            <Save className="h-3 w-3 text-lime-400" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => handleCancel(exerciseIdx, field)}
          >
            <X className="h-3 w-3 text-zinc-400" />
          </Button>
        </div>
      );
    }

    return (
      <div
        className="flex items-center gap-2 cursor-pointer group hover:bg-zinc-800/50 px-2 py-1 rounded"
        onClick={() => handleEdit(exerciseIdx, field, value)}
      >
        <span className={field === 'rpeTarget' || field === 'sets' ? 'font-mono text-lime-400' : ''}>
          {value}
        </span>
        <Edit2 className="h-3 w-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left">
              <th className="pb-2 pr-4 text-sm font-medium text-zinc-400">Exercise</th>
              <th className="pb-2 px-4 text-sm font-medium text-zinc-400 text-center">Sets</th>
              <th className="pb-2 px-4 text-sm font-medium text-zinc-400 text-center">Reps</th>
              <th className="pb-2 px-4 text-sm font-medium text-zinc-400 text-center">RPE</th>
              <th className="pb-2 px-4 text-sm font-medium text-zinc-400 text-center">Weight</th>
              <th className="pb-2 px-4 text-sm font-medium text-zinc-400 text-center">Rest</th>
              <th className="pb-2 pl-4 text-sm font-medium text-zinc-400">Notes</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map((exercise, idx) => (
              <tr key={idx} className="border-b border-zinc-800 last:border-0">
                <td className="py-3 pr-4 text-sm text-zinc-50">
                  {renderEditableCell(idx, 'name', exercise.name)}
                </td>
                <td className="py-3 px-4 text-sm text-center">
                  {renderEditableCell(idx, 'sets', exercise.sets, 'number')}
                </td>
                <td className="py-3 px-4 text-sm text-center">
                  {renderEditableCell(idx, 'reps', exercise.reps)}
                </td>
                <td className="py-3 px-4 text-sm text-center">
                  {renderEditableCell(idx, 'rpeTarget', exercise.rpeTarget, 'number')}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-lime-400 text-center">
                  {getCalculatedWeight(exercise)}
                </td>
                <td className="py-3 px-4 text-sm text-zinc-400 text-center">
                  {renderEditableCell(
                    idx,
                    'restSeconds',
                    `${Math.floor(exercise.restSeconds / 60)}'${(exercise.restSeconds % 60)
                      .toString()
                      .padStart(2, '0')}"`
                  )}
                </td>
                <td className="py-3 pl-4 text-sm text-zinc-500">
                  {renderEditableCell(idx, 'notes', exercise.notes || '-')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onCompleteSession && (
        <div className="flex justify-end pt-4 border-t border-zinc-800">
          <Button
            onClick={onCompleteSession}
            disabled={sessionCompleted}
            className="gap-2"
          >
            {sessionCompleted ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Session Completed
              </>
            ) : (
              'Mark Session Complete'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
