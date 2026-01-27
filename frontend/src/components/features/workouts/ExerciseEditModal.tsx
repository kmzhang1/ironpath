import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { X, Save } from 'lucide-react';

interface ExerciseEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: string, value: any) => void;
  field: string;
  currentValue: any;
  fieldLabel: string;
  type?: 'text' | 'number';
}

export function ExerciseEditModal({
  isOpen,
  onClose,
  onSave,
  field,
  currentValue,
  fieldLabel,
  type = 'text',
}: ExerciseEditModalProps) {
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue);
  }, [currentValue, isOpen]);

  const handleSave = () => {
    onSave(field, value);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-md p-6 pointer-events-auto animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-zinc-50">Edit {fieldLabel}</h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-value">{fieldLabel}</Label>
              <Input
                id="edit-value"
                type={type}
                value={value}
                onChange={(e) =>
                  setValue(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)
                }
                onKeyDown={handleKeyDown}
                autoFocus
                className="text-base"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-lime-500 hover:bg-lime-600 text-zinc-950"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
