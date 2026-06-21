import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "file:local.db";
const databasePath = databaseUrl.replace(/^file:/, "");

const sqlite = new Database(databasePath);
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { sqlite };
