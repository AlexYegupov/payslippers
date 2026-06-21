"use client";

import { useEffect, useState } from "react";
import { type Employee } from "./EmployeeSelector";
import {
  getPayslipsForEmployee,
  getPayslipDetail,
  dismissRateEditForPayslip,
  type PayslipWithDetails,
  type PayslipDetail,
} from "@/server/actions/payslips";

interface PayslipsProps {
  selectedEmployee: Employee | null;
  refreshKey?: number;
}

export function Payslips({ selectedEmployee, refreshKey = 0 }: PayslipsProps) {
  const [payslips, setPayslips] = useState<PayslipWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDetail | null>(
    null,
  );
  const [payslipDetailLoading, setPayslipDetailLoading] = useState(false);
  const [payslipDetailError, setPayslipDetailError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!selectedEmployee) {
      setPayslips([]);
      return;
    }

    const fetchPayslips = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getPayslipsForEmployee(selectedEmployee.id);
        setPayslips(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch payslips",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPayslips();
  }, [selectedEmployee, refreshKey]);

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

  const handleViewClick = async (payslip: PayslipWithDetails) => {
    setPayslipDetailLoading(true);
    setPayslipDetailError(null);

    try {
      const detail = await getPayslipDetail(payslip.id);
      setSelectedPayslip(detail ?? null);
    } catch (err) {
      setPayslipDetailError(
        err instanceof Error ? err.message : "Failed to fetch payslip details",
      );
    } finally {
      setPayslipDetailLoading(false);
    }
  };

  const handleClosePayslipDetail = () => {
    setSelectedPayslip(null);
    setPayslipDetailError(null);
  };

  const handleDismissRateEdit = async (
    payslipId: number,
    rateEditId: number,
  ) => {
    try {
      await dismissRateEditForPayslip(payslipId, rateEditId);
      // Refresh payslips list
      if (selectedEmployee) {
        const data = await getPayslipsForEmployee(selectedEmployee.id);
        setPayslips(data);
      }
      // Refresh detail view if open
      if (selectedPayslip) {
        const detail = await getPayslipDetail(selectedPayslip.id);
        setSelectedPayslip(detail ?? null);
      }
    } catch (err) {
      console.error("Failed to dismiss rate edit:", err);
    }
  };

  if (!selectedEmployee) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8">
          <p className="text-zinc-600 dark:text-zinc-400 text-center">
            Please select an employee to view their payslips
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
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Payslips
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Historical payslips for {selectedEmployee.name}
            </p>
          </div>
        </div>

        {payslips.length === 0 ? (
          <div className="p-8">
            <p className="text-zinc-600 dark:text-zinc-400 text-center">
              No payslips found for this employee
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Original Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Current Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Line Items
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {payslips.map((payslip) => (
                  <tr
                    key={payslip.id}
                    className={`hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
                      payslip.isRetroactivelyChanged
                        ? "bg-amber-50 dark:bg-amber-900/20"
                        : ""
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {payslip.employeeName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {formatDate(payslip.date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-900 dark:text-zinc-50 font-mono">
                        {formatCurrency(payslip.originalTotalCents)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm font-mono font-medium ${
                          payslip.isRetroactivelyChanged
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-zinc-900 dark:text-zinc-50"
                        }`}
                      >
                        {formatCurrency(payslip.currentTotalCents)}
                        {payslip.isRetroactivelyChanged && (
                          <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                            ⚠
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-zinc-600 dark:text-zinc-400">
                        {formatRelativeTime(payslip.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {payslip.lineItems.map((item) => (
                          <div
                            key={item.id}
                            className="text-sm text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="font-medium">
                              {item.paymentCategoryName}
                            </span>
                            : {item.units} {item.unitLabel} ×{" "}
                            {formatCurrency(item.rateAtCreationCents)} ={" "}
                            {formatCurrency(item.originalTotalCents)}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewClick(payslip)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        title="View payslip details"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payslip Detail Drawer */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-3xl w-full border border-zinc-200 dark:border-zinc-800 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Payslip Details
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {selectedPayslip.employeeName} -{" "}
                  {formatDate(selectedPayslip.date)}
                </p>
              </div>
              <button
                onClick={handleClosePayslipDetail}
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
              {payslipDetailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : payslipDetailError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {payslipDetailError}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary Section */}
                  <div
                    className={`rounded-lg p-4 border ${
                      selectedPayslip.isRetroactivelyChanged
                        ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                        : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Original Total
                        </p>
                        <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
                          {formatCurrency(selectedPayslip.originalTotalCents)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Current Total
                        </p>
                        <p
                          className={`text-2xl font-semibold mt-1 ${
                            selectedPayslip.isRetroactivelyChanged
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-zinc-900 dark:text-zinc-50"
                          }`}
                        >
                          {formatCurrency(selectedPayslip.currentTotalCents)}
                        </p>
                      </div>
                    </div>
                    {selectedPayslip.isRetroactivelyChanged && (
                      <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          ⚠ This payslip has been retroactively changed by rate
                          edits
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Retroactive Rate Edits Section — only the most recent is dismissible */}
                  {selectedPayslip.isRetroactivelyChanged &&
                    selectedPayslip.retroactiveRateEdits.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-3">
                          Retroactive Rate Changes
                        </h4>
                        <div className="space-y-2">
                          {selectedPayslip.retroactiveRateEdits.map(
                            (edit, index) => (
                              <div
                                key={edit.rateEventId}
                                className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800 flex justify-between items-center"
                              >
                                <div>
                                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                    {edit.paymentCategoryName}
                                  </p>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                    Effective {formatDate(edit.effectiveDate)} •{" "}
                                    {formatCurrency(edit.rateCents)}/unit
                                  </p>
                                </div>
                                {index === 0 && (
                                  <button
                                    onClick={() =>
                                      handleDismissRateEdit(
                                        selectedPayslip.id,
                                        edit.rateEventId,
                                      )
                                    }
                                    className="text-xs bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 px-3 py-1 rounded transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                        {selectedPayslip.retroactiveRateEdits.length > 1 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                            {selectedPayslip.retroactiveRateEdits.length - 1}{" "}
                            older change(s) will become dismissable after the
                            most recent one is dismissed.
                          </p>
                        )}
                      </div>
                    )}

                  {/* Line Items Section */}
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                      Line Items
                    </h4>
                    <div className="space-y-3">
                      {selectedPayslip.lineItems.map((item) => (
                        <div
                          key={item.id}
                          className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {item.paymentCategoryName}
                              </p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                {item.unitLabel}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                                {formatCurrency(item.originalTotalCents)}
                              </p>
                              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                                {item.units} ×{" "}
                                {formatCurrency(item.rateAtCreationCents)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Info Section */}
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Created
                        </p>
                        <p className="text-sm text-zinc-900 dark:text-zinc-50">
                          {formatRelativeTime(selectedPayslip.createdAt)}
                        </p>
                      </div>
                      <div className="flex justify-between">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Employee ID
                        </p>
                        <p className="text-sm text-zinc-900 dark:text-zinc-50">
                          {selectedPayslip.employeeId}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <button
                onClick={handleClosePayslipDetail}
                className="w-full bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
