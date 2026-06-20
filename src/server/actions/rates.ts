"use server";

import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

export async function getRatesForEmployee(
  employeeId: number,
  effectiveDate: string
): Promise<RateWithCategory[]> {
  try {
    // Get all payment categories
    const categories = await db.select().from(schema.paymentCategories);

    // Get the most recent rate edit for each category as of the effective date
    const rates = await Promise.all(
      categories.map(async (category) => {
        // Get all rate edits for this employee and category
        const allRateEdits = await db
          .select()
          .from(schema.rateEdits)
          .where(
            and(
              eq(schema.rateEdits.employeeId, employeeId),
              eq(schema.rateEdits.paymentCategoryId, category.id)
            )
          )
          .orderBy(
            desc(schema.rateEdits.effectiveDate),
            desc(schema.rateEdits.createdAt),
            desc(schema.rateEdits.id)
          );

        // Find the most recent rate edit that is effective as of the selected date
        const activeRate = allRateEdits.find(
          (rate) => rate.effectiveDate <= effectiveDate
        );

        return {
          category,
          rate: activeRate || null,
        };
      })
    );

    return rates;
  } catch (error) {
    console.error("Error fetching rates:", error);
    throw new Error("Failed to fetch rates");
  }
}
