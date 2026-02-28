# VMGD LeaveDesk

Leave management system that replaces manual PSC Form 4-9 workflows.

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL

## Core capabilities

- PSC Form 4-9 submission with live preview overlay.
- Staff, supervisor, director, and admin dashboards.
- Role-based access using numeric role IDs.
- Delegation support for acting approvers.
- Email notifications for approval flow (SMTP-based).
- Username or email login.

## Project structure

```text
leave_application_workflow/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── db/
│   │   ├── helpers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── index.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── styles/            # split CSS modules (new)
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## Quick start

### 1) Install dependencies

From project root:

```bash
npm run install:all
```

### 2) Configure backend

Create `backend/.env` from example:

```bash
cp backend/.env.example backend/.env
```

Set at least:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN` (for local dev, usually `http://localhost:5173`)

Optional for email notifications:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `NOTIFICATION_FROM`
- `NOTIFICATION_NAME`
- `APP_URL` (used for clickable links in emails)

### 3) Prepare database

```bash
npm run db:migrate
npm run db:seed
```

Seed creates default admin:

- Username: `admin`
- Email: `admin@vmgd.gov.vu`
- Password: `Admin123!`

### 4) Run apps

In two terminals from project root:

```bash
npm run dev:backend
npm run dev:frontend
```

- Frontend: `http://localhost:5173`
- Backend API: `http://127.0.0.1:4000`

## Frontend environment

`frontend/.env` is the frontend config source.

Recommended local value:

```env
VITE_API_URL=http://127.0.0.1:4000/api
VITE_APP_NAME=VMGD LeaveDesk
```

Notes:

- `VITE_API_URL` should include `/api`.
- You can also use relative `/api` if you rely on Vite proxy.

## API endpoints (high-level)

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

### Leave

- `POST /api/leave`
- `GET /api/leave/mine`
- `GET /api/leave/supervisor`
- `GET /api/leave/director`
- `GET /api/leave/:id`
- `PATCH /api/leave/:id/approve`
- `POST /api/leave/resend-pending-notifications` (admin)

### Users / Admin

- `GET /api/users/divisions` (public lookup)
- `GET /api/users/roles` (admin)
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/users/bulk-delete`
- `POST /api/users/test-smtp`
- `POST /api/users/sync-ad`
- `POST /api/users/import-ad-users`

### Delegations (admin)

- `GET /api/delegations`
- `POST /api/delegations`
- `PATCH /api/delegations/:id`
- `DELETE /api/delegations/:id`

## Troubleshooting

- Backend health: `http://127.0.0.1:4000/api/health`
- Backend diagnostics: `http://127.0.0.1:4000/api/troubleshoot`
- If login hangs:
  - Ensure backend is running on the configured host/port.
  - Verify frontend `VITE_API_URL` points to backend `/api`.
  - Check browser dev tools for `/api/auth/login` and `/api/auth/me`.

## Notes on recent frontend cleanup

- Shared status labels moved to `frontend/src/constants/applicationStatus.js`.
- Reusable data hooks added:
  - `frontend/src/hooks/useRequestList.js`
  - `frontend/src/hooks/usePagination.js`
- Styles split into `frontend/src/styles/*` and imported via `frontend/src/styles/index.css`.