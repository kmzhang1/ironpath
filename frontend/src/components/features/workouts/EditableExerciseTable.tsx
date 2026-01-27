import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppStore } from '@/store';
import { calculateWorkingWeight, matchExerciseToLift } from '@/utils/liftingMath';
import { Edit2 } from 'lucide-react';
import { ExerciseEditModal } from './ExerciseEditModal';

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
}

export function EditableExerciseTable({ weekNumber, dayNumber, exercises }: Props) {
  const { profile, updateExercise } = useAppStore();
  const [editingCell, setEditingCell] = useState<{ exerciseIdx: number; field: string; value: any; label: string } | null>(null);

  const getCalculatedWeight = (exercise: Exercise): string => {
    if (!profile) return '-';
    const liftCategory = matchExerciseToLift(exercise.name);
    if (!liftCategory) return '-';
    const reps = parseInt(exercise.reps.match(/(\d+)/)?.[1] || '0', 10);
    return `${calculateWorkingWeight(profile.oneRepMax[liftCategory], reps, exercise.rpeTarget)} ${profile.biometrics.unit}`;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Exercise</TableHead>
              <TableHead className="text-center">Sets</TableHead>
              <TableHead className="text-center">Reps</TableHead>
              <TableHead className="text-center">RPE</TableHead>
              <TableHead className="text-center">Load</TableHead>
              <TableHead className="text-center">Rest</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exercises.map((exercise, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2" onClick={() => setEditingCell({ exerciseIdx: idx, field: 'name', value: exercise.name, label: 'Name' })}>
                    {exercise.name} <Edit2 className="h-3 w-3 text-muted-foreground opacity-50" />
                  </div>
                </TableCell>
                <TableCell className="text-center">{exercise.sets}</TableCell>
                <TableCell className="text-center">{exercise.reps}</TableCell>
                <TableCell className="text-center font-mono font-bold text-primary">{exercise.rpeTarget}</TableCell>
                <TableCell className="text-center font-mono font-bold">{getCalculatedWeight(exercise)}</TableCell>
                <TableCell className="text-center text-muted-foreground">
                   {Math.floor(exercise.restSeconds / 60)}'{(exercise.restSeconds % 60).toString().padStart(2, '0')}"
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{exercise.notes || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Keeping existing modal logic for now, or replace with Dialog as needed */}
      {editingCell && (
        <ExerciseEditModal
           isOpen={!!editingCell}
           onClose={() => setEditingCell(null)}
           onSave={(field, val) => {
             updateExercise(weekNumber, dayNumber, editingCell.exerciseIdx, { [field]: val });
             setEditingCell(null);
           }}
           field={editingCell.field}
           currentValue={editingCell.value}
           fieldLabel={editingCell.label}
           type={typeof editingCell.value === 'number' ? 'number' : 'text'}
        />
      )}
    </div>
  );
}