import { Calendar } from 'lucide-react';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  label?: string;
  className?: string;
}

export function DatePicker({ value, onChange, label, className = '' }: DatePickerProps) {
  // Convert ISO string to YYYY-MM-DD for input
  const inputValue = value ? value.split('T')[0] : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert to ISO string
    const dateValue = e.target.value;
    if (dateValue) {
      const isoString = new Date(dateValue + 'T00:00:00').toISOString();
      onChange(isoString);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="date"
          value={inputValue}
          onChange={handleChange}
          className="
            w-full px-4 py-2 pl-10 bg-zinc-800 border border-zinc-700
            rounded-lg text-zinc-200
            focus:outline-none focus:border-lime-400 focus:ring-1 focus:ring-lime-400
            cursor-pointer
          "
        />
        <Calendar
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
        />
      </div>
    </div>
  );
}
