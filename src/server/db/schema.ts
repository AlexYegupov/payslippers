import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
});

export const employees = sqliteTable("employees", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  birthday: text("birthday").notNull(),
});

export const paymentCategories = sqliteTable("payment_categories", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().unique(),
  unitLabel: text("unit_label").notNull(),
});

export const rateEdits = sqliteTable(
  "rate_events",
  {
    id: integer("id").primaryKey(),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    paymentCategoryId: integer("payment_category_id")
      .notNull()
      .references(() => paymentCategories.id, { onDelete: "restrict" }),
    effectiveDate: text("effective_at").notNull(),
    rateCents: integer("rate_amount_cents").notNull(),
    createdAt: text("created_at").notNull(),
    createdByUserId: integer("created_by_user_id")
      .notNull()
      .references(() => users.id),
    note: text("note"),
  },
  (table) => ({
    asOfIndex: sql`CREATE INDEX idx_rate_events_as_of ON ${table} (employee_id, payment_category_id, effective_at DESC, created_at DESC, id DESC)`,
    createdAfterIndex: sql`CREATE INDEX idx_rate_events_created_after ON ${table} (created_at, employee_id, payment_category_id, effective_at DESC)`,
  }),
);

export const payslips = sqliteTable(
  "payslips",
  {
    id: integer("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
    date: text("date").notNull(),
    originalTotalCents: integer("total_at_creation_cents").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    createdAtIndex: sql`CREATE INDEX idx_payslips_created_at ON ${table} (created_at)`,
    employeeDateIndex: sql`CREATE INDEX idx_payslips_employee_date ON ${table} (employee_id, date)`,
  }),
);

export const payslipLineItems = sqliteTable(
  "payslip_lines",
  {
    id: integer("id").primaryKey(),
    payslipId: integer("payslip_id")
      .notNull()
      .references(() => payslips.id, { onDelete: "cascade" }),
    paymentCategoryId: integer("payment_category_id")
      .notNull()
      .references(() => paymentCategories.id),
    units: integer("units").notNull(),
    rateAtCreationCents: integer("rate_amount_cents_at_creation").notNull(),
    originalTotalCents: integer("total_at_creation_cents").notNull(),
  },
  (table) => ({
    payslipIndex: sql`CREATE INDEX idx_payslip_lines_payslip ON ${table} (payslip_id)`,
  }),
);

export const payslipDismissedRateEdits = sqliteTable(
  "payslip_dismissed_rate_events",
  {
    payslipId: integer("payslip_id")
      .notNull()
      .references(() => payslips.id, { onDelete: "cascade" }),
    rateEditId: integer("rate_event_id")
      .notNull()
      .references(() => rateEdits.id, { onDelete: "cascade" }),
    dismissedAt: text("dismissed_at").notNull(),
    dismissedByUserId: integer("dismissed_by_user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => ({
    payslipIndex: sql`CREATE INDEX idx_payslip_dismissals_payslip ON ${table} (payslip_id, rate_event_id)`,
    rateEventIndex: sql`CREATE INDEX idx_payslip_dismissals_rate_event ON ${table} (rate_event_id, payslip_id)`,
  }),
);

export const userRelations = relations(users, ({ many }) => ({
  rateEdits: many(rateEdits),
  payslips: many(payslips),
  dismissedRateEdits: many(payslipDismissedRateEdits),
}));

export const employeeRelations = relations(employees, ({ many }) => ({
  rateEdits: many(rateEdits),
  payslips: many(payslips),
}));

export const paymentCategoryRelations = relations(
  paymentCategories,
  ({ many }) => ({
    rateEdits: many(rateEdits),
    lineItems: many(payslipLineItems),
  }),
);

export const rateEditRelations = relations(rateEdits, ({ one, many }) => ({
  employee: one(employees, {
    fields: [rateEdits.employeeId],
    references: [employees.id],
  }),
  paymentCategory: one(paymentCategories, {
    fields: [rateEdits.paymentCategoryId],
    references: [paymentCategories.id],
  }),
  createdByUser: one(users, {
    fields: [rateEdits.createdByUserId],
    references: [users.id],
  }),
  dismissals: many(payslipDismissedRateEdits),
}));

export const payslipRelations = relations(payslips, ({ one, many }) => ({
  user: one(users, {
    fields: [payslips.userId],
    references: [users.id],
  }),
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
  lineItems: many(payslipLineItems),
  dismissedRateEdits: many(payslipDismissedRateEdits),
}));

export const payslipLineItemRelations = relations(
  payslipLineItems,
  ({ one }) => ({
    payslip: one(payslips, {
      fields: [payslipLineItems.payslipId],
      references: [payslips.id],
    }),
    paymentCategory: one(paymentCategories, {
      fields: [payslipLineItems.paymentCategoryId],
      references: [paymentCategories.id],
    }),
  }),
);

export const payslipDismissedRateEditRelations = relations(
  payslipDismissedRateEdits,
  ({ one }) => ({
    payslip: one(payslips, {
      fields: [payslipDismissedRateEdits.payslipId],
      references: [payslips.id],
    }),
    rateEdit: one(rateEdits, {
      fields: [payslipDismissedRateEdits.rateEditId],
      references: [rateEdits.id],
    }),
    dismissedByUser: one(users, {
      fields: [payslipDismissedRateEdits.dismissedByUserId],
      references: [users.id],
    }),
  }),
);

export const createRateEditSchema = z.object({
  employeeId: z.number().int().positive(),
  paymentCategoryId: z.number().int().positive(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rateCents: z.number().int().nonnegative(),
  note: z.string().max(500).optional(),
});

export const dismissRateEditForPayslipSchema = z.object({
  payslipId: z.number().int().positive(),
  rateEditId: z.number().int().positive(),
});

export const createPayslipSchema = z.object({
  employeeId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lineItems: z
    .array(
      z.object({
        paymentCategoryId: z.number().int().positive(),
        units: z.number().int().positive(),
      }),
    )
    .min(1)
    .refine(
      (items) =>
        new Set(items.map((item) => item.paymentCategoryId)).size ===
        items.length,
      "Each payment category can appear only once per payslip",
    ),
});
