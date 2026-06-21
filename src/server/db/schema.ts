import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
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
  (table) => [
    index("idx_rate_events_as_of").on(
      table.employeeId,
      table.paymentCategoryId,
      table.effectiveDate,
    ),
    index("idx_rate_events_created_after").on(
      table.createdAt,
      table.employeeId,
      table.paymentCategoryId,
    ),
  ],
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
  (table) => [
    index("idx_payslips_created_at").on(table.createdAt),
    index("idx_payslips_employee_date").on(table.employeeId, table.date),
  ],
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
  (table) => [index("idx_payslip_lines_payslip").on(table.payslipId)],
);

export const rateEventPayslips = sqliteTable(
  "rate_event_payslips",
  {
    rateEventId: integer("rate_event_id")
      .notNull()
      .references(() => rateEdits.id, { onDelete: "cascade" }),
    payslipId: integer("payslip_id")
      .notNull()
      .references(() => payslips.id, { onDelete: "cascade" }),
    isDismissed: integer("is_dismissed", { mode: "boolean" })
      .notNull()
      .default(false),
    dismissedAt: text("dismissed_at"),
    dismissedByUserId: integer("dismissed_by_user_id").references(
      () => users.id,
    ),
  },
  (table) => [index("idx_rate_event_payslips_payslip_id").on(table.payslipId)],
);

export const userRelations = relations(users, ({ many }) => ({
  rateEdits: many(rateEdits),
  payslips: many(payslips),
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
  payslipLinks: many(rateEventPayslips),
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
  rateEventLinks: many(rateEventPayslips),
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

export const rateEventPayslipRelations = relations(
  rateEventPayslips,
  ({ one }) => ({
    rateEvent: one(rateEdits, {
      fields: [rateEventPayslips.rateEventId],
      references: [rateEdits.id],
    }),
    payslip: one(payslips, {
      fields: [rateEventPayslips.payslipId],
      references: [payslips.id],
    }),
    dismissedByUser: one(users, {
      fields: [rateEventPayslips.dismissedByUserId],
      references: [users.id],
    }),
  }),
);

export const createRateEditSchema = z.object({
  employeeId: z.number().int().positive(),
  paymentCategoryId: z.number().int().positive(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rateCents: z.number().int().nonnegative(),
  note: z.string().max(500).nullable().optional(),
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
