"use client";

import { dateToISOString } from "@/lib/format";

interface DateNavigationProps {
  effectiveDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateNavigation({
  effectiveDate,
  onDateChange,
}: DateNavigationProps) {
  const handleMonthChange = (delta: number) => {
    const newDate = new Date(effectiveDate);
    newDate.setMonth(newDate.getMonth() + delta);
    onDateChange(newDate);
  };

  const handleDayChange = (delta: number) => {
    const newDate = new Date(effectiveDate);
    newDate.setDate(newDate.getDate() + delta);
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const handleDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    if (!isNaN(newDate.getTime())) {
      onDateChange(newDate);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => handleMonthChange(-1)}
        className="px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="Previous month"
      >
        {"<< month"}
      </button>
      <button
        onClick={() => handleDayChange(-1)}
        className="px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="Previous day"
      >
        {"< day"}
      </button>

      <input
        type="date"
        value={dateToISOString(effectiveDate)}
        onChange={handleDateInput}
        className="px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
        aria-label="Effective date"
      />

      <button
        onClick={() => handleDayChange(1)}
        className="px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="Next day"
      >
        {"day >"}
      </button>
      <button
        onClick={() => handleMonthChange(1)}
        className="px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="Next month"
      >
        {"month >>"}
      </button>

      <button
        onClick={handleToday}
        className="px-2 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        aria-label="Today"
      >
        Today
      </button>
    </div>
  );
}
