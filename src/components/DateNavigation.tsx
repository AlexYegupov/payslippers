"use client";

interface DateNavigationProps {
  effectiveDate: Date;
  onDateChange: (date: Date) => void;
}

export function DateNavigation({
  effectiveDate,
  onDateChange,
}: DateNavigationProps) {
  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${day}/${year}`;
  };

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

  const isFuture = effectiveDate > new Date();

  return (
    <div className="sticky top-0 z-50 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Title */}
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            Payslippers
          </h1>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleMonthChange(-1)}
              className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Previous month"
            >
              -month
            </button>
            <button
              onClick={() => handleDayChange(-1)}
              className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Previous day"
            >
              -day
            </button>

            <div className="relative">
              <input
                type="date"
                value={effectiveDate.toISOString().split("T")[0]}
                onChange={handleDateInput}
                className="px-4 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                aria-label="Effective date"
              />
            </div>

            <button
              onClick={() => handleDayChange(1)}
              className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Next day"
            >
              +day
            </button>
            <button
              onClick={() => handleMonthChange(1)}
              className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Next month"
            >
              +month
            </button>

            <button
              onClick={handleToday}
              className="px-4 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              aria-label="Today"
            >
              Today
            </button>
          </div>
        </div>

        {/* Warning for future dates */}
        {isFuture && (
          <div className="pb-2">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Future date selected. New rate edits will start in the future.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
