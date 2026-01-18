import { useState } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { ExerciseEditModal } from './ExerciseEditModal';
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
  const [editingCell, setEditingCell] = useState<{
    exerciseIdx: number;
    field: string;
    value: any;
    label: string;
    type: 'text' | 'number';
  } | null>(null);

  const handleEdit = (exerciseIdx: number, field: string, value: any, label: string, type: 'text' | 'number' = 'text') => {
    setEditingCell({ exerciseIdx, field, value, label, type });
  };

  const handleSave = (field: string, value: any) => {
    if (editingCell && value !== undefined) {
      updateExercise(weekNumber, dayNumber, editingCell.exerciseIdx, { [field]: value });
    }
    setEditingCell(null);
  };

  const handleCloseModal = () => {
    setEditingCell(null);
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
    label: string,
    type: 'text' | 'number' = 'text'
  ) => {
    return (
      <div
        className="flex items-center gap-2 cursor-pointer group hover:bg-zinc-800/50 px-2 py-1 rounded transition-all"
        onClick={() => handleEdit(exerciseIdx, field, value, label, type)}
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
                  {renderEditableCell(idx, 'name', exercise.name, 'Exercise Name')}
                </td>
                <td className="py-3 px-4 text-sm text-center">
                  {renderEditableCell(idx, 'sets', exercise.sets, 'Sets', 'number')}
                </td>
                <td className="py-3 px-4 text-sm text-center">
                  {renderEditableCell(idx, 'reps', exercise.reps, 'Reps')}
                </td>
                <td className="py-3 px-4 text-sm text-center">
                  {renderEditableCell(idx, 'rpeTarget', exercise.rpeTarget, 'RPE', 'number')}
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
                      .padStart(2, '0')}"`,
                    'Rest Time'
                  )}
                </td>
                <td className="py-3 pl-4 text-sm text-zinc-500">
                  {renderEditableCell(idx, 'notes', exercise.notes || '-', 'Notes')}
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

      {/* Edit Modal */}
      {editingCell && (
        <ExerciseEditModal
          isOpen={!!editingCell}
          onClose={handleCloseModal}
          onSave={handleSave}
          field={editingCell.field}
          currentValue={editingCell.value}
          fieldLabel={editingCell.label}
          type={editingCell.type}
        />
      )}
    </div>
  );
}
