/**
 * Author: Igor Michel
 * Purpose: Create LPODesk procurement tables: requests, approvals, documents, workflow_steps.
 * Last updated: 2026-03-11
 */
import '../loadEnv.js';
import pool from './pool.js';

const sql = `
-- requests: core procurement request table
CREATE TABLE IF NOT EXISTS requests (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  supplier_name TEXT,
  amount NUMERIC(15,2),
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','manager_approved','ict_approved','procurement_approved','director_approved','rejected','completed')),
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests(created_by);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'requests_updated_at' AND tgrelid = 'requests'::regclass) THEN
    CREATE TRIGGER requests_updated_at
      BEFORE UPDATE ON requests
      FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
  END IF;
END $$;

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

CREATE INDEX IF NOT EXISTS idx_approvals_request ON approvals(request_id);
CREATE INDEX IF NOT EXISTS idx_approvals_approver ON approvals(approver_id);

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

CREATE INDEX IF NOT EXISTS idx_documents_request ON documents(request_id);

-- workflow_steps: defines the approval chain order and conditions
CREATE TABLE IF NOT EXISTS workflow_steps (
  id SERIAL PRIMARY KEY,
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL,
  condition TEXT
);

-- Seed default workflow steps (only if table is empty)
INSERT INTO workflow_steps (step_order, role, condition)
SELECT * FROM (VALUES
  (1, 'manager', NULL::TEXT),
  (2, 'ict_manager', 'category=ICT Equipment'),
  (3, 'procurement', NULL::TEXT),
  (4, 'director', NULL::TEXT)
) AS v(step_order, role, condition)
WHERE NOT EXISTS (SELECT 1 FROM workflow_steps);

-- notifications: add request_id column if not already present
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS request_id INTEGER REFERENCES requests(id) ON DELETE SET NULL;

-- New roles for LPO workflow
INSERT INTO roles (id, role_name) VALUES
  (6, 'ICT Manager'),
  (7, 'Procurement Officer')
ON CONFLICT (id) DO UPDATE SET role_name = EXCLUDED.role_name;
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log('LPO migration completed successfully.');
  } catch (err) {
    console.error('LPO migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
