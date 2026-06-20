import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";

import * as schema from "./src/server/db/schema";

const databaseUrl = process.env.DATABASE_URL ?? "file:local.db";
const databasePath = databaseUrl.replace(/^file:/, "");

const sqlite = new Database(databasePath);
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite, { schema });

async function seed() {
  console.log("Starting seed...");

  // Check if already seeded
  const existingUser = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, 1))
    .limit(1);

  if (existingUser.length > 0) {
    console.log("Database already seeded. Skipping...");
    return;
  }

  // Insert users
  await db.insert(schema.users).values({
    id: 1,
    name: "Payroll Specialist",
  });
  console.log("✓ Inserted users");

  // Insert employees
  await db.insert(schema.employees).values([
    { id: 1, name: "John Doe", birthday: "1990-01-15" },
    { id: 2, name: "Jane Smith", birthday: "1988-07-22" },
    { id: 3, name: "Alex Brown", birthday: "1995-03-10" },
  ]);
  console.log("✓ Inserted employees");

  // Insert payment categories
  await db.insert(schema.paymentCategories).values([
    { id: 1, name: "Hourly Rate", unitLabel: "hour" },
    { id: 2, name: "Overtime Hourly", unitLabel: "hour" },
    { id: 3, name: "Commission", unitLabel: "configured minor unit" },
    { id: 4, name: "Global Pay", unitLabel: "pay period" },
  ]);
  console.log("✓ Inserted payment categories");

  // Insert rate events
  await db.insert(schema.rateEdits).values([
    {
      id: 1,
      employeeId: 1,
      paymentCategoryId: 1,
      effectiveDate: "2026-01-01",
      rateCents: 1200,
      createdAt: "2026-01-01T09:00:00Z",
      createdByUserId: 1,
      note: "John Doe hourly baseline: 1200 cents/hour = $12/hour",
    },
    {
      id: 2,
      employeeId: 1,
      paymentCategoryId: 2,
      effectiveDate: "2026-01-01",
      rateCents: 1800,
      createdAt: "2026-01-01T09:00:00Z",
      createdByUserId: 1,
      note: "John Doe overtime baseline: 1800 cents/hour = $18/hour",
    },
    {
      id: 3,
      employeeId: 2,
      paymentCategoryId: 4,
      effectiveDate: "2026-01-01",
      rateCents: 250000,
      createdAt: "2026-01-01T09:00:00Z",
      createdByUserId: 1,
      note: "Jane Smith global pay baseline: $2,500 per pay period",
    },
    {
      id: 4,
      employeeId: 3,
      paymentCategoryId: 1,
      effectiveDate: "2026-01-01",
      rateCents: 900,
      createdAt: "2026-01-01T09:00:00Z",
      createdByUserId: 1,
      note: "Alex Brown hourly baseline: 900 cents/hour = $9/hour",
    },
  ]);
  console.log("✓ Inserted rate events");

  console.log("Seed completed successfully!");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    sqlite.close();
  });
