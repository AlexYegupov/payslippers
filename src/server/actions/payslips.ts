"use server";

import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
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

    // Fetch all rate event links for these payslips in one query
    const allRateEventLinks = await db
      .select({
        payslipId: schema.rateEventPayslips.payslipId,
        rateEventId: schema.rateEventPayslips.rateEventId,
        isDismissed: schema.rateEventPayslips.isDismissed,
        effectiveDate: schema.rateEdits.effectiveDate,
        rateCents: schema.rateEdits.rateCents,
        createdAt: schema.rateEdits.createdAt,
        paymentCategoryId: schema.rateEdits.paymentCategoryId,
        paymentCategoryName: schema.paymentCategories.name,
      })
      .from(schema.rateEventPayslips)
      .innerJoin(
        schema.rateEdits,
        eq(schema.rateEventPayslips.rateEventId, schema.rateEdits.id),
      )
      .innerJoin(
        schema.paymentCategories,
        eq(schema.rateEdits.paymentCategoryId, schema.paymentCategories.id),
      )
      .where(inArray(schema.rateEventPayslips.payslipId, payslipIds));

    // Group links by payslipId
    const linksByPayslipId = allRateEventLinks.reduce<
      Record<number, typeof allRateEventLinks>
    >((acc, link) => {
      if (!acc[link.payslipId]) {
        acc[link.payslipId] = [];
      }
      acc[link.payslipId].push(link);
      return acc;
    }, {});

    // For each payslip, compute current total and collect retroactive edits
    const payslipsWithDetails = payslips.map((payslip) => {
      const items = lineItemsByPayslipId[payslip.id] ?? [];
      const links = linksByPayslipId[payslip.id] ?? [];

      // Non-dismissed links for this payslip
      const activeLinks = links.filter((link) => !link.isDismissed);

      // Compute current total using current rates from the link table
      let currentTotalCents = 0;
      for (const item of items) {
        const currentRate = resolveCurrentRateFromLinks(
          activeLinks,
          item.paymentCategoryId as number,
        );
        const rateToUse = currentRate ?? item.rateAtCreationCents;
        currentTotalCents += item.units * rateToUse;
      }

      // All active links are retroactive edits (by definition of the link table)
      const retroactiveRateEdits: RetroactiveRateEdit[] = activeLinks.map(
        (link) => ({
          rateEventId: link.rateEventId,
          paymentCategoryId: link.paymentCategoryId,
          paymentCategoryName: link.paymentCategoryName,
          effectiveDate: link.effectiveDate,
          rateCents: link.rateCents,
          createdAt: link.createdAt,
        }),
      );

      return {
        ...payslip,
        lineItems: items,
        currentTotalCents,
        isRetroactivelyChanged: retroactiveRateEdits.length > 0,
        retroactiveRateEdits,
      };
    });

    return payslipsWithDetails;
  } catch (error) {
    console.error("Error fetching payslips:", error);
    throw new Error("Failed to fetch payslips");
  }
}

/**
 * Resolve the current rate for a payment category from the link table.
 * Returns the rate from the link with the latest effectiveDate (and createdAt/id as tiebreaker).
 */
function resolveCurrentRateFromLinks(
  activeLinks: {
    rateEventId: number;
    paymentCategoryId: number;
    effectiveDate: string;
    rateCents: number;
    createdAt: string;
  }[],
  paymentCategoryId: number,
): number | null {
  const categoryLinks = activeLinks.filter(
    (link) => link.paymentCategoryId === paymentCategoryId,
  );

  if (categoryLinks.length === 0) {
    return null;
  }

  // Sort by effectiveDate DESC, createdAt DESC, rateEventId DESC
  const sorted = categoryLinks.sort((a, b) => {
    const cmp = b.effectiveDate.localeCompare(a.effectiveDate);
    if (cmp !== 0) return cmp;
    const cmp2 = b.createdAt.localeCompare(a.createdAt);
    if (cmp2 !== 0) return cmp2;
    return b.rateEventId - a.rateEventId;
  });

  return sorted[0].rateCents;
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

    // Fetch rate event links for this payslip
    const rateEventLinks = await db
      .select({
        rateEventId: schema.rateEventPayslips.rateEventId,
        isDismissed: schema.rateEventPayslips.isDismissed,
        effectiveDate: schema.rateEdits.effectiveDate,
        rateCents: schema.rateEdits.rateCents,
        createdAt: schema.rateEdits.createdAt,
        paymentCategoryId: schema.rateEdits.paymentCategoryId,
        paymentCategoryName: schema.paymentCategories.name,
      })
      .from(schema.rateEventPayslips)
      .innerJoin(
        schema.rateEdits,
        eq(schema.rateEventPayslips.rateEventId, schema.rateEdits.id),
      )
      .innerJoin(
        schema.paymentCategories,
        eq(schema.rateEdits.paymentCategoryId, schema.paymentCategories.id),
      )
      .where(eq(schema.rateEventPayslips.payslipId, payslipId));

    // Non-dismissed links
    const activeLinks = rateEventLinks.filter((link) => !link.isDismissed);

    // Compute current total
    let currentTotalCents = 0;
    for (const item of lineItems) {
      const currentRate = resolveCurrentRateFromLinks(
        activeLinks,
        item.paymentCategoryId as number,
      );
      const rateToUse = currentRate ?? item.rateAtCreationCents;
      currentTotalCents += item.units * rateToUse;
    }

    // All active links are retroactive edits (by definition of the link table)
    const retroactiveRateEdits: RetroactiveRateEdit[] = activeLinks.map(
      (link) => ({
        rateEventId: link.rateEventId,
        paymentCategoryId: link.paymentCategoryId,
        paymentCategoryName: link.paymentCategoryName,
        effectiveDate: link.effectiveDate,
        rateCents: link.rateCents,
        createdAt: link.createdAt,
      }),
    );

    return {
      ...payslipData,
      lineItems,
      currentTotalCents,
      isRetroactivelyChanged: retroactiveRateEdits.length > 0,
      retroactiveRateEdits,
    };
  } catch (error) {
    console.error("Error fetching payslip detail:", error);
    throw new Error("Failed to fetch payslip details");
  }
}

/**
 * Dismiss a retroactive rate edit for a specific payslip.
 * Sets is_dismissed = true on the link table row.
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

  // Update the link table row to dismissed
  const result = await db
    .update(schema.rateEventPayslips)
    .set({
      isDismissed: true,
      dismissedAt: now,
      dismissedByUserId: 1, // Fixed user for this assignment
    })
    .where(
      and(
        eq(schema.rateEventPayslips.payslipId, payslipId),
        eq(schema.rateEventPayslips.rateEventId, rateEditId),
        eq(schema.rateEventPayslips.isDismissed, false),
      ),
    );

  // If no row was updated, the link doesn't exist or was already dismissed
  // We silently return (idempotent behavior)

  await revalidatePath("/dashboard");
}
