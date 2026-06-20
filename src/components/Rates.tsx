"use client";

import { useEffect, useState, useTransition } from "react";
import { type Employee } from "./EmployeeSelector";
import {
  getRatesForEmployee,
  type RateWithCategory,
} from "@/server/actions/rates";

interface RatesProps {
  selectedEmployee: Employee | null;
  effectiveDate: Date;
}

export function Rates({ selectedEmployee, effectiveDate }: RatesProps) {
  const [rates, setRates] = useState<RateWithCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedEmployee) {
      setRates([]);
      return;
    }

    const fetchRates = () => {
      setLoading(true);
      setError(null);

      const effectiveDateStr = effectiveDate.toISOString().split("T")[0];

      startTransition(async () => {
        try {
          const data = await getRatesForEmployee(
            selectedEmployee.id,
            effectiveDateStr,
          );
          setRates(data);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to fetch rates",
          );
        } finally {
          setLoading(false);
        }
      });
    };

    fetchRates();
  }, [selectedEmployee, effectiveDate]);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  if (!selectedEmployee) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8">
          <p className="text-zinc-600 dark:text-zinc-400 text-center">
            Please select an employee to view their rates
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8">
          <p className="text-red-600 dark:text-red-400 text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Rates
          </h2>
        </div>

        {rates.length === 0 ? (
          <div className="p-8">
            <p className="text-zinc-600 dark:text-zinc-400 text-center">
              No rates found for this employee on the selected date
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Effective from
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Last edit
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {rates.map((item) => (
                  <tr
                    key={item.category.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {item.category.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.rate ? (
                        <div className="text-sm text-zinc-900 dark:text-zinc-50 font-mono">
                          {formatCurrency(item.rate.rateCents)}
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                          No rate set
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.rate ? (
                        <div className="text-sm text-zinc-900 dark:text-zinc-50">
                          {formatDate(item.rate.effectiveDate)}
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.rate ? (
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          {formatRelativeTime(item.rate.createdAt)}
                          <span className="ml-1 text-amber-600 dark:text-amber-400">
                            *
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                          disabled={!item.rate}
                          title={!item.rate ? "No rate to edit" : "Edit rate"}
                        >
                          Edit
                        </button>
                        <button
                          className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
                          title="View history"
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
