"use server";

import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { desc, eq, inArray } from "drizzle-orm";

export interface PayslipWithDetails {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  originalTotalCents: number;
  createdAt: string;
  lineItems: Array<{
    id: number;
    paymentCategoryName: string;
    unitLabel: string;
    units: number;
    rateAtCreationCents: number;
    originalTotalCents: number;
  }>;
}

export interface PayslipDetail {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  originalTotalCents: number;
  createdAt: string;
  lineItems: Array<{
    id: number;
    paymentCategoryName: string;
    unitLabel: string;
    units: number;
    rateAtCreationCents: number;
    originalTotalCents: number;
  }>;
}

export async function getPayslipsForEmployee(
  employeeId: number,
): Promise<PayslipWithDetails[]> {
  try {
    const payslips = await db
      .select({
        id: schema.payslips.id,
        employeeId: schema.payslips.employeeId,
        employeeName: schema.employees.name,
        date: schema.payslips.date,
        originalTotalCents: schema.payslips.originalTotalCents,
        createdAt: schema.payslips.createdAt,
      })
      .from(schema.payslips)
      .innerJoin(
        schema.employees,
        eq(schema.payslips.employeeId, schema.employees.id),
      )
      .where(eq(schema.payslips.employeeId, employeeId))
      .orderBy(
        desc(schema.payslips.date),
        desc(schema.payslips.createdAt),
        desc(schema.payslips.id),
      );

    const payslipIds = payslips.map((payslip) => payslip.id);

    if (payslipIds.length === 0) {
      return [];
    }

    const lineItems = await db
      .select({
        payslipId: schema.payslipLineItems.payslipId,
        id: schema.payslipLineItems.id,
        paymentCategoryName: schema.paymentCategories.name,
        unitLabel: schema.paymentCategories.unitLabel,
        units: schema.payslipLineItems.units,
        rateAtCreationCents: schema.payslipLineItems.rateAtCreationCents,
        originalTotalCents: schema.payslipLineItems.originalTotalCents,
      })
      .from(schema.payslipLineItems)
      .innerJoin(
        schema.paymentCategories,
        eq(
          schema.payslipLineItems.paymentCategoryId,
          schema.paymentCategories.id,
        ),
      )
      .where(inArray(schema.payslipLineItems.payslipId, payslipIds));

    const lineItemsByPayslipId = lineItems.reduce<
      Record<number, PayslipWithDetails["lineItems"]>
    >((acc, item) => {
      if (!acc[item.payslipId]) {
        acc[item.payslipId] = [];
      }

      acc[item.payslipId].push({
        id: item.id,
        paymentCategoryName: item.paymentCategoryName,
        unitLabel: item.unitLabel,
        units: item.units,
        rateAtCreationCents: item.rateAtCreationCents,
        originalTotalCents: item.originalTotalCents,
      });

      return acc;
    }, {});

    return payslips.map((payslip) => ({
      ...payslip,
      lineItems: lineItemsByPayslipId[payslip.id] ?? [],
    }));
  } catch (error) {
    console.error("Error fetching payslips:", error);
    throw new Error("Failed to fetch payslips");
  }
}

export async function getPayslipDetail(
  payslipId: number,
): Promise<PayslipDetail | null> {
  try {
    const payslip = await db
      .select({
        id: schema.payslips.id,
        employeeId: schema.payslips.employeeId,
        employeeName: schema.employees.name,
        date: schema.payslips.date,
        originalTotalCents: schema.payslips.originalTotalCents,
        createdAt: schema.payslips.createdAt,
      })
      .from(schema.payslips)
      .innerJoin(
        schema.employees,
        eq(schema.payslips.employeeId, schema.employees.id),
      )
      .where(eq(schema.payslips.id, payslipId))
      .limit(1);

    if (payslip.length === 0) {
      return null;
    }

    const payslipData = payslip[0];

    const lineItems = await db
      .select({
        id: schema.payslipLineItems.id,
        paymentCategoryName: schema.paymentCategories.name,
        unitLabel: schema.paymentCategories.unitLabel,
        units: schema.payslipLineItems.units,
        rateAtCreationCents: schema.payslipLineItems.rateAtCreationCents,
        originalTotalCents: schema.payslipLineItems.originalTotalCents,
      })
      .from(schema.payslipLineItems)
      .innerJoin(
        schema.paymentCategories,
        eq(
          schema.payslipLineItems.paymentCategoryId,
          schema.paymentCategories.id,
        ),
      )
      .where(eq(schema.payslipLineItems.payslipId, payslipId));

    return {
      ...payslipData,
      lineItems,
    };
  } catch (error) {
    console.error("Error fetching payslip detail:", error);
    throw new Error("Failed to fetch payslip details");
  }
}
