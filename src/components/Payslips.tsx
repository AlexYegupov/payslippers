"use client";

import { useEffect, useState, useCallback } from "react";
import { EmployeeSelector, type Employee } from "./EmployeeSelector";
import {
  getPayslipsForEmployee,
  getPayslipDetail,
  dismissRateEditForPayslip,
  createPayslip,
  type PayslipWithDetails,
  type PayslipDetail,
} from "@/server/actions/payslips";
import { getPaymentCategories } from "@/server/actions/rates";

interface PayslipsProps {
  employees: Employee[];
  selectedEmployee: Employee | null;
  onEmployeeChange: (employee: Employee | null) => void;
  refreshKey?: number;
}

interface PaymentCategory {
  id: number;
  name: string;
  unitLabel: string;
}

interface LineItem {
  paymentCategoryId: number | null;
  units: number;
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function Payslips({
  employees,
  selectedEmployee,
  onEmployeeChange,
  refreshKey = 0,
}: PayslipsProps) {
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

  // Create modal state
  const [isCreating, setIsCreating] = useState(false);
  const [createDate, setCreateDate] = useState(getTodayString());
  const [createLineItems, setCreateLineItems] = useState<LineItem[]>([
    { paymentCategoryId: null, units: 1 },
  ]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [paymentCategories, setPaymentCategories] = useState<PaymentCategory[]>(
    [],
  );

  const fetchPayslips = useCallback(async () => {
    if (!selectedEmployee) {
      setPayslips([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getPayslipsForEmployee(selectedEmployee.id);
      setPayslips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch payslips");
    } finally {
      setLoading(false);
    }
  }, [selectedEmployee]);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips, refreshKey]);

  // Fetch payment categories when the create modal opens
  useEffect(() => {
    if (!isCreating) return;

    const fetchCategories = async () => {
      try {
        const categories = await getPaymentCategories();
        setPaymentCategories(categories);
      } catch (err) {
        setCreateError(
          err instanceof Error ? err.message : "Failed to fetch categories",
        );
      }
    };

    fetchCategories();
  }, [isCreating]);

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

  useEffect(() => {
    if (!selectedPayslip) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClosePayslipDetail();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPayslip]);

  useEffect(() => {
    if (!isCreating) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseCreate();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCreating]);

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

  // --- Create modal handlers ---

  const handleOpenCreate = () => {
    setCreateDate(getTodayString());
    setCreateLineItems([{ paymentCategoryId: null, units: 1 }]);
    setCreateError(null);
    setCreateSuccess(false);
    setCreateLoading(false);
    setIsCreating(true);
  };

  const handleCloseCreate = () => {
    setIsCreating(false);
  };

  const handleAddLineItem = () => {
    setCreateLineItems((prev) => [
      ...prev,
      { paymentCategoryId: null, units: 1 },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    setCreateLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItem,
    value: number | null,
  ) => {
    setCreateLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleCreateSubmit = async () => {
    if (!selectedEmployee) return;

    setCreateError(null);
    setCreateSuccess(false);

    // Client-side validation
    const validLineItems = createLineItems.filter(
      (item) => item.paymentCategoryId !== null,
    );

    if (validLineItems.length === 0) {
      setCreateError("At least one line item with a category is required");
      return;
    }

    const categoryIds = validLineItems.map((item) => item.paymentCategoryId);
    if (new Set(categoryIds).size !== categoryIds.length) {
      setCreateError("Each payment category can only appear once");
      return;
    }

    if (
      validLineItems.some(
        (item) => item.units <= 0 || !Number.isInteger(item.units),
      )
    ) {
      setCreateError("Units must be a positive whole number");
      return;
    }

    setCreateLoading(true);

    try {
      await createPayslip({
        employeeId: selectedEmployee.id,
        date: createDate,
        lineItems: validLineItems.map((item) => ({
          paymentCategoryId: item.paymentCategoryId!,
          units: item.units,
        })),
      });

      setCreateSuccess(true);

      // Refresh the list
      const data = await getPayslipsForEmployee(selectedEmployee.id);
      setPayslips(data);

      // Auto-close after a brief delay
      setTimeout(() => {
        setIsCreating(false);
      }, 800);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create payslip",
      );
    } finally {
      setCreateLoading(false);
    }
  };

  if (!selectedEmployee) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <EmployeeSelector
              employees={employees}
              selectedEmployee={selectedEmployee}
              onEmployeeChange={onEmployeeChange}
            />
          </div>
          <div className="p-8">
            <p className="text-zinc-600 dark:text-zinc-400 text-center">
              Please select an employee to view their payslips
            </p>
          </div>
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
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Payslips
          </h2>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Payslip
          </button>
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
                    onClick={() => handleViewClick(payslip)}
                    className={`cursor-pointer transition-colors ${
                      payslip.isRetroactivelyChanged
                        ? "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleClosePayslipDetail}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-3xl w-full border border-zinc-200 dark:border-zinc-800 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
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

      {/* Create Payslip Modal */}
      {isCreating && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseCreate}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-lg w-full border border-zinc-200 dark:border-zinc-800 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Create Payslip
              </h3>
              <button
                onClick={handleCloseCreate}
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

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Success message */}
              {createSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✓ Payslip created successfully!
                  </p>
                </div>
              )}

              {/* Error message */}
              {createError && !createSuccess && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {createError}
                  </p>
                </div>
              )}

              {/* Date input */}
              <div>
                <label
                  htmlFor="create-date"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Date
                </label>
                <input
                  id="create-date"
                  type="date"
                  value={createDate}
                  onChange={(e) => setCreateDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Line items */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Line Items
                </label>
                <div className="space-y-3">
                  {createLineItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={item.paymentCategoryId ?? ""}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "paymentCategoryId",
                            e.target.value ? Number(e.target.value) : null,
                          )
                        }
                        className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select category...</option>
                        {paymentCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} ({cat.unitLabel})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.units}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "units",
                            Math.max(
                              1,
                              Math.floor(Number(e.target.value) || 1),
                            ),
                          )
                        }
                        className="w-20 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Units"
                      />
                      <button
                        onClick={() => handleRemoveLineItem(index)}
                        disabled={createLineItems.length <= 1}
                        className="p-2 text-zinc-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Remove line item"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddLineItem}
                  className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Line Item
                </button>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex gap-3">
              <button
                onClick={handleCloseCreate}
                disabled={createLoading}
                className="flex-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={createLoading || createSuccess}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  "Create Payslip"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
