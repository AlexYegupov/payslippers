import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { Dashboard } from "./dashboard";

async function getEmployees() {
  return await db.select().from(schema.employees);
}

export default async function Home() {
  // Fetch data on the server
  const employees = await getEmployees();

  return <Dashboard employees={employees} />;
}
