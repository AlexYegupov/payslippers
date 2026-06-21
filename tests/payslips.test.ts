import { describe, it, expect, beforeAll, afterEach } from "vitest";
import { db } from "../src/server/db";
import * as schema from "../src/server/db/schema";
import { createPayslip } from "../src/server/actions/payslips";
import { eq, and, desc } from "drizzle-orm";

describe("Payslip Creation", () => {
  beforeAll(async () => {
    // Ensure database is seeded
    const users = await db.select().from(schema.users).limit(1);
    if (users.length === 0) {
      console.log("Database not seeded. Please run: npm run seed");
    }
  });

  // Track IDs created during tests for cleanup
  let createdPayslipIds: number[] = [];
  let createdRateEventIds: number[] = [];

  afterEach(async () => {
    // Clean up rate event links for test payslips
    for (const id of createdPayslipIds) {
      await db
        .delete(schema.rateEventPayslips)
        .where(eq(schema.rateEventPayslips.payslipId, id));
    }
    // Clean up test payslips (and their line items via CASCADE)
    for (const id of createdPayslipIds) {
      await db
        .delete(schema.payslipLineItems)
        .where(eq(schema.payslipLineItems.payslipId, id));
      await db.delete(schema.payslips).where(eq(schema.payslips.id, id));
    }
    // Clean up test rate events
    for (const id of createdRateEventIds) {
      await db
        .delete(schema.rateEventPayslips)
        .where(eq(schema.rateEventPayslips.rateEventId, id));
      await db.delete(schema.rateEdits).where(eq(schema.rateEdits.id, id));
    }
    createdPayslipIds = [];
    createdRateEventIds = [];
  });

  describe("successful creation", () => {
    it("should create a payslip for John Doe with 100 hours at Hourly Rate ($12/hr)", async () => {
      const result = await createPayslip({
        employeeId: 1,
        date: "2026-02-01",
        lineItems: [{ paymentCategoryId: 1, units: 100 }],
      });

      // Verify the payslip was created
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.employeeId).toBe(1);
      expect(result.date).toBe("2026-02-01");
      expect(result.originalTotalCents).toBe(120000); // 100 * 1200
      createdPayslipIds.push(result.id);

      // Verify the payslip exists in the database
      const payslip = await db
        .select()
        .from(schema.payslips)
        .where(eq(schema.payslips.id, result.id))
        .limit(1);
      expect(payslip.length).toBe(1);
      expect(payslip[0].originalTotalCents).toBe(120000);

      // Verify line items
      const lineItems = await db
        .select()
        .from(schema.payslipLineItems)
        .where(eq(schema.payslipLineItems.payslipId, result.id));
      expect(lineItems.length).toBe(1);
      expect(lineItems[0].paymentCategoryId).toBe(1); // Hourly Rate
      expect(lineItems[0].units).toBe(100);
      expect(lineItems[0].rateAtCreationCents).toBe(1200);
      expect(lineItems[0].originalTotalCents).toBe(120000);
    });

    it("should create a payslip with multiple line items and sum the total", async () => {
      const result = await createPayslip({
        employeeId: 1,
        date: "2026-02-15",
        lineItems: [
          { paymentCategoryId: 1, units: 80 }, // Hourly Rate $12/hr = 96000
          { paymentCategoryId: 2, units: 10 }, // Overtime $18/hr = 18000
        ],
      });

      expect(result).toBeDefined();
      expect(result.originalTotalCents).toBe(114000); // 96000 + 18000
      createdPayslipIds.push(result.id);

      // Verify line items
      const lineItems = await db
        .select()
        .from(schema.payslipLineItems)
        .where(eq(schema.payslipLineItems.payslipId, result.id));

      expect(lineItems.length).toBe(2);

      const hourlyLine = lineItems.find((li) => li.paymentCategoryId === 1);
      expect(hourlyLine).toBeDefined();
      expect(hourlyLine!.units).toBe(80);
      expect(hourlyLine!.rateAtCreationCents).toBe(1200);
      expect(hourlyLine!.originalTotalCents).toBe(96000);

      const overtimeLine = lineItems.find((li) => li.paymentCategoryId === 2);
      expect(overtimeLine).toBeDefined();
      expect(overtimeLine!.units).toBe(10);
      expect(overtimeLine!.rateAtCreationCents).toBe(1800);
      expect(overtimeLine!.originalTotalCents).toBe(18000);

      // Verify the payslip total in the database
      const payslip = await db
        .select()
        .from(schema.payslips)
        .where(eq(schema.payslips.id, result.id))
        .limit(1);
      expect(payslip[0].originalTotalCents).toBe(114000);
    });
  });

  describe("validation errors", () => {
    it("should reject payslip when no rate exists for the category on that date", async () => {
      // Alex Brown (id=3) has no Commission (id=3) rate
      await expect(
        createPayslip({
          employeeId: 3,
          date: "2026-02-01",
          lineItems: [{ paymentCategoryId: 3, units: 100 }],
        }),
      ).rejects.toThrow(/No rate found for payment category/);
    });

    it("should reject payslip with duplicate payment categories", async () => {
      await expect(
        createPayslip({
          employeeId: 1,
          date: "2026-02-01",
          lineItems: [
            { paymentCategoryId: 1, units: 40 },
            { paymentCategoryId: 1, units: 20 },
          ],
        }),
      ).rejects.toThrow(/Invalid payslip data/);
    });
  });

  describe("original total storage", () => {
    it("should store the original total correctly in the database", async () => {
      const result = await createPayslip({
        employeeId: 2,
        date: "2026-03-01",
        lineItems: [{ paymentCategoryId: 4, units: 1 }], // Global Pay $2500
      });

      // Fetch directly from DB to confirm persistence
      const [payslip] = await db
        .select()
        .from(schema.payslips)
        .where(eq(schema.payslips.id, result.id));

      expect(payslip).toBeDefined();
      expect(payslip.originalTotalCents).toBe(250000); // $2,500.00
      createdPayslipIds.push(result.id);
    });
  });

  describe("rate snapshot storage", () => {
    it("should store rateAtCreationCents matching the rate at creation time", async () => {
      // John Doe's rate on 2026-02-01 is $12/hr (1200 cents)
      const result = await createPayslip({
        employeeId: 1,
        date: "2026-02-01",
        lineItems: [{ paymentCategoryId: 1, units: 50 }],
      });

      const lineItems = await db
        .select()
        .from(schema.payslipLineItems)
        .where(eq(schema.payslipLineItems.payslipId, result.id));

      expect(lineItems.length).toBe(1);
      expect(lineItems[0].rateAtCreationCents).toBe(1200);
      expect(lineItems[0].originalTotalCents).toBe(60000); // 50 * 1200
      createdPayslipIds.push(result.id);
    });

    it("should store the newer rate when a rate change exists before the payslip date", async () => {
      // Alex Brown's rate is $9/hr effective 2026-01-01
      // A payslip dated 2026-03-01 should use $9/hr (no later rate change for Alex)
      const result = await createPayslip({
        employeeId: 3,
        date: "2026-03-01",
        lineItems: [{ paymentCategoryId: 1, units: 40 }],
      });

      const lineItems = await db
        .select()
        .from(schema.payslipLineItems)
        .where(eq(schema.payslipLineItems.payslipId, result.id));

      expect(lineItems.length).toBe(1);
      expect(lineItems[0].rateAtCreationCents).toBe(900); // $9/hr
      expect(lineItems[0].originalTotalCents).toBe(36000); // 40 * 900
      createdPayslipIds.push(result.id);
    });
  });

  describe("retroactive rate changes", () => {
    it("should show payslip as retroactively changed after a retroactive rate edit", async () => {
      // Create a payslip for John Doe dated 2026-03-01 at $12/hr
      const payslip = await createPayslip({
        employeeId: 1,
        date: "2026-03-01",
        lineItems: [{ paymentCategoryId: 1, units: 100 }],
      });

      // Verify original total is at $12/hr
      expect(payslip.originalTotalCents).toBe(120000); // 100 * 1200

      // Now insert a retroactive rate edit: $14/hr effective 2026-02-01
      // This is before the payslip date (2026-03-01), so it's retroactive
      const [retroRateEdit] = await db
        .insert(schema.rateEdits)
        .values({
          employeeId: 1,
          paymentCategoryId: 1,
          effectiveDate: "2026-02-01",
          rateCents: 1400,
          createdAt: new Date().toISOString(),
          createdByUserId: 1,
          note: "Retroactive rate change",
        })
        .returning();

      createdRateEventIds.push(retroRateEdit.id);
      createdPayslipIds.push(payslip.id);

      // Link the rate edit to the payslip
      await db.insert(schema.rateEventPayslips).values({
        rateEventId: retroRateEdit.id,
        payslipId: payslip.id,
        isDismissed: false,
      });

      // Fetch the payslip detail to check retroactive change
      const { getPayslipDetail } =
        await import("../src/server/actions/payslips");
      const detail = await getPayslipDetail(payslip.id);

      expect(detail).not.toBeNull();
      expect(detail!.isRetroactivelyChanged).toBe(true);
      // Current total should use the new rate: 100 * 1400 = 140000
      expect(detail!.currentTotalCents).toBe(140000);
      // Original total should remain unchanged
      expect(detail!.originalTotalCents).toBe(120000);
      // They should differ
      expect(detail!.currentTotalCents).not.toBe(detail!.originalTotalCents);
    });
  });
});
