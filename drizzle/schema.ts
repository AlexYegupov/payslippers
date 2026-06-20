import { sqliteTable, AnySQLiteColumn, integer, text, uniqueIndex, foreignKey } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const employees = sqliteTable("employees", {
	id: integer().primaryKey().notNull(),
	name: text().notNull(),
	birthday: text().notNull(),
});

export const paymentCategories = sqliteTable("payment_categories", {
	id: integer().primaryKey().notNull(),
	name: text().notNull(),
	unitLabel: text("unit_label").notNull(),
},
(table) => [
	uniqueIndex("payment_categories_name_unique").on(table.name),
]);

export const payslipDismissedRateEvents = sqliteTable("payslip_dismissed_rate_events", {
	payslipId: integer("payslip_id").notNull().references(() => payslips.id, { onDelete: "cascade" } ),
	rateEventId: integer("rate_event_id").notNull().references(() => rateEvents.id, { onDelete: "cascade" } ),
	dismissedAt: text("dismissed_at").notNull(),
	dismissedByUserId: integer("dismissed_by_user_id").notNull().references(() => users.id),
});

export const payslipLines = sqliteTable("payslip_lines", {
	id: integer().primaryKey().notNull(),
	payslipId: integer("payslip_id").notNull().references(() => payslips.id, { onDelete: "cascade" } ),
	paymentCategoryId: integer("payment_category_id").notNull().references(() => paymentCategories.id),
	units: integer().notNull(),
	rateAmountCentsAtCreation: integer("rate_amount_cents_at_creation").notNull(),
	totalAtCreationCents: integer("total_at_creation_cents").notNull(),
});

export const payslips = sqliteTable("payslips", {
	id: integer().primaryKey().notNull(),
	userId: integer("user_id").notNull().references(() => users.id),
	employeeId: integer("employee_id").notNull().references(() => employees.id),
	date: text().notNull(),
	totalAtCreationCents: integer("total_at_creation_cents").notNull(),
	createdAt: text("created_at").notNull(),
});

export const rateEvents = sqliteTable("rate_events", {
	id: integer().primaryKey().notNull(),
	employeeId: integer("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" } ),
	paymentCategoryId: integer("payment_category_id").notNull().references(() => paymentCategories.id, { onDelete: "restrict" } ),
	effectiveAt: text("effective_at").notNull(),
	rateAmountCents: integer("rate_amount_cents").notNull(),
	createdAt: text("created_at").notNull(),
	createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
	note: text(),
});

export const users = sqliteTable("users", {
	id: integer().primaryKey().notNull(),
	name: text().notNull(),
});

