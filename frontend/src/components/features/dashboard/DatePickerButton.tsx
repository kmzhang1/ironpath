import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface DatePickerButtonProps {
  value?: string;
  onChange: (date: string) => void;
  className?: string;
}

export function DatePickerButton({ value, onChange, className = '' }: DatePickerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Convert ISO string to Date object
  const selectedDate = value ? new Date(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date.toISOString());
      setIsOpen(false);
    }
  };

  // Format the button text to show month/date when available
  const buttonText = selectedDate
    ? format(selectedDate, 'MMM d')
    : '';

  return (
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
  );
}
