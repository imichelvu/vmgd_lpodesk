# VMGD LPODesk

Local Purchase Order Request Workflow System for the Vanuatu Meteorology and Geohazards Department.

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Deployment: PM2 + Nginx/Apache

## Core capabilities

- Procurement request creation, drafting, and submission.
- Multi-level approval workflow: Manager → ICT Manager (ICT only) → Procurement Officer → Director.
- Document upload for supplier quotes, invoices, and specifications.
- Role-based access: Staff, Manager, ICT Manager, Procurement Officer, Director, Admin.
- Email notifications at each workflow stage (SMTP-based).
- Delegation support for acting approvers.
- Audit trail via approvals table.
- Username or email login with password reset.

## Role IDs

| ID | Role |
|----|------|
| 1  | Staff |
| 2  | PSO (legacy) |
| 3  | Manager |
| 4  | Director |
| 5  | Admin |
| 6  | ICT Manager |
| 7  | Procurement Officer |

## Request Statuses

`draft` → `submitted` → `manager_approved` → `ict_approved` (ICT only) → `procurement_approved` → `director_approved` → `completed`

Or: `rejected` at any approval stage.

## Project structure

```text
lpo_request_workflow/
├── backend/
│   ├── src/
│   │   ├── constants/         # role IDs, request statuses
│   │   ├── controllers/       # requestController, approvalController, documentController, auth, users, ...
│   │   ├── db/                # schema.sql, migrate.js, migrate-lpo.js, seed.js, pool.js
│   │   ├── helpers/           # notifications.js (email)
│   │   ├── middleware/        # auth.js, checkRole.js
│   │   ├── models/            # requestModel.js, approvalModel.js
│   │   ├── routes/            # requestRoutes, approvalRoutes, documentRoutes, auth, users, ...
│   │   ├── services/          # requestService.js, workflowService.js
│   │   └── index.js
│   ├── uploads/               # uploaded documents (created at runtime)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/        # Layout, StatusBadge, Modal, Button, PageHeader, ...
│   │   ├── constants/         # applicationStatus.js
│   │   ├── context/           # AuthContext.jsx (ROLE_IDS, api helper)
│   │   ├── hooks/             # useApi.js, useRequestList.js, usePagination.js, ...
│   │   ├── pages/             # Dashboard, CreateRequest, MyRequests, PendingApprovals, RequestDetails, ...
│   │   ├── styles/            # CSS design tokens and component styles
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
├── deploy/
│   ├── nginx.lpodesk.conf
│   ├── apache2.lpodesk.conf
│   └── pm2.config.js
└── package.json               # root orchestrator scripts
```

## Quick start

```bash
# 1. Install dependencies
npm run install:all

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env: set DATABASE_URL, JWT_SECRET

# 3. Run migrations
npm run db:migrate          # creates core tables (users, roles, delegations, etc.)
npm run db:migrate:lpo      # creates LPO tables (requests, approvals, documents, workflow_steps)

# 4. Seed default roles and admin user
npm run db:seed
# Default admin credentials: admin / Admin123!

# 5. Start development servers
npm run dev:backend         # port 5000
npm run dev:frontend        # port 5173 (proxies /api to backend)
```

## API endpoints

### Requests
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/requests | Staff+ | Create new request |
| GET | /api/requests/mine | Staff+ | My own requests |
| GET | /api/requests/pending | Approver | Requests pending my approval |
| GET | /api/requests/:id | Auth | Request details |
| POST | /api/requests/:id/submit | Owner | Submit draft for approval |
| POST | /api/requests/:id/approve | Approver | Approve at current stage |
| POST | /api/requests/:id/reject | Approver | Reject request |
| GET | /api/requests/:id/approvals | Auth | Approval history |

### Documents
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/documents/upload | Auth | Upload file (multipart, field: `file`, body: `request_id`) |
| GET | /api/documents/request/:requestId | Auth | List documents for a request |

### Auth & Users
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Current user |
| POST | /api/auth/forgot-password | Send reset email |
| POST | /api/auth/reset-password | Reset with token |
| GET | /api/users | Admin: list users |
| POST | /api/users | Admin: create user |
| PUT | /api/users/:id | Admin: update user |
| DELETE | /api/users/:id | Admin: delete user |

## Deployment

```bash
npm run build:frontend
pm2 start deploy/pm2.config.js --env production
# Copy deploy/nginx.lpodesk.conf to /etc/nginx/sites-available/lpodesk
```
