PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS rate_event_payslips;
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

CREATE TABLE rate_event_payslips (
  rate_event_id INTEGER NOT NULL REFERENCES rate_events(id) ON DELETE CASCADE,
  payslip_id INTEGER NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,
  is_dismissed INTEGER NOT NULL DEFAULT 0,
  dismissed_at TEXT,
  dismissed_by_user_id INTEGER REFERENCES users(id),
  PRIMARY KEY (rate_event_id, payslip_id)
);

CREATE INDEX idx_rate_event_payslips_payslip_id
ON rate_event_payslips (payslip_id);

CREATE TRIGGER validate_rate_event_payslip_insert
BEFORE INSERT ON rate_event_payslips
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
)
BEGIN
  SELECT RAISE(
    ABORT,
    'rate_event_id must be a rate edit that affects payslip_id'
  );
END;
