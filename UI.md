# Finito — UI proposal

## Goal

Design a **single dashboard** UI for payroll specialists who need to:

- manage employee rates across payment categories;
- create payslips using rates effective on a selected date;
- see which historical payslips changed because of later rate edits;
- dismiss retroactive changes one at a time.

The main dashboard should look like a compact payroll workbench named **Payslippers**: a sticky date-navigation bar, one employee selector, a **Rates** section, and a **Payslips** section. Payslip creation and dismissal are opened from the dashboard as inline drawers, not as separate pages.

---

## Global layout

Use one page only. The first implementation should follow this main dashboard shape:

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Payslippers    [-month] [-day] Date [1/2/26 ▾]  [+month] [+day]      │
│                                      [Today]                          │
├───────────────────────────────────────────────────────────────────────┤
│ Employee: [John Doe ▾]                                                │
│                                                                       │
│ Rates:                                                                │
│ Category       Rate       Effective from  Last edit                   │
│ ───────────────────────────────────────────────────────────────────── │
│ Hourly         $10.00     1/2/26          2 min ago*  [Edit]          │
│ Overtime       $15.00     1/1/26          yesterday*  [Edit]          │
│ Commission     $25.00     12/1/25         last week*  [Edit]          │
│                                                                       │
│ Payslips:         
  [ + ]
│ ID   Employee   Date        Original total   Current total   Status   │
│ 12   John Doe   2026-02-01  $100.00          $200.00         Changed  │
│ 11   Jane Doe   2026-01-15  $750.00          $750.00         OK       │
│ 10   John Doe   2026-01-03  $300.00          $340.00         Changed  │
└───────────────────────────────────────────────────────────────────────┘


```

Recommended structure:

1. **Top bar**
   - Dashboard title: `Payslippers`.
   - Date navigation controls:
     - `[-month]`
     - `[-day]`
     - `Date [1/2/26 ▾]`
     - `[+month]`
     - `[+day]`
     - `[Today]`.

2. **Main dashboard body**
   - Employee selector at the top.
   - **Rates** section immediately below the employee selector.
   - **Payslips** section below the rates table.

3. **Inline drawers**
   - Used for rate edits, payslip creation, and dismissal confirmation.
   - Drawers overlay the dashboard but do not navigate away.

---

## Login / user context

No login screen is needed for this assignment.

Finito works with one fixed payroll-specialist user:

```text
Payroll specialist: Admin
```

UI implications:

- Do not add login, registration, logout, or session-selection screens.
- Keep the top bar focused on date navigation, not auth controls.
- Use the fixed user only as audit metadata for rate edits and dismissals.
- If a future version adds auth, keep the Payslippers dashboard unchanged and wrap it behind login.

---

## Effective date selector

Location: sticky top bar of the single dashboard.

```text
Payslippers [-month] [-day] Date [1/2/26 ▾] [+month] [+day]
                         [Today]
```

Behavior:

- Applies to all reads and writes on the dashboard.
- Reading:
  - the rate table shows the rate active on that date;
  - payslip totals are shown using rates active on each payslip date.
- Writing:
  - adding or editing a rate creates a new rate event with `effectiveDate = selected date`;
  - the selected date is shown in the rate edit form by default;
  - the payslip creation date defaults to the selected date.

Control behavior:

- `[-month]` and `[+month]` move the effective date by one month.
- `[-day]` and `[+day]` move the effective date by one day.
- `Date [1/2/26 ▾]` opens a date picker for direct selection.
- `[Today]` resets the effective date to today.

Visual treatment:

- Keep the date controls visible while the user scrolls rates and payslips.
- When the selected date changes, show a subtle toast:
  - `Viewing and writing as of 2026-02-01`.
- If the selected date is in the future, show a warning:
  - `Future date selected. New rate edits will start in the future.`

---

## Panel 1: Rates

Purpose: view and change the rate that applies on the effective date.

### Controls

```text
Employee: [John Doe ▾]

Rates:

Category       Rate       Effective from  Last edit
───────────────────────────────────────────────────
Hourly         $10.00     1/2/26          2 min ago*  [Edit]
Overtime       $15.00     1/1/26          yesterday*  [Edit]
Commission     $25.00     12/1/25         last week*  [Edit]
```

Notes:

- `Effective from` is the effective date of the rate event currently active for the selected date.
- `Last edit` is the creation time of that active rate event.
- The `*` marker means the row is the active rate event for the selected effective date.

### Rate edit flow

Clicking **Edit** opens an inline form or dashboard drawer:

```text
Edit rate for John Doe / Hourly

Effective date: [2026-02-01]
New rate:       [$ 10.00]
Note:           [Optional note for this change]

[Save rate edit] [Cancel]
```

Rules:

- `Effective date` defaults to the global effective date.
- The user may override it only if the UI explicitly explains:
  - `This edit will start on 2026-01-01 and may change older payslips.`
- Saving creates a new rate event; it does not overwrite history.
- After save:
  - close the form or drawer;
  - show a success toast;
  - refresh the rate table and payslip list in place;
  - if any payslips became retroactively changed, show a count in the payslip section.

### Empty state

If no rate exists for a category as of the effective date:

```text
No active rate for this category on 2026-02-01.
[Add rate]
```

---

## Panel 2: Create payslip flow

Purpose: create a dated payment using the rates that apply on the payslip date.

The **Create payslip** form should not be a third top-level column. To keep the main dashboard close to the Payslippers layout, open payslip creation from the **Payslips** section:

```text
Payslips: [Add payslip]
```

Clicking **Add payslip** opens an inline drawer inside the dashboard.

### Controls

```text
Create payslip

Employee: [John Doe ▾]
Date:     [2026-02-01]

Line items:
Category        Units      Rate used      Line total       Remove
Hourly          100        $10.00         $1,000.00        ×
Overtime         8         $15.00           $120.00        ×

[Add line item]

Total: $1,120.00
[Create payslip]
```

Behavior:

- `Date` defaults to the global effective date.
- When employee or date changes, resolve rates as of the payslip date.
- If a selected category has no rate on the payslip date:
  - show an inline error;
  - disable `Create payslip`;
  - provide a link: `Set rate for Hourly`.
- Total is computed immediately and shown before save.
- After save:
  - show `Payslip #12 created for John Doe on 2026-02-01`;
  - close the drawer;
  - refresh the payslip list in place.

### Suggested UX improvement

For each line item, show:

```text
Rate used: $10.00 from event on 2026-02-01
```

This makes the temporal calculation visible and easier to audit without leaving the dashboard.

---

## Panel 3: Payslip list with retroactive changes

Purpose: list all payslips and make retroactive changes obvious.

### Controls

```text
Payslips:

ID   Employee   Date        Original total   Current total   Status
12   John Doe   2026-02-01  $100.00          $200.00         Changed
11   Jane Doe   2026-01-15  $750.00          $750.00         OK
10   John Doe   2026-01-03  $300.00          $340.00         Changed
```

### Highlighting

A retroactively changed payslip should stand out visually:

- left border or full-row background in amber;
- badge: `Changed by later rate edit`;
- current total displayed in bold;
- original total displayed with a muted style.

Example row:

```text
┌───────────────────────────────────────────────────────────────────────┐
│ 12  John Doe  2026-02-01  Original $100.00  Current $200.00  Changed │
│     Most recent change: Hourly rate $10 → $20 effective 2026-01-01   │
│     [Dismiss latest change]                                           │
└───────────────────────────────────────────────────────────────────────┘
```

### Dismissal flow

Clicking **Dismiss latest change** opens an inline confirmation drawer inside the dashboard:

```text
Dismiss latest retroactive change?

Payslip: #12, John Doe, 2026-02-01
Current total: $200.00
After dismissal: $100.00

Change being dismissed:
Hourly rate changed from $10.00 to $20.00
Effective date: 2026-01-01
Created: 2026-02-05 14:30

[Dismiss change] [Cancel]
```

Behavior:

- Dismiss only the most recent non-dismissed rate edit affecting that payslip.
- After dismissal:
  - recalculate and show the new current total;
  - if another change still affects the payslip, keep it highlighted;
  - if no changes remain, remove the highlight and show `No active retroactive changes`.
- If multiple changes remain, show a small count:
  - `2 active retroactive changes remain`.

---

## Single dashboard behavior

The first implementation should use the **Payslippers** dashboard layout:

```text
Top date navigation
Employee selector
Rates table
Payslips table
```

Required interactions:

- The effective date selector remains visible while working with rates and payslip history.
- Rate edits, payslip creation, and dismissal actions update the dashboard in place.
- The user should not need to navigate to another page to complete the core assignment flow.
- If the screen is crowded, use drawers or inline forms, not separate pages.
- The main page should not start as a three-column layout. Rates and payslips should feel like sections of one dashboard.

---

## Responsive behavior

### Desktop

- Top date navigation remains sticky.
- Main content is a single dashboard column or a wide two-card layout:
  - **Rates** card above or beside **Payslips**.
  - **Payslips** table remains easy to scan horizontally.
- Drawers overlay the dashboard for editing rates, creating payslips, and dismissing changes.

### Tablet

- Keep the same section order:
  1. Employee selector;
  2. Rates;
  3. Payslips.
- Tables may use horizontal scrolling if needed.
- Date controls may wrap into two lines but should stay together in the top bar.

### Mobile

- Stack vertically:
  1. `Payslippers` title;
  2. date navigation controls;
  3. `[Today]`;
  4. employee selector;
  5. Rates;
  6. Payslips.
- Use drawers for rate edits, payslip creation, and dismissal.
- Do not split the app into separate screens.

---

## Important states to design

### Loading

- Show skeleton rows in rate and payslip tables.
- Keep date navigation usable, but disable employee-specific actions until data is available.

### Empty

Employee:

```text
No employees available.
```

Rates:

```text
No rates found for this employee on the selected date.
[Add a rate]
```

Payslips:

```text
No payslips yet.
[Add payslip]
```

### Validation errors

Examples:

- Missing rate for selected payslip date.
- Negative or zero units.
- Duplicate payment category in a payslip.
- Rate edit effective date is required.

Show errors inline next to the field that caused them.

### Success feedback

Use lightweight toasts:

- `Rate updated for John Doe / Hourly.`
- `Payslip created for John Doe.`
- `Latest retroactive change dismissed.`

---

## Accessibility notes

- Date controls must have clear labels:
  - `Previous month`;
  - `Previous day`;
  - `Effective date`;
  - `Next day`;
  - `Next month`;
  - `Today`.
- Tables should include visible headers.
- Retroactive-change badges should not rely on color alone:
  - use text such as `Changed`.
- Keyboard flow:
  - Tab through form fields;
  - Enter saves the active form;
  - Escape closes drawers or modal overlays.
- Confirmation drawers must have a clearly labeled destructive action:
  - `Dismiss change`.

---

## Acceptance checklist

The single dashboard should let a reviewer complete this flow without explanation:

1. Use the top date bar to select effective date `2026-02-01`.
2. Set John Doe's hourly rate to `$10` from the Rates table.
3. Open **Add payslip** from the Payslips section.
4. Create a payslip for John Doe dated `2026-02-01` with 10 hours.
5. Use the top date bar to select effective date `2026-01-01`.
6. Change John Doe's hourly rate to `$20`.
7. See the earlier payslip highlighted as retroactively changed in the Payslips section.
8. Open the payslip dismissal drawer.
9. Dismiss the latest change.
10. Confirm the payslip returns to its previous total without leaving the dashboard.

---

## Visual style

Suggested style:

- compact payroll workbench;
- clean, professional, spreadsheet-like;
- sticky top date-navigation bar;
- light background with strong contrast;
- amber for retroactive changes;
- green for successful creates/updates;
- red only for destructive actions;
- monospace or tabular numerics for money and dates.

Use tabular numbers for all financial columns so totals align vertically.

---

## Future improvements

If time allows, keep the single-dashboard structure and add:

- a rate history timeline per employee/category;
- a “what changed?” diff view for each payslip;
- bulk dismissal for multiple payslips affected by the same rate edit;
- filters by employee, date range, and changed/unchanged status;
- export to CSV.
