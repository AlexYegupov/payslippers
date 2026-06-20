import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/server/db";
import * as schema from "../src/server/db/schema";
import { getRatesForEmployee } from "../src/server/actions/rates";

describe("Rates Server Action", () => {
  beforeAll(async () => {
    // Ensure database is seeded
    const users = await db.select().from(schema.users).limit(1);
    if (users.length === 0) {
      console.log("Database not seeded. Please run: npm run seed");
    }
  });

  it("should return rates for employee 1 as of 2026-01-15", async () => {
    const rates = await getRatesForEmployee(1, "2026-01-15");

    expect(Array.isArray(rates)).toBe(true);
    expect(rates.length).toBeGreaterThan(0);

    // John Doe should have Hourly Rate and Overtime Hourly rates
    const hourlyRate = rates.find((r) => r.category.name === "Hourly Rate");
    expect(hourlyRate).toBeDefined();
    expect(hourlyRate!.rate).not.toBeNull();
    expect(hourlyRate!.rate!.rateCents).toBe(1200); // $12.00

    const overtimeRate = rates.find(
      (r) => r.category.name === "Overtime Hourly",
    );
    expect(overtimeRate).toBeDefined();
    expect(overtimeRate!.rate).not.toBeNull();
    expect(overtimeRate!.rate!.rateCents).toBe(1800); // $18.00
  });

  it("should return no rates for employee 1 as of 2025-12-15", async () => {
    const rates = await getRatesForEmployee(1, "2025-12-15");

    expect(Array.isArray(rates)).toBe(true);

    // All rates should be null (before any rate events)
    rates.forEach((rate) => {
      expect(rate.rate).toBeNull();
    });
  });

  it("should return only Global Pay for employee 2", async () => {
    const rates = await getRatesForEmployee(2, "2026-01-15");

    expect(Array.isArray(rates)).toBe(true);

    // Jane Smith should only have Global Pay rate
    const globalPayRate = rates.find((r) => r.category.name === "Global Pay");
    expect(globalPayRate).toBeDefined();
    expect(globalPayRate!.rate).not.toBeNull();
    expect(globalPayRate!.rate!.rateCents).toBe(250000); // $2,500.00

    // Other categories should be null
    const hourlyRate = rates.find((r) => r.category.name === "Hourly Rate");
    expect(hourlyRate!.rate).toBeNull();
  });

  it("should return all categories even if no rates exist", async () => {
    const rates = await getRatesForEmployee(1, "2025-01-01");

    expect(Array.isArray(rates)).toBe(true);
    // Should return all 4 payment categories
    expect(rates.length).toBe(4);

    // All should have null rates
    rates.forEach((rate) => {
      expect(rate.category).toBeDefined();
      expect(rate.rate).toBeNull();
    });
  });
});
