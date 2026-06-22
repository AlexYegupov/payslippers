"use client";

import { useEffect, useState, useCallback } from "react";
import { getRateHistory, type RateWithCategory } from "@/server/actions/rates";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/format";

interface RateHistoryFormProps {
  historyRate: RateWithCategory;
  employeeId: number;
  selectedEmployeeName: string;
  onClose: () => void;
}

export function RateHistoryForm({
  historyRate,
  employeeId,
  selectedEmployeeName,
  onClose,
}: RateHistoryFormProps) {
  const [historyData, setHistoryData] = useState<RateWithCategory["rate"][]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const history = await getRateHistory(
          employeeId,
          historyRate.category.id,
        );
        setHistoryData(history);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch rate history",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [employeeId, historyRate.category.id]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full border border-zinc-200 dark:border-zinc-800 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Rate History
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              {selectedEmployeeName} / {historyRate.category.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          ) : historyData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-600 dark:text-zinc-400">
                No rate history found for this category
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {historyData.map((rate, index) => {
                if (!rate) return null;
                return (
                  <div
                    key={rate.id}
                    className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                          {formatCurrency(rate.rateCents)}
                        </div>
                        {index === 0 && (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">
                          Effective: {formatDate(rate.effectiveDate)}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-500">
                          {formatRelativeTime(rate.createdAt)}
                        </div>
                      </div>
                    </div>
                    {rate.note && (
                      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 rounded px-3 py-2">
                        <span className="font-medium">Note:</span> {rate.note}
                      </div>
                    )}
                    <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                      Created by user ID: {rate.createdByUserId}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={onClose}
            className="w-full bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
