-- VMGD Online Leave System - PostgreSQL Schema
-- Role IDs: 1=Staff, 2=PSO, 3=Manager, 4=Director, 5=Admin

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to set updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- divisions
CREATE TABLE IF NOT EXISTS divisions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER divisions_updated_at
  BEFORE UPDATE ON divisions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  vnpf_no VARCHAR(50),
  post_title VARCHAR(255),
  post_no VARCHAR(50),
  grade VARCHAR(50),
  department VARCHAR(255),
  ministry VARCHAR(255),
  entry_date DATE,
  division_id INTEGER REFERENCES divisions(id),
  reports_to_id INTEGER REFERENCES users(id),
  source VARCHAR(20) NOT NULL DEFAULT 'local',
  signature_data TEXT,                              -- registered base64 PNG signature; used automatically for leave applications and approvals
  signature_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- user_roles (many-to-many)
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

CREATE TRIGGER user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- delegations (acting supervisors)
CREATE TABLE IF NOT EXISTS delegations (
  id SERIAL PRIMARY KEY,
  delegator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delegatee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER delegations_updated_at
  BEFORE UPDATE ON delegations
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- leave balance policies (defaults per leave type)
CREATE TABLE IF NOT EXISTS leave_balance_policies (
  leave_type VARCHAR(100) PRIMARY KEY,
  default_allocation_days DECIMAL(7,2) NOT NULL DEFAULT 0,
  requires_balance BOOLEAN NOT NULL DEFAULT true,
  allow_negative BOOLEAN NOT NULL DEFAULT false,
  min_notice_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER leave_balance_policies_updated_at
  BEFORE UPDATE ON leave_balance_policies
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

INSERT INTO leave_balance_policies (leave_type, default_allocation_days, requires_balance, allow_negative, min_notice_days) VALUES
  ('Annual vacation', 0, true, false, 14),
  ('Home island', 10, true, false, 14),
  ('Sick leave', 21, true, false, 0),
  ('Maternity', 90, true, false, 14),
  ('Family', 5, true, false, 14),
  ('Compassionate', 5, true, false, 0),
  ('Sporting / Cultural / Religious', 5, true, false, 14),
  ('Leave without pay', 0, false, true, 14),
  ('Other', 0, false, true, 14)
ON CONFLICT (leave_type) DO NOTHING;

-- monthly accrual tiers (section 29 rules configurable by years of service)
CREATE TABLE IF NOT EXISTS leave_accrual_tiers (
  leave_type VARCHAR(100) NOT NULL,
  min_years INTEGER NOT NULL,
  monthly_days DECIMAL(6,3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (leave_type, min_years),
  CONSTRAINT leave_accrual_tiers_non_negative CHECK (min_years >= 0 AND monthly_days >= 0)
);

CREATE TRIGGER leave_accrual_tiers_updated_at
  BEFORE UPDATE ON leave_accrual_tiers
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

INSERT INTO leave_accrual_tiers (leave_type, min_years, monthly_days) VALUES
  ('Annual vacation', 0, 1.25),
  ('Annual vacation', 6, 1.75)
ON CONFLICT (leave_type, min_years) DO NOTHING;

-- leave balances per user/year/type
CREATE TABLE IF NOT EXISTS leave_balances (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(100) NOT NULL REFERENCES leave_balance_policies(leave_type) ON DELETE RESTRICT,
  year INTEGER NOT NULL,
  allocated_days DECIMAL(7,2) NOT NULL DEFAULT 0,
  carry_forward_days DECIMAL(7,2) NOT NULL DEFAULT 0,
  used_days DECIMAL(7,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, leave_type, year)
);

CREATE TRIGGER leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- overtime entries (staff extra hours for payment or TOIL)
CREATE TABLE IF NOT EXISTS overtime_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  work_date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  purpose VARCHAR(30) NOT NULL
    CHECK (purpose IN ('Overtime Payment', 'Time Off In Lieu')),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT overtime_entries_valid_range CHECK (
    start_datetime IS NULL
    OR end_datetime IS NULL
    OR end_datetime > start_datetime
  )
);

CREATE TRIGGER overtime_entries_updated_at
  BEFORE UPDATE ON overtime_entries
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- leave_applications (PSC Form 4-9 fields)
CREATE TABLE IF NOT EXISTS leave_applications (
  id SERIAL PRIMARY KEY,
  applicant_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type VARCHAR(100) NOT NULL,
  destination VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_half_day BOOLEAN NOT NULL DEFAULT false,
  half_day_time_start TIME,
  half_day_time_end TIME,
  total_working_days DECIMAL(5,2) NOT NULL DEFAULT 0,
  advance_pay BOOLEAN NOT NULL DEFAULT false,
  advance_pay_date DATE,
  reason_or_remarks TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending_PSO'
    CHECK (status IN ('Pending_PSO', 'Pending_Manager', 'Pending_Director', 'Approved', 'Disapproved')),
  pso_comment TEXT,
  manager_comment TEXT,
  director_comment TEXT,
  signature_data JSONB,
  approved_by_pso_id INTEGER REFERENCES users(id),
  approved_by_manager_id INTEGER REFERENCES users(id),
  approved_by_director_id INTEGER REFERENCES users(id),
  pso_approved_at TIMESTAMPTZ,
  manager_approved_at TIMESTAMPTZ,
  director_approved_at TIMESTAMPTZ,
  pso_signature_data TEXT,
  manager_signature_data TEXT,
  director_signature_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_leave_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER leave_applications_updated_at
  BEFORE UPDATE ON leave_applications
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- notifications (optional table for in-app + email)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_application_id INTEGER REFERENCES leave_applications(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- password_reset_tokens (for forgot-password flow)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_division ON users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_applicant ON leave_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_leave_applications_status ON leave_applications(status);
CREATE INDEX IF NOT EXISTS idx_leave_applications_dates ON leave_applications(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_delegations_dates ON delegations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_delegations_delegatee ON delegations(delegatee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_user_year ON leave_balances(user_id, year);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_user_date ON overtime_entries(user_id, work_date DESC);
