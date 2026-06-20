
# Finito — Home Assignment

## About

Finito builds software for payroll specialists. This assignment is a small, self-contained slice of the kind of problem we work on every day: time-aware rate management with retroactive change detection.

## Domain

| Entity | Notes |
| :---- | :---- |
| User | Payroll specialist using the app. Single fixed user — (no auth needed). |
| Employee | `id`, `name`, `birthday`. Seed a few; no UI needed. |
| Payment Category | `id`, `name` — e.g. Hourly Rate, Overtime Hourly, Commission, Global Pay. Seed a few; no UI needed. |
| Rate | What an employee earns per unit of a payment category (e.g. John Doe's hourly rate is $10). Rates change over time — this is the heart of the assignment. |
| Payslip | A dated payment for an employee. Contains one or more line items, each `{ payment_category, units }`. Total \= Σ (units × applicable rate). Includes a date and a reference to the user who created it. |

Example payslip: John Doe worked 100 hours at $10/hr plus 8 overtime hours at $15/hr → 100×10 \+ 8×15 \= $1,120.

## What to Build

### 1\. Rate management

- View the rates of an employee (across payment categories)  
- Add a new rate, or change an existing rate

### 2\. Payslip creation

- Pick an employee, pick a date, add line items `{ payment_category, units }`  
- On save, the total is computed from the rates that apply on the payslip's date  
- You do not need to support editing payslips after creation

### 3\. Effective date selector ("time travel")

A control at the top of the screen lets the user pick an effective date — the "as of" date for everything they read and write:

- **Reading:** rates are shown as they are on the effective date  
- **Writing:** a rate edit applies starting from the effective date

When the user edits a rate while the effective date is D, the system records: "starting on D, the rate is X." The change persists from D onwards until another edit overrides it.

The temporal data model is a key design choice — make sure you can defend yours.

### 4\. Payslip list with retroactive-change highlight

- List all payslips with their employee, date, and current total  
- A payslip is **retroactively changed** if a rate edit made *after* the payslip was created changes the rate that now applies to it  
- Highlight retroactively-changed payslips visually, and surface both the original total and the current total

**Example**

1. Effective date \= 1/2/26. Set John's hourly rate to $10.  
2. Create a payslip for John dated 1/2/26 with 10 hours → total $100.  
3. Change effective date to 1/1/26. Set John's hourly rate to $20.  
4. The payslip from step 2 is now retroactively changed — the rate that applies to it has shifted to $20, so its current total is $200. Highlight it.

### 5\. Dismiss a retroactive change

- For a highlighted payslip, let the user dismiss the most recent rate edit affecting it. Dismissing reverts the payslip to its prior total.  
- If multiple rate edits affect the payslip, dismiss removes them one at a time, most-recent first.

**Example**

- Initial state: John's hourly rate has some baseline value.  
- A payslip is created on 1/3/26 (call its total $X).  
- A rate edit is made effective 1/1/26.  
- A rate edit is made effective 1/2/26 (1st of February).  
- Both edits retroactively affect the 1/3/26 payslip.  
- First dismiss removes the 1/2 edit.  
- Second dismiss removes the 1/1 edit → payslip is back to $X.

(How you represent "dismissed" — soft-delete, dismissal record, etc. — is your call.)

## Out of Scope

- Auth, login, multi-user  
- UI for employees / payment categories (seed both)  
- Editing payslips after creation  
- Edge cases, race conditions, concurrent edits  
- Production-grade security

## Tech

Use any stack you're comfortable with. We work in TypeScript / Next.js / tRPC / Drizzle / SQLite, but pick what lets you ship something clean.

## Quality Bar-

- **Efficient** — don't over-fetch or over-recompute; think about how rate resolution scales as edit history grows  
- **Effective** — every requirement above works end-to-end  
- **Clear** — a reviewer should be able to read the code and understand the design choices without you in the room

## Tests

Write unit and/or e2e tests that:

- Cover the core flows (create rate → create payslip → edit rate)  
- Act as living documentation of how the app is meant to be used

## Submission

A Git repo including:

- Source code  
- A README covering: how to run it, how to run the tests, the design choices you made, and what you would change with more time

## Interview Follow-up

We'll have a follow-up discussion about the code. Be ready to go deep on:

- The temporal data model (how rates are stored, how "as of" reads work, how retroactive changes are detected, how dismiss works)  
- Trade-offs you considered and rejected

Understand every line you submit.
