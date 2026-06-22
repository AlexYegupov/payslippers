# Plan: rate_event_payslips link table

## Goal

Replace the current on-the-fly retroactive edit detection with a materialized link table `rate_event_payslips` that is populated when a rate event is created. This simplifies read-path queries and satisfies the "efficient" quality bar from requirements.

## Problem with current approach

Currently, when reading the payslip list or payslip detail, the system:

1. Fetches ALL rate events for the employee with `effective_at <= payslip.date`
2. Filters out dismissed ones
3. Determines which are "retroactive" by checking `created_at > payslip.created_at` (bug: doesn't check if the edit actually affects the current rate)
4. Resolves current rate separately for each line item

This is O(rate_events) per payslip on every read, and the retroactive detection logic is incorrect.

## Solution

Create a link table `rate_event_payslips` that records which rate events affect which payslips. Populate it once at rate event creation time. Dismissal becomes a flag on the link row instead of a separate table.

---

## Step 1 — New DB table

```sql
CREATE TABLE rate_event_payslips (
  rate_event_id INTEGER NOT NULL REFERENCES rate_events(id) ON DELETE CASCADE,
  payslip_id INTEGER NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  dismissed_at TEXT,
  dismissed_by_user_id INTEGER REFERENCES users(id),
  PRIMARY KEY (rate_event_id, payslip_id)
);

CREATE INDEX idx_rate_event_payslips_payslip_id
  ON rate_event_payslips(payslip_id);
```

## Step 2 — Drop old table

```sql
DROP TABLE payslip_dismissed_rate_events;
```

## Step 3 — Migration of existing data

One-time migration: for each row in `payslip_dismissed_rate_events`, find the matching row in `rate_event_payslips` (created in step 4 logic) and set `is_dismissed = 1` with the original `dismissed_at` and `dismissed_by_user_id`.

## Step 4 — Write-path: populate link table on rate event creation

When creating a rate event, after inserting into `rate_events`, insert into `rate_event_payslips` for all affected payslips:

```sql
INSERT OR IGNORE INTO rate_event_payslips (rate_event_id, payslip_id, is_dismissed)
SELECT :new_rate_event_id, p.id, 0
FROM payslips p
JOIN payslip_lines pl ON pl.payslip_id = p.id
WHERE p.employee_id = :employee_id
  AND pl.payment_category_id = :payment_category_id
  AND p.date >= :effective_at
  AND :rate_event_created_at > p.created_at;
```

**No filtering by "is this the current rate"** — all potentially affecting edits are stored. The current rate is determined at read time by ordering `rate_events.effective_at DESC`.

## Step 5 — Read-path: current total for a payslip line

For each line item, find the current rate from the link table:

```sql
SELECT re.rate_amount_cents
FROM rate_event_payslips rep
JOIN rate_events re ON re.id = rep.rate_event_id
WHERE rep.payslip_id = :payslip_id
  AND re.payment_category_id = :category_id
  AND rep.is_dismissed = 0
ORDER BY re.effective_at DESC, re.created_at DESC, re.id DESC
LIMIT 1;
```

If no row found, fall back to `payslip_lines.rate_at_creation_cents` (data error state).

## Step 6 — Read-path: retroactive edits for a payslip

All non-dismissed rows from the link table for this payslip:

```sql
SELECT re.id, re.payment_category_id, pc.name,
       re.effective_at, re.rate_amount_cents, re.created_at
FROM rate_event_payslips rep
JOIN rate_events re ON re.id = rep.rate_event_id
JOIN payment_categories pc ON pc.id = re.payment_category_id
WHERE rep.payslip_id = :payslip_id
  AND rep.is_dismissed = 0
ORDER BY re.created_at DESC, re.effective_at DESC, re.id DESC;
```

`isRetroactivelyChanged = activeEdits.length > 0` (all rows in the link table are retroactive by definition — they were created after the payslip).

## Step 7 — Dismissal

UPDATE instead of INSERT:

```sql
UPDATE rate_event_payslips
SET is_dismissed = 1,
    dismissed_at = :now,
    dismissed_by_user_id = :user_id
WHERE rate_event_id = :rate_event_id
  AND payslip_id = :payslip_id
  AND is_dismissed = 0;
```

Validation: if no row affected → error (already dismissed or invalid pair).

## Step 8 — Update Drizzle schema

In `src/server/db/schema.ts`:

- Add `rateEventPayslips` table definition
- Remove `payslipDismissedRateEdits` table definition
- Update exports

## Step 9 — Update server actions

### `src/server/actions/payslips.ts`

- `getPayslipsForEmployee`: remove `candidateEdits`, `dismissedSet`, `activeEdits`, `activeRetroactiveEdits` logic. Read from `rate_event_payslips` + JOIN `rate_events`.
- `getPayslipDetail`: same changes.
- `resolveCurrentRate`: simplify to use link table.
- `dismissRateEditForPayslip`: UPDATE instead of INSERT.

### Rate creation action (wherever rate events are created)

- After inserting rate event, insert into `rate_event_payslips` using the query from Step 4.

## Step 10 — Update reset/seed scripts

- `reset.ts`: add `rate_event_payslips` to the cleanup list, remove `payslip_dismissed_rate_events`
- `initial.sql` / seed: add `rate_event_payslips` DDL, remove `payslip_dismissed_rate_events` DDL

## Step 11 — Tests

Update/add tests for:

1. Creating rate event → link rows created for all affected payslips
2. Dismissal → `is_dismissed = 1`, current total recalculates
3. Bug scenario: rate=10 (jun 10) created after rate=13 (jun 13) — both in link table, but only rate=13 is current
4. Dismiss rate=13 → rate=10 becomes current again
5. Dismissal of one payslip doesn't affect others
6. Original total remains unchanged after rate edits

---

## Files changed

| File | Change |
|------|--------|
| `initial.sql` | Add `rate_event_payslips` DDL, remove `payslip_dismissed_rate_events` DDL |
| `src/server/db/schema.ts` | Add `rateEventPayslips`, remove `payslipDismissedRateEdits` |
| `src/server/actions/payslips.ts` | Simplify read-path, update dismissal |
| Rate creation action | Add link table population |
| `reset.ts` | Update cleanup list |
| Tests | Update for new logic |

---

## Rollback plan

If needed, reverse:
1. Recreate `payslip_dismissed_rate_events` from `rate_event_payslips WHERE is_dismissed = 1`
2. Drop `rate_event_payslips`
3. Revert code changes
