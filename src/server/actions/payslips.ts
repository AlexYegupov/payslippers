"use server";

import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { and, desc, eq, inArray, lte, notExists } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { dismissRateEditForPayslipSchema } from "@/server/db/schema";

export interface PayslipLineItem {
  id: number;
  paymentCategoryName: string;
  unitLabel: string;
  units: number;
  rateAtCreationCents: number;
  originalTotalCents: number;
  paymentCategoryId?: number;
}

export interface PayslipWithDetails {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  originalTotalCents: number;
  currentTotalCents: number;
  isRetroactivelyChanged: boolean;
  createdAt: string;
  lineItems: PayslipLineItem[];
  retroactiveRateEdits: RetroactiveRateEdit[];
}

export interface PayslipDetail {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  originalTotalCents: number;
  currentTotalCents: number;
  isRetroactivelyChanged: boolean;
  createdAt: string;
  lineItems: PayslipLineItem[];
  retroactiveRateEdits: RetroactiveRateEdit[];
}

export interface RetroactiveRateEdit {
  rateEventId: number;
  paymentCategoryId: number;
  paymentCategoryName: string;
  effectiveDate: string;
  rateCents: number;
  createdAt: string;
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
        paymentCategoryId: schema.payslipLineItems.paymentCategoryId,
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
        paymentCategoryId: item.paymentCategoryId,
        paymentCategoryName: item.paymentCategoryName,
        unitLabel: item.unitLabel,
        units: item.units,
        rateAtCreationCents: item.rateAtCreationCents,
        originalTotalCents: item.originalTotalCents,
      });

      return acc;
    }, {});

    // For each payslip, compute current total and detect retroactive changes
    const payslipsWithDetails = await Promise.all(
      payslips.map(async (payslip) => {
        const items = lineItemsByPayslipId[payslip.id] ?? [];

        // Find retroactive rate edits for this payslip
        // A retroactive edit is a rate event where:
        // - same employee/category as a payslip line
        // - effective_at <= payslip.date
        // - created_at > payslip.created_at
        // - not dismissed for this payslip
        const retroactiveEdits = await db
          .select({
            rateEventId: schema.rateEdits.id,
            paymentCategoryId: schema.rateEdits.paymentCategoryId,
            paymentCategoryName: schema.paymentCategories.name,
            effectiveDate: schema.rateEdits.effectiveDate,
            rateCents: schema.rateEdits.rateCents,
            createdAt: schema.rateEdits.createdAt,
          })
          .from(schema.rateEdits)
          .innerJoin(
            schema.paymentCategories,
            eq(schema.rateEdits.paymentCategoryId, schema.paymentCategories.id),
          )
          .where(
            and(
              eq(schema.rateEdits.employeeId, employeeId),
              inArray(
                schema.rateEdits.paymentCategoryId,
                items.map((i) => i.paymentCategoryId as number),
              ),
              lte(schema.rateEdits.effectiveDate, payslip.date),
            ),
          )
          .orderBy(
            desc(schema.rateEdits.createdAt),
            desc(schema.rateEdits.effectiveDate),
            desc(schema.rateEdits.id),
          );

        // Filter to only retroactive (created after payslip) and non-dismissed
        const dismissedRateEditIds = await db
          .select({
            rateEditId: schema.payslipDismissedRateEdits.rateEditId,
          })
          .from(schema.payslipDismissedRateEdits)
          .where(
            and(
              eq(schema.payslipDismissedRateEdits.payslipId, payslip.id),
              inArray(
                schema.payslipDismissedRateEdits.rateEditId,
                retroactiveEdits.map((e) => e.rateEventId),
              ),
            ),
          );

        const dismissedSet = new Set(
          dismissedRateEditIds.map((d) => d.rateEditId),
        );

        const activeRetroactiveEdits = retroactiveEdits.filter(
          (edit) =>
            edit.createdAt > payslip.createdAt &&
            !dismissedSet.has(edit.rateEventId),
        );

        // Compute current total using current rates
        let currentTotalCents = 0;
        for (const item of items) {
          const currentRate = await resolveCurrentRate(
            employeeId,
            item.paymentCategoryId as number,
            payslip.date,
            payslip.id,
          );
          const rateToUse = currentRate ?? item.rateAtCreationCents;
          currentTotalCents += item.units * rateToUse;
        }

        return {
          ...payslip,
          lineItems: items,
          currentTotalCents,
          isRetroactivelyChanged: activeRetroactiveEdits.length > 0,
          retroactiveRateEdits: activeRetroactiveEdits,
        };
      }),
    );

    return payslipsWithDetails;
  } catch (error) {
    console.error("Error fetching payslips:", error);
    throw new Error("Failed to fetch payslips");
  }
}

/**
 * Resolve the current rate for an employee/category/payslip date,
 * excluding dismissed rate events for this specific payslip.
 */
async function resolveCurrentRate(
  employeeId: number,
  paymentCategoryId: number,
  payslipDate: string,
  payslipId: number,
): Promise<number | null> {
  const rate = await db
    .select({
      rateCents: schema.rateEdits.rateCents,
      id: schema.rateEdits.id,
    })
    .from(schema.rateEdits)
    .where(
      and(
        eq(schema.rateEdits.employeeId, employeeId),
        eq(schema.rateEdits.paymentCategoryId, paymentCategoryId),
        lte(schema.rateEdits.effectiveDate, payslipDate),
        notExists(
          db
            .select()
            .from(schema.payslipDismissedRateEdits)
            .where(
              and(
                eq(schema.payslipDismissedRateEdits.payslipId, payslipId),
                eq(
                  schema.payslipDismissedRateEdits.rateEditId,
                  schema.rateEdits.id,
                ),
              ),
            ),
        ),
      ),
    )
    .orderBy(
      desc(schema.rateEdits.effectiveDate),
      desc(schema.rateEdits.createdAt),
      desc(schema.rateEdits.id),
    )
    .limit(1);

  return rate.length > 0 ? rate[0].rateCents : null;
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
        paymentCategoryId: schema.payslipLineItems.paymentCategoryId,
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

    // Find retroactive rate edits
    const retroactiveEdits = await db
      .select({
        rateEventId: schema.rateEdits.id,
        paymentCategoryId: schema.rateEdits.paymentCategoryId,
        paymentCategoryName: schema.paymentCategories.name,
        effectiveDate: schema.rateEdits.effectiveDate,
        rateCents: schema.rateEdits.rateCents,
        createdAt: schema.rateEdits.createdAt,
      })
      .from(schema.rateEdits)
      .innerJoin(
        schema.paymentCategories,
        eq(schema.rateEdits.paymentCategoryId, schema.paymentCategories.id),
      )
      .where(
        and(
          eq(schema.rateEdits.employeeId, payslipData.employeeId),
          inArray(
            schema.rateEdits.paymentCategoryId,
            lineItems.map((i) => i.paymentCategoryId as number),
          ),
          lte(schema.rateEdits.effectiveDate, payslipData.date),
        ),
      )
      .orderBy(
        desc(schema.rateEdits.createdAt),
        desc(schema.rateEdits.effectiveDate),
        desc(schema.rateEdits.id),
      );

    // Filter to only retroactive (created after payslip) and non-dismissed
    const dismissedRateEditIds = await db
      .select({
        rateEditId: schema.payslipDismissedRateEdits.rateEditId,
      })
      .from(schema.payslipDismissedRateEdits)
      .where(
        and(
          eq(schema.payslipDismissedRateEdits.payslipId, payslipId),
          inArray(
            schema.payslipDismissedRateEdits.rateEditId,
            retroactiveEdits.map((e) => e.rateEventId),
          ),
        ),
      );

    const dismissedSet = new Set(dismissedRateEditIds.map((d) => d.rateEditId));

    const activeRetroactiveEdits = retroactiveEdits.filter(
      (edit) =>
        edit.createdAt > payslipData.createdAt &&
        !dismissedSet.has(edit.rateEventId),
    );

    // Compute current total
    let currentTotalCents = 0;
    for (const item of lineItems) {
      const currentRate = await resolveCurrentRate(
        payslipData.employeeId,
        item.paymentCategoryId as number,
        payslipData.date,
        payslipId,
      );
      const rateToUse = currentRate ?? item.rateAtCreationCents;
      currentTotalCents += item.units * rateToUse;
    }

    return {
      ...payslipData,
      lineItems,
      currentTotalCents,
      isRetroactivelyChanged: activeRetroactiveEdits.length > 0,
      retroactiveRateEdits: activeRetroactiveEdits,
    };
  } catch (error) {
    console.error("Error fetching payslip detail:", error);
    throw new Error("Failed to fetch payslip details");
  }
}

/**
 * Dismiss a retroactive rate edit for a specific payslip.
 * This prevents the rate edit from affecting the payslip's current total.
 */
export async function dismissRateEditForPayslip(
  payslipId: number,
  rateEditId: number,
): Promise<void> {
  const parsed = dismissRateEditForPayslipSchema.safeParse({
    payslipId,
    rateEditId,
  });

  if (!parsed.success) {
    throw new Error("Invalid dismissal data: " + parsed.error.message);
  }

  const now = new Date().toISOString();

  // Check if already dismissed
  const existing = await db
    .select()
    .from(schema.payslipDismissedRateEdits)
    .where(
      and(
        eq(schema.payslipDismissedRateEdits.payslipId, payslipId),
        eq(schema.payslipDismissedRateEdits.rateEditId, rateEditId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return; // Already dismissed
  }

  await db.insert(schema.payslipDismissedRateEdits).values({
    payslipId,
    rateEditId,
    dismissedAt: now,
    dismissedByUserId: 1, // Fixed user for this assignment
  });

  await revalidatePath("/dashboard");
}
