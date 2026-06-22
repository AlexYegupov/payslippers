"use client";

import { useState, useEffect, useCallback } from "react";
import { EmployeeSelector, type Employee } from "@/components/EmployeeSelector";
import { Payslips } from "@/components/Payslips";
import { Rates } from "@/components/Rates";

interface DashboardProps {
  employees: Employee[];
}

export function Dashboard({ employees }: DashboardProps) {
  const [effectiveDate, setEffectiveDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    employees.length > 0 ? employees[0] : null,
  );
  const [payslipRefreshKey, setPayslipRefreshKey] = useState(0);

  // Update selected employee when employees list changes
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

  const handleRatesChange = useCallback(() => {
    setPayslipRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="sticky top-0 z-50 bg-white dark:bg-black border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Payslippers 🩴🩴
            </h1>
            <EmployeeSelector
              employees={employees}
              selectedEmployee={selectedEmployee}
              onEmployeeChange={setSelectedEmployee}
            />
          </div>
        </div>
      </header>

      <Rates
        selectedEmployee={selectedEmployee}
        effectiveDate={effectiveDate}
        onDateChange={setEffectiveDate}
        onRatesChange={handleRatesChange}
      />

      <Payslips
        employees={employees}
        selectedEmployee={selectedEmployee}
        onEmployeeChange={setSelectedEmployee}
        refreshKey={payslipRefreshKey}
      />
    </div>
  );
}
