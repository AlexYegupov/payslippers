"use client";

import { useState } from "react";
import { DateNavigation } from "@/components/DateNavigation";
import { EmployeeSelector, type Employee } from "@/components/EmployeeSelector";

interface DashboardProps {
  employees: Employee[];
}

export function Dashboard({ employees }: DashboardProps) {
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <DateNavigation
        effectiveDate={effectiveDate}
        onDateChange={setEffectiveDate}
      />

      <EmployeeSelector
        employees={employees}
        selectedEmployee={selectedEmployee}
        onEmployeeChange={setSelectedEmployee}
      />

      {/* Placeholder for future sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8">
          <p className="text-zinc-600 dark:text-zinc-400 text-center">
            Dashboard content will be added here
          </p>
        </div>
      </div>
    </div>
  );
}
