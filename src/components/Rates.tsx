"use client";

import { useEffect, useState, useTransition } from "react";
import { type Employee } from "./EmployeeSelector";
import {
  getRatesForEmployee,
  createRateEdit,
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

  // Edit rate drawer state
  const [editingRate, setEditingRate] = useState<RateWithCategory | null>(null);
  const [editForm, setEditForm] = useState({
    effectiveDate: "",
    rateCents: 0,
    note: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleEditClick = (rateItem: RateWithCategory) => {
    setEditingRate(rateItem);
    const effectiveDateStr = effectiveDate.toISOString().split("T")[0];
    setEditForm({
      effectiveDate: effectiveDateStr,
      rateCents: rateItem.rate?.rateCents || 0,
      note: "",
    });
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate || !selectedEmployee) return;

    setIsSubmitting(true);
    setEditError(null);

    try {
      // Validate form
      if (editForm.rateCents < 0) {
        throw new Error("Rate cannot be negative");
      }
      if (!editForm.effectiveDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error("Invalid effective date format");
      }

      // Create the rate edit
      await createRateEdit({
        employeeId: selectedEmployee.id,
        paymentCategoryId: editingRate.category.id,
        effectiveDate: editForm.effectiveDate,
        rateCents: editForm.rateCents,
        note: editForm.note || null,
        createdByUserId: 1, // Fixed user for this assignment
      });

      // Show success message
      setSuccessMessage(
        `Rate updated for ${selectedEmployee.name} / ${editingRate.category.name}`,
      );
      setTimeout(() => setSuccessMessage(null), 3000);

      // Close the drawer
      setEditingRate(null);

      // Refresh rates
      const effectiveDateStr = effectiveDate.toISOString().split("T")[0];
      const data = await getRatesForEmployee(
        selectedEmployee.id,
        effectiveDateStr,
      );
      setRates(data);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update rate",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRate(null);
    setEditError(null);
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
      {/* Success message toast */}
      {successMessage && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-sm text-green-800 dark:text-green-200">
            {successMessage}
          </span>
        </div>
      )}

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
                          onClick={() => handleEditClick(item)}
                          title={item.rate ? "Edit rate" : "Add new rate"}
                        >
                          {item.rate ? "Edit" : "Add"}
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

      {/* Edit Rate Drawer */}
      {editingRate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {editingRate.rate ? "Edit rate" : "Add rate"} for{" "}
                {selectedEmployee?.name} / {editingRate.category.name}
              </h3>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {editError}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Effective date
                </label>
                <input
                  type="date"
                  value={editForm.effectiveDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, effectiveDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                {editForm.effectiveDate !==
                  effectiveDate.toISOString().split("T")[0] && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    This edit will start on {editForm.effectiveDate} and may
                    change older payslips.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  New rate
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.rateCents / 100}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        rateCents: Math.round(parseFloat(e.target.value) * 100),
                      })
                    }
                    className="w-full pl-7 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Note{" "}
                  <span className="text-zinc-500 dark:text-zinc-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={editForm.note}
                  onChange={(e) =>
                    setEditForm({ ...editForm, note: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  maxLength={500}
                  placeholder="Optional note for this change"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {isSubmitting ? "Saving..." : "Save rate edit"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSubmitting}
                  className="flex-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
