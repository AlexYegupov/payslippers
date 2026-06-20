"use client";

import { useState } from "react";

export interface Employee {
  id: number;
  name: string;
  birthday: string;
}

interface EmployeeSelectorProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  onEmployeeChange: (employee: Employee | null) => void;
}

export function EmployeeSelector({
  employees,
  selectedEmployee,
  onEmployeeChange,
}: EmployeeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (employee: Employee | null) => {
    onEmployeeChange(employee);
    setIsOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-3">
        <label htmlFor="employee-select" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Employee:
        </label>
        <div className="relative">
          <button
            id="employee-select"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors min-w-[200px] justify-between"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span>{selectedEmployee ? selectedEmployee.name : "Select employee"}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-800 z-20 max-h-60 overflow-auto">
                <ul
                  role="listbox"
                  className="py-1"
                >
                  {employees.length === 0 ? (
                    <li className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                      No employees available
                    </li>
                  ) : (
                    employees.map((employee) => (
                      <li
                        key={employee.id}
                        role="option"
                        aria-selected={selectedEmployee?.id === employee.id}
                        onClick={() => handleSelect(employee)}
                        className={`px-4 py-2 text-sm cursor-pointer transition-colors ${
                          selectedEmployee?.id === employee.id
                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {employee.name}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
