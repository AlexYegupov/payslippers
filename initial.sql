PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS payslip_dismissed_rate_events;
DROP TABLE IF EXISTS payslip_lines;
DROP TABLE IF EXISTS payslips;
DROP TABLE IF EXISTS rate_events;
DROP TABLE IF EXISTS payment_categories;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL
);

CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  birthday TEXT NOT NULL CHECK (
    birthday GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  )
);

CREATE TABLE payment_categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  unit_label TEXT NOT NULL
);

CREATE TABLE rate_events (
  id INTEGER PRIMARY KEY,

  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  payment_category_id INTEGER NOT NULL REFERENCES payment_categories(id) ON DELETE RESTRICT,

  effective_at TEXT NOT NULL CHECK (
    effective_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  rate_amount_cents INTEGER NOT NULL CHECK (rate_amount_cents >= 0),

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by_user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id),

  note TEXT
);

CREATE INDEX idx_rate_events_as_of
ON rate_events (
  employee_id,
  payment_category_id,
  effective_at DESC,
  created_at DESC,
  id DESC
);

CREATE INDEX idx_rate_events_created_after
ON rate_events (
  created_at,
  employee_id,
  payment_category_id,
  effective_at DESC
);

CREATE TABLE payslips (
  id INTEGER PRIMARY KEY,

  user_id INTEGER NOT NULL REFERENCES users(id),
  employee_id INTEGER NOT NULL REFERENCES employees(id),

  date TEXT NOT NULL CHECK (
    date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  total_at_creation_cents INTEGER NOT NULL CHECK (total_at_creation_cents >= 0),

  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_payslips_created_at
ON payslips (created_at);

CREATE INDEX idx_payslips_employee_date
ON payslips (employee_id, date);

CREATE TABLE payslip_lines (
  id INTEGER PRIMARY KEY,

  payslip_id INTEGER NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  payment_category_id INTEGER NOT NULL REFERENCES payment_categories(id),

  units INTEGER NOT NULL CHECK (units > 0),

  rate_amount_cents_at_creation INTEGER NOT NULL CHECK (rate_amount_cents_at_creation >= 0),
  total_at_creation_cents INTEGER NOT NULL CHECK (total_at_creation_cents >= 0),

  UNIQUE (payslip_id, payment_category_id),
  CHECK (total_at_creation_cents = units * rate_amount_cents_at_creation)
);

CREATE INDEX idx_payslip_lines_payslip
ON payslip_lines (payslip_id);

CREATE TABLE payslip_dismissed_rate_events (
  payslip_id INTEGER NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  rate_event_id INTEGER NOT NULL REFERENCES rate_events(id) ON DELETE CASCADE,

  dismissed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  dismissed_by_user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id),

  PRIMARY KEY (payslip_id, rate_event_id)
);

CREATE INDEX idx_payslip_dismissals_payslip
ON payslip_dismissed_rate_events (payslip_id, rate_event_id);

CREATE INDEX idx_payslip_dismissals_rate_event
ON payslip_dismissed_rate_events (rate_event_id, payslip_id);

CREATE TRIGGER validate_payslip_dismissed_rate_event_insert
BEFORE INSERT ON payslip_dismissed_rate_events
WHEN NOT EXISTS (
  SELECT 1
  FROM payslips p
  JOIN payslip_lines pl
    ON pl.payslip_id = p.id
  JOIN rate_events e
    ON e.id = NEW.rate_event_id
  WHERE p.id = NEW.payslip_id
    AND e.employee_id = p.employee_id
    AND e.payment_category_id = pl.payment_category_id
    AND e.effective_at <= p.date
    AND e.created_at > p.created_at
)
BEGIN
  SELECT RAISE(
    ABORT,
    'rate_event_id must be a post-creation rate edit that affects payslip_id'
  );
END;

INSERT INTO users (id, name)
VALUES (1, 'Payroll Specialist');

INSERT INTO employees (id, name, birthday)
VALUES
  (1, 'John Doe', '1990-01-15'),
  (2, 'Jane Smith', '1988-07-22'),
  (3, 'Alex Brown', '1995-03-10');

INSERT INTO payment_categories (id, name, unit_label)
VALUES
  (1, 'Hourly Rate', 'hour'),
  (2, 'Overtime Hourly', 'hour'),
  (3, 'Commission', 'configured minor unit'),
  (4, 'Global Pay', 'pay period');

-- Baseline rates make the database immediately usable for demo flows.
-- Time-based rates are stored as cents per hour.
-- Example: 1200 cents/hour = $12/hour.
INSERT INTO rate_events (
  id,
  employee_id,
  payment_category_id,
  effective_at,
  rate_amount_cents,
  created_at,
  created_by_user_id,
  note
)
VALUES
  (
    1,
    1,
    1,
    '2026-01-01',
    1200,
    '2026-01-01T09:00:00Z',
    1,
    'John Doe hourly baseline: 1200 cents/hour = $12/hour'
  ),
  (
    2,
    1,
    2,
    '2026-01-01',
    1800,
    '2026-01-01T09:00:00Z',
    1,
    'John Doe overtime baseline: 1800 cents/hour = $18/hour'
  ),
  (
    3,
    2,
    4,
    '2026-01-01',
    250000,
    '2026-01-01T09:00:00Z',
    1,
    'Jane Smith global pay baseline: $2,500 per pay period'
  ),
  (
    4,
    3,
    1,
    '2026-01-01',
    900,
    '2026-01-01T09:00:00Z',
    1,
    'Alex Brown hourly baseline: 900 cents/hour = $9/hour'
  );
