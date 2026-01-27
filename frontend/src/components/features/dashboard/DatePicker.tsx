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
        <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type="date"
          value={inputValue}
          onChange={handleChange}
          className="
            w-full h-10 px-4 py-2 pl-10 bg-white border border-[#D1D5DB]
            rounded-lg text-sm font-normal text-[#1A1A1A]
            hover:border-[#9CA3AF]
            focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20
            cursor-pointer transition-all duration-150
          "
        />
        <Calendar
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
        />
      </div>
    </div>
  );
}
