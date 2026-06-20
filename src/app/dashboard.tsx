"use client";

import { useState, useEffect } from "react";
import { DateNavigation } from "@/components/DateNavigation";
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

  // Update selected employee when employees list changes
  useEffect(() => {
    if (employees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(employees[0]);
    }
  }, [employees, selectedEmployee]);

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

      <Rates
        selectedEmployee={selectedEmployee}
        effectiveDate={effectiveDate}
      />

      <Payslips selectedEmployee={selectedEmployee} />
    </div>
  );
}
