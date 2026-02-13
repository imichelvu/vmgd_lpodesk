<<<<<<< HEAD
# VMGD Online Leave System

Leave Management System that replaces the manual **PSC Form 4-9**, built with React (frontend), Node.js/Express (backend), and PostgreSQL.

## Features

- **PSC Form 4-9** digital form: leave type, destination, dates, half-day option (08:00–12:00), auto-calculated working days (excluding weekends), advance pay warning (< 21 days), and signature pad.
- **Workflow**: Staff → PSO → Manager → Director. Notifications to the next approver at each step.
- **Acting supervisors**: Delegation tool (Admin) assigns a delegatee to act for a delegator over a date range; the delegatee gets approval rights and notifications.
- **Role-based dashboards**: Staff (my applications, new application), Supervisor (division approvals), Director (all divisions, final sign-off), Admin (users, roles, delegations).
- **Security**: JWT auth, bcrypt passwords, CORS, role checks by **Role ID** (1=Staff, 2=PSO, 3=Manager, 4=Director, 5=Admin).

## Project structure

```
leave_application_workflow/
├── backend/                 # Node.js / Express API
│   ├── src/
│   │   ├── constants/       # Role IDs, leave status
│   │   ├── controllers/
│   │   ├── db/              # pool, schema.sql, migrate.js, seed.js
│   │   ├── helpers/         # notifications (email + in-app)
│   │   ├── middleware/      # auth, checkRole (with delegation)
│   │   ├── routes/
│   │   └── index.js
│   ├── .env.example
│   └── package.json
├── frontend/                # React (Vite)
│   ├── src/
│   │   ├── components/      # Layout, PSCForm49, SignaturePad
│   │   ├── context/         # AuthContext
│   │   ├── hooks/           # useApi
│   │   ├── pages/           # Login, Dashboard, Supervisor, Director, Admin, etc.
│   │   ├── utils/           # workingDays, advance pay warning
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Setup

### 1. PostgreSQL

Create a database and user, then set `DATABASE_URL` in `backend/.env`:

```bash
createdb vmgd_leave
# In backend/.env: DATABASE_URL=postgresql://user:password@localhost:5432/vmgd_leave
```

### 2. Backend

From **project root**:

```bash
cp backend/.env.example backend/.env
# Edit backend/.env: DATABASE_URL, JWT_SECRET, CORS_ORIGIN, optional SMTP_*
npm run install:all
npm run db:migrate
npm run db:seed
npm run dev:backend
```

Or from the backend folder:

```bash
cd backend
cp .env.example .env
# Edit .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- Default admin: **admin@vmgd.gov.vu** / **Admin123!**
- Backend runs on http://localhost:4000 (ensure nothing else is using port 4000).

### 3. Frontend

From **project root** (in a second terminal):

```bash
npm run dev:frontend
```

Or from the frontend folder:

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173  
- API proxy: `/api` → http://localhost:4000

### If backend or frontend won’t start

- **From root**: Use `npm run dev:backend` and `npm run dev:frontend` (they run the apps from the correct directories).
- **Port in use**: Stop any process on port 4000 (backend) or 5173 (frontend), or set `PORT` in `backend/.env`.
- **Backend .env**: Ensure `backend/.env` exists (copy from `backend/.env.example`) and contains at least `DATABASE_URL` and `JWT_SECRET`.
- **Dependencies**: Run `npm install` inside both `backend` and `frontend` (or `npm run install:all` from root).  

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/login | — | Login (email, password) |
| GET | /api/auth/me | ✓ | Current user + role_ids |
| GET | /api/users/divisions | — | List divisions |
| GET | /api/users | ✓ Admin | List users |
| POST | /api/users | ✓ Admin | Create user |
| PATCH | /api/users/:id | ✓ Admin | Update user / role_ids |
| GET | /api/leave/mine | ✓ | My applications |
| POST | /api/leave | ✓ | Create application |
| GET | /api/leave/supervisor | ✓ PSO/Manager | Pending approvals (division + acting) |
| GET | /api/leave/director | ✓ Director | Pending Director sign-off |
| GET | /api/leave/:id | ✓ | Application detail |
| PATCH | /api/leave/:id/approve | ✓ PSO/Manager/Director | Approve or disapprove (comment required for disapprove) |
| GET/POST/PATCH/DELETE | /api/delegations | ✓ Admin | Delegation CRUD |

## Role IDs (numeric)

Use these in frontend routing and backend checks:

- **1** = Staff  
- **2** = PSO  
- **3** = Manager  
- **4** = Director  
- **5** = Admin  

One user can have multiple roles via `user_roles`. The `checkRole` middleware allows access if the user has the required role **or** an active delegation to act as someone who has that role.

## Database

- **divisions**: Admin, Geo-Hazards, ICT_Engineering, Climate, Observations, Forecast  
- **roles**: Staff, PSO, Manager, Director, Admin  
- **users**: full_name, email, password_hash, vnpf_no, post_title, post_no, grade, division_id, reports_to_id  
- **user_roles**: user_id, role_id  
- **delegations**: delegator_id, delegatee_id, start_date, end_date, is_active  
- **leave_applications**: PSC Form 4-9 fields, status (Pending_PSO → Pending_Manager → Pending_Director → Approved / Disapproved), signature_data (JSON)  
- All tables have `created_at` and `updated_at` with triggers.

## Notifications

- Helper `notifyUser()` in `backend/src/helpers/notifications.js` creates an in-app notification and, if SMTP is configured in `.env`, sends an email to the next approver in the workflow.
=======
# vmgd_leavedesk
VMGD Leave Application  Request App
>>>>>>> 8b0832450ec85f6e2aaa1dd395ffa48b04373091
