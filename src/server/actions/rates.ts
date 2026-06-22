"use server";

import { db, sqlite } from "@/server/db";
import * as schema from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { createRateEditSchema } from "@/server/db/schema";

export interface RateWithCategory {
  category: {
    id: number;
    name: string;
    unitLabel: string;
  };
  rate: {
    id: number;
    employeeId: number;
    paymentCategoryId: number;
    effectiveDate: string;
    rateCents: number;
    createdAt: string;
    createdByUserId: number;
    note: string | null;
  } | null;
}

export async function getPaymentCategories() {
  try {
    return await db.select().from(schema.paymentCategories);
  } catch (error) {
    console.error("Error fetching payment categories:", error);
    throw new Error("Failed to fetch payment categories");
  }
}

export async function getRatesForEmployee(
  employeeId: number,
  effectiveDate: string,
): Promise<RateWithCategory[]> {
  try {
    // Get all payment categories
    const categories = await db.select().from(schema.paymentCategories);

    // Single query: get the most recent rate edit per category as of the effective date
    // Uses ROW_NUMBER() to rank edits per category, then filters to #1
    const activeRates = sqlite
      .prepare(
        `
        WITH ranked AS (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY payment_category_id
              ORDER BY effective_at DESC, created_at DESC, id DESC
            ) AS rn
          FROM rate_events
          WHERE employee_id = ?
            AND effective_at <= ?
        )
        SELECT * FROM ranked WHERE rn = 1
        `,
      )
      .all(employeeId, effectiveDate) as Array<{
      id: number;
      employee_id: number;
      payment_category_id: number;
      effective_at: string;
      rate_amount_cents: number;
      created_at: string;
      created_by_user_id: number;
      note: string | null;
    }>;

    // Build a lookup: categoryId -> rate edit
    const rateByCategory = new Map<number, (typeof activeRates)[number]>();
    for (const row of activeRates) {
      rateByCategory.set(row.payment_category_id, row);
    }

    // Map categories to their active rates
    return categories.map((category) => {
      const rate = rateByCategory.get(category.id);
      return {
        category,
        rate: rate
          ? {
              id: rate.id,
              employeeId: rate.employee_id,
              paymentCategoryId: rate.payment_category_id,
              effectiveDate: rate.effective_at,
              rateCents: rate.rate_amount_cents,
              createdAt: rate.created_at,
              createdByUserId: rate.created_by_user_id,
              note: rate.note,
            }
          : null,
      };
    });
  } catch (error) {
    console.error("Error fetching rates:", error);
    throw new Error("Failed to fetch rates");
  }
}

/**
 * Create a new rate edit (rate event) for an employee and payment category.
 * The effective date determines from when the rate applies.
 */
export async function createRateEdit(input: {
  employeeId: number;
  paymentCategoryId: number;
  effectiveDate: string; // YYYY-MM-DD
  rateCents: number;
  note?: string | null | undefined;
  createdByUserId: number;
}) {
  // Validate input using the shared Zod schema
  const parsed = createRateEditSchema.safeParse({
    employeeId: input.employeeId,
    paymentCategoryId: input.paymentCategoryId,
    effectiveDate: input.effectiveDate,
    rateCents: input.rateCents,
    note: input.note,
  });

  if (!parsed.success) {
    throw new Error("Invalid rate edit data: " + parsed.error.message);
  }

  const now = new Date().toISOString();

  const [inserted] = await db
    .insert(schema.rateEdits)
    .values({
      employeeId: input.employeeId,
      paymentCategoryId: input.paymentCategoryId,
      effectiveDate: input.effectiveDate,
      rateCents: input.rateCents,
      createdAt: now,
      createdByUserId: input.createdByUserId,
      note: input.note ?? null,
    })
    .returning();

  // Populate rate_event_payslips link table for all affected payslips
  sqlite
    .prepare(
      `
    INSERT OR IGNORE INTO rate_event_payslips (rate_event_id, payslip_id, is_dismissed)
    SELECT ?, p.id, 0
    FROM payslips p
    JOIN payslip_lines pl ON pl.payslip_id = p.id
    WHERE p.employee_id = ?
      AND pl.payment_category_id = ?
      AND p.date >= ?
  `,
    )
    .run(
      inserted.id,
      input.employeeId,
      input.paymentCategoryId,
      input.effectiveDate,
    );

  // Revalidate any paths that depend on rates (dashboard page)
  await revalidatePath("/dashboard");

  return inserted;
}

/**
 * Get the complete history of rate edits for a specific employee and payment category.
 * Returns all rate events ordered by effective date (most recent first).
 */
export async function getRateHistory(
  employeeId: number,
  paymentCategoryId: number,
): Promise<RateWithCategory["rate"][]> {
  try {
    const history = await db
      .select()
      .from(schema.rateEdits)
      .where(
        and(
          eq(schema.rateEdits.employeeId, employeeId),
          eq(schema.rateEdits.paymentCategoryId, paymentCategoryId),
        ),
      )
      .orderBy(
        desc(schema.rateEdits.effectiveDate),
        desc(schema.rateEdits.createdAt),
        desc(schema.rateEdits.id),
      );

    return history;
  } catch (error) {
    console.error("Error fetching rate history:", error);
    throw new Error("Failed to fetch rate history");
  }
}
