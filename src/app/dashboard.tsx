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
      <EmployeeSelector
        employees={employees}
        selectedEmployee={selectedEmployee}
        onEmployeeChange={setSelectedEmployee}
      />

      <Rates
        selectedEmployee={selectedEmployee}
        effectiveDate={effectiveDate}
        onDateChange={setEffectiveDate}
        onRatesChange={handleRatesChange}
      />

      <Payslips
        selectedEmployee={selectedEmployee}
        refreshKey={payslipRefreshKey}
      />
    </div>
  );
}
