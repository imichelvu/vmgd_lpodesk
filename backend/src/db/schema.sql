-- LPODesk - Local Purchase Order Request Workflow - PostgreSQL Schema
-- Role IDs: 1=Staff, 2=PSO, 3=Manager, 4=Director, 5=Admin, 6=ICT Manager, 7=Procurement Officer

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

-- (Leave management tables removed — this is LPODesk, not LeaveDesk)


-- requests: core procurement request table
CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  supplier_name TEXT,
  amount NUMERIC(15,2),
  category TEXT NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'LPO'
    CHECK (payment_type IN ('LPO', 'Direct Payment')),
  budget_type  TEXT
    CHECK (budget_type IN ('Recurrent', 'Projects')),
  quote_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','manager_approved','ict_approved','procurement_approved','director_approved','rejected','completed')),
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- approvals: one row per approver decision per request
CREATE TABLE IF NOT EXISTS approvals (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  decision TEXT CHECK (decision IN ('approved','rejected')),
  comment TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- documents: uploaded supplier quotes / invoices / specs
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- workflow_steps: defines the approval chain order and conditions
CREATE TABLE IF NOT EXISTS workflow_steps (
  id SERIAL PRIMARY KEY,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL,
  condition TEXT
);

INSERT INTO workflow_steps (step_order, role, condition) VALUES
  (1, 'manager', NULL),
  (2, 'ict_manager', 'category=ICT Equipment'),
  (3, 'procurement', NULL),
  (4, 'director', NULL)
ON CONFLICT DO NOTHING;

-- notifications (in-app + email)
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL,
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_division ON users(division_id);
CREATE INDEX IF NOT EXISTS idx_users_reports_to ON users(reports_to_id);
CREATE INDEX IF NOT EXISTS idx_delegations_dates ON delegations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_delegations_delegatee ON delegations(delegatee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_approvals_request ON approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_documents_request ON documents(request_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
