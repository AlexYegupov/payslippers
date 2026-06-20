import { relations } from "drizzle-orm/relations";
import { users, payslipDismissedRateEvents, rateEvents, payslips, paymentCategories, payslipLines, employees } from "./schema";

export const payslipDismissedRateEventsRelations = relations(payslipDismissedRateEvents, ({one}) => ({
	user: one(users, {
		fields: [payslipDismissedRateEvents.dismissedByUserId],
		references: [users.id]
	}),
	rateEvent: one(rateEvents, {
		fields: [payslipDismissedRateEvents.rateEventId],
		references: [rateEvents.id]
	}),
	payslip: one(payslips, {
		fields: [payslipDismissedRateEvents.payslipId],
		references: [payslips.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	payslipDismissedRateEvents: many(payslipDismissedRateEvents),
	payslips: many(payslips),
	rateEvents: many(rateEvents),
}));

export const rateEventsRelations = relations(rateEvents, ({one, many}) => ({
	payslipDismissedRateEvents: many(payslipDismissedRateEvents),
	user: one(users, {
		fields: [rateEvents.createdByUserId],
		references: [users.id]
	}),
	paymentCategory: one(paymentCategories, {
		fields: [rateEvents.paymentCategoryId],
		references: [paymentCategories.id]
	}),
	employee: one(employees, {
		fields: [rateEvents.employeeId],
		references: [employees.id]
	}),
}));

export const payslipsRelations = relations(payslips, ({one, many}) => ({
	payslipDismissedRateEvents: many(payslipDismissedRateEvents),
	payslipLines: many(payslipLines),
	employee: one(employees, {
		fields: [payslips.employeeId],
		references: [employees.id]
	}),
	user: one(users, {
		fields: [payslips.userId],
		references: [users.id]
	}),
}));

export const payslipLinesRelations = relations(payslipLines, ({one}) => ({
	paymentCategory: one(paymentCategories, {
		fields: [payslipLines.paymentCategoryId],
		references: [paymentCategories.id]
	}),
	payslip: one(payslips, {
		fields: [payslipLines.payslipId],
		references: [payslips.id]
	}),
}));

export const paymentCategoriesRelations = relations(paymentCategories, ({many}) => ({
	payslipLines: many(payslipLines),
	rateEvents: many(rateEvents),
}));

export const employeesRelations = relations(employees, ({many}) => ({
	payslips: many(payslips),
	rateEvents: many(rateEvents),
}));