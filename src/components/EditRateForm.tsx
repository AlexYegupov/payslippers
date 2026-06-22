"use client";

import { useState, useEffect, useCallback } from "react";
import {
  createRateEdit,
  getRatesForEmployee,
  type RateWithCategory,
} from "@/server/actions/rates";
import { dateToISOString } from "@/lib/format";

interface EditRateFormProps {
  editingRate: RateWithCategory;
  employeeId: number;
  selectedEmployeeName: string;
  effectiveDate: Date;
  onCancel: () => void;
  onSuccess: (message: string) => void;
  onRatesRefresh: () => void;
}

export function EditRateForm({
  editingRate,
  employeeId,
  selectedEmployeeName,
  effectiveDate,
  onCancel,
  onSuccess,
  onRatesRefresh,
}: EditRateFormProps) {
  const [effectiveDateStr, setEffectiveDateStr] = useState(
    dateToISOString(effectiveDate),
  );
  const [rateCents, setRateCents] = useState(editingRate.rate?.rateCents || 0);
  const [note, setNote] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    },
    [onCancel, isSubmitting],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setEditError(null);

    try {
      if (rateCents < 0) {
        throw new Error("Rate cannot be negative");
      }
      if (!effectiveDateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        throw new Error("Invalid effective date format");
      }

      await createRateEdit({
        employeeId,
        paymentCategoryId: editingRate.category.id,
        effectiveDate: effectiveDateStr,
        rateCents,
        note: note || null,
        createdByUserId: 1,
      });

      onSuccess(
        `Rate updated for ${selectedEmployeeName} / ${editingRate.category.name}`,
      );

      const currentEffectiveDateStr = dateToISOString(effectiveDate);
      await getRatesForEmployee(employeeId, currentEffectiveDateStr);
      onRatesRefresh();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update rate",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full border border-zinc-200 dark:border-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {editingRate.rate ? "Edit rate" : "Add rate"} for{" "}
            {selectedEmployeeName} / {editingRate.category.name}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              value={effectiveDateStr}
              onChange={(e) => setEffectiveDateStr(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {effectiveDateStr !== dateToISOString(effectiveDate) && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                This edit will start on {effectiveDateStr} and may change older
                payslips.
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
                value={rateCents / 100}
                onChange={(e) =>
                  setRateCents(
                    e.target.value === ""
                      ? 0
                      : Math.round(parseFloat(e.target.value) * 100),
                  )
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
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
