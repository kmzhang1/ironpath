import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

interface DatePickerButtonProps {
  value?: string;
  onChange: (date: string, cascadeFutureDates?: boolean) => void;
  className?: string;
  showCascadeOption?: boolean;
}

export function DatePickerButton({
  value,
  onChange,
  className = '',
  showCascadeOption = true,
}: DatePickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [showCascadeDialog, setShowCascadeDialog] = useState(false);

  // Convert ISO string to Date object
  const selectedDate = value ? new Date(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;

    // If there's no existing date or cascade option is disabled, just save directly
    if (!selectedDate || !showCascadeOption) {
      onChange(date.toISOString(), false);
      setIsOpen(false);
      return;
    }

    // Check if the date actually changed
    const oldDateStr = selectedDate.toDateString();
    const newDateStr = date.toDateString();
    if (oldDateStr === newDateStr) {
      setIsOpen(false);
      return;
    }

    // Store the pending date and show cascade confirmation dialog
    setPendingDate(date);
    setIsOpen(false);
    setShowCascadeDialog(true);
  };

  const handleCascadeConfirm = (cascade: boolean) => {
    if (pendingDate) {
      onChange(pendingDate.toISOString(), cascade);
    }
    setPendingDate(null);
    setShowCascadeDialog(false);
  };

  const handleCascadeCancel = () => {
    setPendingDate(null);
    setShowCascadeDialog(false);
  };

  // Format the button text to show month/date when available
  const buttonText = selectedDate
    ? format(selectedDate, 'MMM d')
    : '';

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 gap-2 ${className}`}
          >
            <CalendarIcon className="h-4 w-4" />
            {buttonText && <span className="text-xs">{buttonText}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
          />
        </PopoverContent>
      </Popover>

      {/* Cascade Date Confirmation Dialog */}
      <Dialog open={showCascadeDialog} onOpenChange={setShowCascadeDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Update Future Workout Dates?</DialogTitle>
            <DialogDescription>
              You changed this workout from{' '}
              <strong>{selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'unscheduled'}</strong>
              {' '}to{' '}
              <strong>{pendingDate ? format(pendingDate, 'MMM d, yyyy') : ''}</strong>.
              <br /><br />
              Would you like to shift all future workout dates by the same amount?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCascadeCancel}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => handleCascadeConfirm(false)}>
              This Workout Only
            </Button>
            <Button onClick={() => handleCascadeConfirm(true)}>
              Update All Future Dates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
