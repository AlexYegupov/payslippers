import "dotenv/config";
import Database from "better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:local.db";
const databasePath = databaseUrl.replace(/^file:/, "");

const sqlite = new Database(databasePath);
sqlite.pragma("foreign_keys = ON");

function resetDatabase() {
  console.log("Resetting database...");

  // Delete data in correct order to respect foreign keys
  const tables = [
    "payslip_dismissed_rate_events",
    "payslip_lines",
    "payslips",
    "rate_events",
    "payment_categories",
    "employees",
    "users",
  ];

  tables.forEach((table) => {
    const result = sqlite.prepare(`DELETE FROM ${table}`).run();
    console.log(`✓ Deleted ${result.changes} rows from ${table}`);
  });

  console.log("Database reset completed!");
}

try {
  resetDatabase();
} catch (error) {
  console.error("Database reset failed:", error);
  process.exit(1);
} finally {
  sqlite.close();
}
