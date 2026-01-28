import { useState, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store';
import { calculateWorkingWeight, matchExerciseToLift } from '@/utils/liftingMath';

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

type EditableField = 'name' | 'sets' | 'reps' | 'rpeTarget' | 'restSeconds' | 'notes';

// Inline editable cell component
function InlineEditableCell({
  value,
  onSave,
  type = 'text',
  className = '',
  placeholder = '-',
  formatDisplay,
  parseInput,
}: {
  value: string | number;
  onSave: (newValue: string | number) => void;
  type?: 'text' | 'number';
  className?: string;
  placeholder?: string;
  formatDisplay?: (val: string | number) => string;
  parseInput?: (val: string) => string | number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edit value when value prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value));
    }
  }, [value, isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    const parsedValue = parseInput ? parseInput(editValue) : (type === 'number' ? parseFloat(editValue) || 0 : editValue);
    if (parsedValue !== value) {
      onSave(parsedValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(String(value));
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      // Allow natural tab behavior but save first
      handleSave();
    }
  };

  const displayValue = formatDisplay ? formatDisplay(value) : (value || placeholder);

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`h-7 px-2 text-sm ${className}`}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-muted/50 rounded px-2 py-1 min-h-7 flex items-center ${className}`}
      title="Click to edit"
    >
      {displayValue}
    </div>
  );
}

export function EditableExerciseTable({ weekNumber, dayNumber, exercises }: Props) {
  const { profile, updateExercise } = useAppStore();

  const getCalculatedWeight = (exercise: Exercise): string => {
    if (!profile) return '-';
    const liftCategory = matchExerciseToLift(exercise.name);
    if (!liftCategory) return '-';
    const reps = parseInt(exercise.reps.match(/(\d+)/)?.[1] || '0', 10);
    return `${calculateWorkingWeight(profile.oneRepMax[liftCategory], reps, exercise.rpeTarget)} ${profile.biometrics.unit}`;
  };

  const handleUpdate = (exerciseIdx: number, field: EditableField, value: string | number) => {
    updateExercise(weekNumber, dayNumber, exerciseIdx, { [field]: value });
  };

  // Format rest time from seconds to MM'SS" display
  const formatRestTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}'${secs.toString().padStart(2, '0')}"`;
  };

  // Parse rest time input - accepts formats like "3:00", "3'00", "180", "3m", etc.
  const parseRestTime = (input: string): number => {
    // Remove whitespace
    input = input.trim();

    // If it's just a number, treat as seconds
    if (/^\d+$/.test(input)) {
      return parseInt(input, 10);
    }

    // Handle MM:SS or MM'SS" format
    const colonMatch = input.match(/^(\d+)[:'"](\d+)/);
    if (colonMatch) {
      return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
    }

    // Handle "Xm" or "Xmin" format
    const minMatch = input.match(/^(\d+)\s*m/i);
    if (minMatch) {
      return parseInt(minMatch[1], 10) * 60;
    }

    // Default: try to parse as number
    return parseInt(input, 10) || 0;
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30%]">Exercise</TableHead>
              <TableHead className="text-center w-[8%]">Sets</TableHead>
              <TableHead className="text-center w-[10%]">Reps</TableHead>
              <TableHead className="text-center w-[8%]">RPE</TableHead>
              <TableHead className="text-center w-[12%]">Load</TableHead>
              <TableHead className="text-center w-[10%]">Rest</TableHead>
              <TableHead className="w-[22%]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exercises.map((exercise, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium p-1">
                  <InlineEditableCell
                    value={exercise.name}
                    onSave={(val) => handleUpdate(idx, 'name', val)}
                    className="font-medium"
                  />
                </TableCell>
                <TableCell className="text-center p-1">
                  <InlineEditableCell
                    value={exercise.sets}
                    onSave={(val) => handleUpdate(idx, 'sets', val)}
                    type="number"
                    className="text-center justify-center"
                  />
                </TableCell>
                <TableCell className="text-center p-1">
                  <InlineEditableCell
                    value={exercise.reps}
                    onSave={(val) => handleUpdate(idx, 'reps', val)}
                    className="text-center justify-center"
                  />
                </TableCell>
                <TableCell className="text-center p-1">
                  <InlineEditableCell
                    value={exercise.rpeTarget}
                    onSave={(val) => handleUpdate(idx, 'rpeTarget', val)}
                    type="number"
                    className="text-center justify-center font-mono font-bold text-primary"
                  />
                </TableCell>
                <TableCell className="text-center font-mono font-bold p-1">
                  <div className="px-2 py-1">{getCalculatedWeight(exercise)}</div>
                </TableCell>
                <TableCell className="text-center p-1">
                  <InlineEditableCell
                    value={exercise.restSeconds}
                    onSave={(val) => handleUpdate(idx, 'restSeconds', val)}
                    className="text-center justify-center text-muted-foreground"
                    formatDisplay={(val) => formatRestTime(Number(val))}
                    parseInput={parseRestTime}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm p-1">
                  <InlineEditableCell
                    value={exercise.notes || ''}
                    onSave={(val) => handleUpdate(idx, 'notes', val)}
                    placeholder="-"
                    className="text-muted-foreground text-sm"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
