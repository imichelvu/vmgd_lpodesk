# Software Requirements Specification (SRS)
## VMGD LeaveDesk — Online Leave Management System

| Field | Value |
|---|---|
| Document version | 1.0 |
| Status | Draft |
| Author | Igor Michel |
| Organisation | Vanuatu Meteorology & Geo-Hazards Department (VMGD) |
| Ministry | Ministry of Climate Change |
| Date | March 2026 |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Stakeholders and User Classes](#3-stakeholders-and-user-classes)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [External Interface Requirements](#6-external-interface-requirements)
7. [System Constraints](#7-system-constraints)
8. [Data Requirements](#8-data-requirements)
9. [Business Rules](#9-business-rules)
10. [Appendices](#10-appendices)

---

## 1. Introduction

### 1.1 Purpose

This document specifies the software requirements for **VMGD LeaveDesk**, a web-based leave management system designed to replace the manual paper-based PSC Form 4-9 workflow currently in use at the Vanuatu Meteorology & Geo-Hazards Department. It serves as the authoritative reference for developers, testers, system administrators, and project stakeholders.

### 1.2 Scope

LeaveDesk automates the full life cycle of a staff leave application — from submission through multi-level approval to final record keeping — in compliance with the **Public Service Staff Rules Manual (PSSRM)** and the **Employment Act [Cap 160] of Vanuatu**. It also provides overtime and Time Off In Lieu (TOIL) tracking with PSSRM-compliant rules.

**In scope:**
- Staff leave application (PSC Form 4-9)
- Multi-level approval workflow (Superior → Director)
- Leave balance accrual and deduction engine
- Overtime & TOIL recording and entitlement calculation
- Email notifications to approvers and applicants
- Role-based access control (Staff, PSO, Manager, Director, Admin)
- Admin panel for user, delegation, policy, and settings management
- Printable approved PSC Form 4-9 with digital signatures
- Deployment on Ubuntu / Apache2 / PM2

**Out of scope:**
- Payroll integration
- Biometric or physical attendance hardware integration
- Mobile native applications (iOS/Android)
- Integration with Active Directory (AD sync available as optional import only)

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| **VMGD** | Vanuatu Meteorology & Geo-Hazards Department |
| **PSSRM** | Public Service Staff Rules Manual (Vanuatu) |
| **PSC** | Public Service Commission |
| **PSO** | Principal Staff Officer (immediate supervisor) |
| **TOIL** | Time Off In Lieu — compensatory time off earned for overtime worked |
| **SRS** | Software Requirements Specification |
| **RBAC** | Role-Based Access Control |
| **JWT** | JSON Web Token — authentication mechanism |
| **SPA** | Single Page Application |
| **PM2** | Node.js production process manager |
| **API** | Application Programming Interface |
| **SMTP** | Simple Mail Transfer Protocol |

### 1.4 References

- PSSRM Chapter 3 — Hours of Work
- PSSRM Chapter 4 — Work Related Allowances (Overtime, Unsocial Hours)
- Employment Act [Cap 160] s.29 — Annual Leave entitlements
- PSC Form 4-9 — Leave Application Form
- PSC Form 4-2 — Overtime Claim Form

---

## 2. Overall Description

### 2.1 Product Perspective

LeaveDesk is a standalone web application accessed via a browser at `http://leavedesk.vmgd.gov.vu`. It replaces all paper-based leave forms, physical signature gathering, and manual email chains. The system sits behind Apache2 which serves the React frontend and proxies API calls to the Node.js backend, which persists data in PostgreSQL.

```
Staff Browser
     │
     ▼
Apache2 (port 80)
  ├── /           → React SPA (frontend/dist)
  └── /api/*      → Node.js / Express (port 5000)
                         │
                         └── PostgreSQL (port 5432)
```

### 2.2 Product Functions Summary

| Module | Key Functions |
|---|---|
| Authentication | Login, forgot password, JWT session management |
| Leave Application | Create, view, print PSC Form 4-9 |
| Approval Workflow | PSO/Manager approval, Director sign-off, delegation |
| Leave Balance | Accrual, deduction, carry-forward, balance display |
| Overtime & TOIL | Record extra hours, TOIL entitlement calculation |
| Notifications | Email to approvers and applicants at each workflow stage |
| Admin | User CRUD, role assignment, leave policies, settings |
| Profile | Registered signature management |

### 2.3 Operating Environment

- **Client:** Any modern browser (Chrome, Firefox, Edge, Safari) on desktop or mobile
- **Server OS:** Ubuntu 20.04 / 22.04 LTS
- **Web server:** Apache2 with `mod_proxy`, `mod_rewrite`, `mod_headers`
- **Runtime:** Node.js 18+
- **Database:** PostgreSQL 14+
- **Process manager:** PM2
- **Network:** Internal VMGD network and internet access via `http://leavedesk.vmgd.gov.vu`

---

## 3. Stakeholders and User Classes

### 3.1 User Roles

| Role | ID | Description |
|---|---|---|
| **Staff** | 1 | Any VMGD employee. Submits leave applications and records overtime. |
| **PSO** | 2 | Principal Staff Officer. First-level approver for subordinates' leave. |
| **Manager** | 3 | Division Manager. Approves leave for direct reports not assigned a PSO, and reviews PSO-approved applications before Director. |
| **Director** | 4 | Final approver. Signs off all leave applications after Manager/PSO stage. |
| **Admin** | 5 | HR / IT Administrator. Full system access — manages users, roles, policies, settings. |

A user may hold multiple roles simultaneously (e.g., a Manager is also a Staff member who can apply for leave).

### 3.2 Approval Hierarchy

```
Staff submits
    └── PSO or Manager (first approval)
            └── Director (final approval)
                    └── Status: Approved
```

---

## 4. Functional Requirements

### 4.1 Authentication Module

| ID | Requirement |
|---|---|
| AUTH-01 | The system shall allow users to log in with a username or email address and password. |
| AUTH-02 | The system shall issue a JWT upon successful login, valid for 7 days by default. |
| AUTH-03 | The system shall provide a "Forgot password" flow that sends a time-limited reset link to the user's registered email. |
| AUTH-04 | Password reset tokens shall expire after 1 hour. |
| AUTH-05 | The system shall expose a `GET /api/auth/me` endpoint returning the current user's profile including role IDs and `has_signature` flag. |
| AUTH-06 | Failed login attempts shall return a generic error without revealing whether the username or password is incorrect. |
| AUTH-07 | All API endpoints except `/api/auth/login` and `/api/auth/forgot-password` shall require a valid JWT. |

### 4.2 Signature Management

| ID | Requirement |
|---|---|
| SIG-01 | Each user shall register exactly one digital signature via the My Profile page, drawn using a canvas signature pad. |
| SIG-02 | The signature shall be stored as a base64-encoded PNG data URL in the `users.signature_data` column. |
| SIG-03 | The system shall reject leave application submissions if the applicant has no registered signature. |
| SIG-04 | The system shall reject approval actions if the approver has no registered signature. |
| SIG-05 | A registered signature shall be applied automatically — staff do not re-draw it per application. |
| SIG-06 | Users shall be able to update or delete their registered signature at any time via My Profile. |
| SIG-07 | The sidebar navigation shall display a ⚠ warning icon next to the user's name when no signature is registered. |
| SIG-08 | Signature images shall not exceed 200 KB (base64). |

### 4.3 Leave Application (PSC Form 4-9)

| ID | Requirement |
|---|---|
| LA-01 | Staff shall submit a leave application using an online equivalent of PSC Form 4-9. |
| LA-02 | Leave types available: Annual vacation, Home island, Sick leave, Maternity, Family, Compassionate, Sporting/Cultural/Religious, Time Off In Lieu, Leave without pay, Other. |
| LA-03 | The form shall calculate total working days automatically based on start and end dates (Monday–Friday, excluding weekends). |
| LA-04 | When "Date & time range" is selected, the system shall calculate total working days as elapsed hours ÷ 8, rounded to 1 decimal place, using a standard 8-hour workday (08:00–17:00 excluding 1-hour lunch). |
| LA-05 | A destination field shall support a searchable dropdown of previously used destinations. |
| LA-06 | Annual vacation applications shall be blocked if submitted fewer than 14 days before the start date. |
| LA-07 | Applications shall be blocked if the requested days exceed the available balance for the selected leave type. |
| LA-08 | A live PSC Form 4-9 preview with real-time overlay of entered data and registered signature shall be displayed alongside the form on desktop. |
| LA-09 | Submitted applications shall enter status `Pending Superior` and trigger email notifications to all eligible PSO/Manager approvers. |
| LA-10 | Staff shall be able to view all their own applications from the Dashboard in a paginated, accordion list ordered by most recent. |
| LA-11 | Visual urgency indicators shall highlight pending applications whose start date is overdue or within 3 days. |

### 4.4 Approval Workflow

| ID | Requirement |
|---|---|
| AW-01 | PSO and Manager users shall see a pending approval queue for all staff under their supervision. |
| AW-02 | Director users shall see all applications that have passed the Superior stage. |
| AW-03 | Approvers shall be able to approve or disapprove with a mandatory comment on disapproval. |
| AW-04 | Approving at the Superior stage shall advance status to `Pending Director`. |
| AW-05 | Approving at Director stage shall advance status to `Approved` and deduct the days from the staff member's leave balance. |
| AW-06 | Disapproving at any stage shall set status to `Disapproved` with no further action required. |
| AW-07 | The approver's registered signature shall be automatically overlaid on the printed form at their respective signature field. |
| AW-08 | Each approval action shall record the approver's name, role, and timestamp. |
| AW-09 | The system shall prevent self-approval — an approver cannot approve their own application. |
| AW-10 | Supervisor and Director views shall support pagination (20 per page) and filtering by division and leave type. |
| AW-11 | A History tab shall show all past approval/disapproval actions with date range filters. |
| AW-12 | A counter on the History tab shall display the number of actions taken in the last 7 days. |

### 4.5 Delegation

| ID | Requirement |
|---|---|
| DEL-01 | An Admin shall be able to assign a delegation period where one user acts on behalf of another. |
| DEL-02 | During an active delegation, the acting user's approval queue shall include applications belonging to the delegator. |
| DEL-03 | Applications routed via delegation shall display "(Acting for [Name])" in the approver's list view. |

### 4.6 Leave Balance Engine

| ID | Requirement |
|---|---|
| LB-01 | Annual vacation shall accrue at 1.25 days per month worked for employees with fewer than 6 years of service. |
| LB-02 | Annual vacation shall accrue at 1.75 days per month worked for employees with 6 or more years of service (Employment Act [Cap 160] s.29). |
| LB-03 | Accrual rates shall be configurable per leave type via the Admin Leave Policies panel without code changes. |
| LB-04 | Leave balances shall be displayed on the user dashboard, broken down by leave type. |
| LB-05 | The system shall deduct `total_working_days` from the user's balance upon Director approval. |
| LB-06 | Carry-forward days shall be supported and visible in the balance breakdown. |
| LB-07 | Admin shall be able to manually adjust a user's allocated, carry-forward, and used days. |
| LB-08 | TOIL balance shall be computed dynamically: `SUM(overtime net hours × multiplier) − SUM(approved/pending TOIL leave hours)`. TOIL is not stored as a static balance. |

### 4.7 Overtime & TOIL

| ID | Requirement |
|---|---|
| OT-01 | Staff shall record extra hours via a modal form with separate date and time inputs for start and end. |
| OT-02 | The system shall calculate elapsed hours and allow a break/deduction input; net worked hours = elapsed − break. |
| OT-03 | Net worked hours must be at least 1 hour to qualify for overtime/TOIL per PSSRM s.4.1(e). |
| OT-04 | Overtime types shall be: Weekend / Field Work, Emergency Callout, Standby Duty, Overseas Mission, General Overtime. |
| OT-05 | A location field (optional for most types, prompted for Field Work, Emergency Callout, and Overseas Mission) shall be recorded with each entry. |
| OT-06 | The TOIL multiplier (default 1.25 per PSSRM s.4.1(b)/(c)) shall be configurable by Admin via the Settings panel. |
| OT-07 | TOIL expiry (default 3 months per PSSRM s.4.1(b)) shall be configurable by Admin. |
| OT-08 | The system shall auto-detect unsocial hours (entries spanning Saturday or Sunday) and display an informational notice. |
| OT-09 | TOIL-adjusted entitlement = net hours × multiplier. This shall be shown on the Overtime summary stats. |
| OT-10 | Staff shall be able to filter their overtime records by type and date range. |
| OT-11 | An overtime entry spanning more than 24 hours (e.g., multi-day overseas mission) shall be accepted up to a maximum of 31 days per entry. |

### 4.8 Email Notifications

| ID | Requirement |
|---|---|
| NTF-01 | When a leave application is submitted, an email shall be sent to all eligible PSO and Manager approvers. |
| NTF-02 | When an application is approved or disapproved at any stage, the applicant shall receive an email notification. |
| NTF-03 | When an application advances to Director stage, the Director shall receive an email notification. |
| NTF-04 | All notification emails shall include a direct clickable link to the application detail page. |
| NTF-05 | Emails shall be professionally formatted with the application details, status, and approver information. |
| NTF-06 | The Admin panel shall provide a "Resend pending notifications" function to re-send emails for all still-pending applications. |
| NTF-07 | The notification sender name and from-address shall be configurable via `NOTIFICATION_NAME` and `NOTIFICATION_FROM` environment variables. |

### 4.9 Printable Form

| ID | Requirement |
|---|---|
| PF-01 | A fully approved leave application shall be printable as a single A4 page. |
| PF-02 | The printable form shall overlay all applicant data, approver names, dates, and digital signatures on an exact HTML replica of PSC Form 4-9. |
| PF-03 | All signature images shall render with transparent backgrounds. |
| PF-04 | The "Leave Approved: Yes/No" field shall circle the correct option based on the application status. |
| PF-05 | The print layout shall fit within one A4 page using CSS `@page` and `zoom` scaling. |

### 4.10 Admin Panel (`/settings`)

| ID | Requirement |
|---|---|
| ADM-01 | Admin shall perform full CRUD operations on users (create, read, update, delete). |
| ADM-02 | User fields shall include: full name, username, email, password, VNPF no., post title, post no., grade, department, ministry, entry date, division, reports-to (supervisor), roles. |
| ADM-03 | Admin shall assign one or more roles to each user. Roles shall be loaded from the database dynamically. |
| ADM-04 | Admin shall manage active delegations (delegator, delegatee, start date, end date). |
| ADM-05 | Admin shall manage leave balance allocations per user per year. |
| ADM-06 | Admin shall manage leave policies (default allocation, requires balance, allow negative, min notice days). |
| ADM-07 | Admin shall manage accrual tiers (min years of service → monthly accrual rate) per leave type. |
| ADM-08 | Admin shall configure the TOIL multiplier and TOIL expiry months via the TOIL Rules tab. |
| ADM-09 | Admin shall import users from Active Directory via LDAP with username/password credentials. |
| ADM-10 | The user list shall support search filtering with 300 ms debounce. |
| ADM-11 | The user list shall support pagination (20 per page) and bulk delete. |
| ADM-12 | Admin shall trigger re-sending of pending approval email notifications. |

### 4.11 FAQ

| ID | Requirement |
|---|---|
| FAQ-01 | A FAQ page shall be available to all authenticated users. |
| FAQ-02 | FAQ items shall be organised into sections: Signature, Leave Applications, Approval Workflow, Overtime & TOIL, Leave Balances, Account & Profile. |
| FAQ-03 | A live search input shall filter FAQ items across all sections in real time. |
| FAQ-04 | All PSSRM-referenced rules (hours of work, overtime eligibility, unsocial hours, TOIL rates, lateness) shall be accurately documented in the FAQ. |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement |
|---|---|
| PER-01 | Page load time (first contentful paint) shall be under 3 seconds on a 10 Mbps connection. |
| PER-02 | API response time for list endpoints shall be under 500 ms for up to 1,000 records. |
| PER-03 | The production JavaScript bundle shall not exceed 500 KB gzipped. |
| PER-04 | Database queries shall use indexes on `user_id`, `status`, `start_date`, and `division_id` columns. |

### 5.2 Security

| ID | Requirement |
|---|---|
| SEC-01 | All passwords shall be hashed using `bcryptjs` with a minimum cost factor of 10. |
| SEC-02 | JWT secrets shall be stored in environment variables and never committed to the repository. |
| SEC-03 | API endpoints shall enforce RBAC — role checks shall occur server-side, not only in the frontend. |
| SEC-04 | CORS shall be restricted to the configured `CORS_ORIGIN` environment variable. |
| SEC-05 | HTTP response headers shall include `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy`. |
| SEC-06 | Signature data (base64 PNG) shall only be accessible to the owning user and returned only when explicitly requested. |
| SEC-07 | SQL queries shall use parameterised statements exclusively — no string concatenation of user input. |
| SEC-08 | The backend shall bind to `127.0.0.1` in production — only accessible via Apache2 reverse proxy. |

### 5.3 Reliability

| ID | Requirement |
|---|---|
| REL-01 | The system shall use PM2 with auto-restart to recover from unexpected backend crashes. |
| REL-02 | All database mutations shall use transactions with explicit `COMMIT`/`ROLLBACK`. |
| REL-03 | All migration scripts shall be idempotent (safe to re-run without side effects). |
| REL-04 | The backend shall handle `EADDRINUSE` port conflicts with a clear error message and corrective instruction. |

### 5.4 Usability

| ID | Requirement |
|---|---|
| USE-01 | The interface shall be responsive and fully functional on mobile devices (minimum 320 px width). |
| USE-02 | The design shall follow a Windows 11-inspired style with consistent spacing, typography, and colour tokens. |
| USE-03 | Page headers, navigation labels, and status badges shall be consistent across all pages. |
| USE-04 | A full-page branded loader with animated green sinusoid shall be displayed during initial authentication checks. |
| USE-05 | All forms shall provide inline validation with clear error messages before submission. |
| USE-06 | All data tables shall be paginated with a maximum of 20 items per page. |
| USE-07 | The left sidebar navigation shall highlight the active route and be collapsible on mobile. |

### 5.5 Maintainability

| ID | Requirement |
|---|---|
| MNT-01 | CSS shall be split into themed token files (`tokens-base.css`, `layout.css`, `components.css`, `nav.css`, `responsive.css`). |
| MNT-02 | Reusable React components (Button, Modal, PageHeader, StatsRow, ConfirmDialog) shall be used consistently. |
| MNT-03 | Backend business logic shall be separated into controllers, services, helpers, and routes. |
| MNT-04 | All configurable values (TOIL multiplier, expiry, app name, API URL) shall be stored in environment variables or the `app_settings` database table — never hard-coded. |
| MNT-05 | The application name displayed in the UI shall be read exclusively from `VITE_APP_NAME` in `.env`. |

### 5.6 Deployability

| ID | Requirement |
|---|---|
| DEP-01 | A single shell script (`deploy/update.sh`) shall automate: git pull, backend install, migrations, frontend build, and PM2 reload. |
| DEP-02 | Apache2 virtual host configuration shall be provided in `deploy/apache2.leavedesk.conf`. |
| DEP-03 | PM2 process configuration shall be provided in `deploy/pm2.config.js`. |
| DEP-04 | A step-by-step deployment guide shall be maintained in `deploy/DEPLOY.md`. |
| DEP-05 | The system shall support HTTPS upgrade via Let's Encrypt (`certbot --apache`) without application code changes. |

---

## 6. External Interface Requirements

### 6.1 User Interface

- React 18 SPA with React Router DOM v6
- Vite 5 build tool
- Custom CSS design system (no external UI framework)
- SVG-based animated loader
- `react-signature-canvas` for signature registration

### 6.2 Backend API

- RESTful JSON API over HTTP
- Base path: `/api`
- Authentication: `Authorization: Bearer <JWT>` header

**Key endpoints:**

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/auth/me` | Current user profile |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Complete password reset |
| GET | `/api/leave/balances` | User's leave balances |
| POST | `/api/leave` | Submit leave application |
| GET | `/api/leave/mine` | User's own applications |
| PATCH | `/api/leave/:id/approve` | Approve or disapprove |
| GET | `/api/leave/toil-balance` | User's TOIL balance snapshot |
| GET | `/api/overtime/mine` | User's overtime entries |
| POST | `/api/overtime` | Record overtime entry |
| GET | `/api/profile/signature` | Signature status |
| PUT | `/api/profile/signature` | Save signature |
| GET | `/api/settings` | All app settings |
| PUT | `/api/settings/:key` | Update a setting (Admin) |
| GET | `/api/users` | All users (Admin) |
| POST | `/api/users` | Create user (Admin) |

### 6.3 Database

- PostgreSQL 14+
- Connection via `DATABASE_URL` environment variable (connection string)
- Connection pooling via `pg` Pool with default max 10 connections

### 6.4 Email (SMTP)

- Provider: configurable (default: Gmail SMTP)
- Protocol: SMTP over SSL (port 465)
- Configuration: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- Sender: `NOTIFICATION_FROM`, `NOTIFICATION_NAME`

---

## 7. System Constraints

| Constraint | Detail |
|---|---|
| Policy compliance | All leave calculations must comply with PSSRM and Employment Act [Cap 160] |
| Language | English only |
| Time zone | Pacific/Efate (UTC+11) |
| Browser support | Chrome 100+, Firefox 100+, Edge 100+, Safari 15+ |
| Max signature size | 200 KB base64 PNG |
| Max request body | 5 MB (Apache2 `LimitRequestBody`) |
| Node.js version | 18 LTS minimum |
| PostgreSQL version | 14 minimum |

---

## 8. Data Requirements

### 8.1 Key Entities

| Entity | Primary Key | Description |
|---|---|---|
| `users` | `id` (serial) | All system users with profile, grade, and signature |
| `roles` | `id` (serial) | Staff, PSO, Manager, Director, Admin |
| `user_roles` | `(user_id, role_id)` | Many-to-many role assignments |
| `divisions` | `id` (serial) | Organisational units |
| `delegations` | `id` (serial) | Temporary acting supervisor assignments |
| `leave_balance_policies` | `leave_type` (text) | Leave type rules and defaults |
| `leave_accrual_tiers` | `(leave_type, min_years)` | Monthly accrual rates by years of service |
| `leave_balances` | `(user_id, leave_type, year)` | Per-user per-year balances |
| `leave_applications` | `id` (serial) | PSC Form 4-9 submissions with full approval chain |
| `overtime_entries` | `id` (serial) | Extra hours records with type, break, location |
| `app_settings` | `key` (text) | Configurable system values (TOIL multiplier, etc.) |
| `notifications` | `id` (serial) | In-app and email notification log |
| `password_reset_tokens` | `id` (serial) | Time-limited password reset tokens |

### 8.2 Data Retention

- Leave applications: indefinite (audit trail)
- Overtime entries: indefinite (payroll reference)
- Password reset tokens: deleted after use or expiry
- Notifications: indefinite

---

## 9. Business Rules

| ID | Rule | Source |
|---|---|---|
| BR-01 | Standard working week is 40 hours: 08:00–12:00 and 13:00–17:00, Monday to Friday. | PSSRM s.3.1 |
| BR-02 | Annual vacation accrues at 1.25 days/month for < 6 years of service. | Employment Act Cap 160 s.29 |
| BR-03 | Annual vacation accrues at 1.75 days/month for ≥ 6 years of service. | Employment Act Cap 160 s.29 |
| BR-04 | Leave requests must be submitted ≥ 14 days before start date (except Sick, Compassionate, Family). | PSSRM |
| BR-05 | TOIL is earned at 1.25 hours off per overtime hour worked (configurable). | PSSRM s.4.1(b)/(c) |
| BR-06 | TOIL must be taken within 3 months of the approved overtime date (configurable). | PSSRM s.4.1(b) |
| BR-07 | A minimum of 1 net overtime hour per working day is required to qualify for overtime or TOIL. | PSSRM s.4.1(e) |
| BR-08 | Overtime must be directed in writing by a supervisor before it is performed. | PSSRM s.4.1(f) |
| BR-09 | Unsocial hours = 08:00–17:00 on Saturdays, Sundays, and Official Public Holidays only. Weekday evenings are not unsocial hours. | PSSRM s.4.1 Unsocial Hours |
| BR-10 | Lateness of ≥ 1 hour without permission requires make-up hours. Accumulated 8 hours = 1 absence incident. | PSSRM s.63 |
| BR-11 | 10 or more absence incidents = disciplinary offence. | PSSRM s.63 |
| BR-12 | Supervisor must conduct counselling at ≥ 3 absence incidents in any 6-month period. | PSSRM s.63 |

---

## 10. Appendices

### Appendix A — Status Flow

```
Submitted
    │
    ▼
Pending Superior  ──(disapprove)──► Disapproved
    │
    │ (approve)
    ▼
Pending Director  ──(disapprove)──► Disapproved
    │
    │ (approve)
    ▼
Approved
```

### Appendix B — Leave Balance Calculation (Annual Vacation)

```
years_of_service = current_year − entry_date.year
monthly_rate     = 1.75 if years_of_service ≥ 6 else 1.25
months_worked    = months from max(entry_date, year_start) to today
allocated_days   = months_worked × monthly_rate
available_days   = allocated_days + carry_forward_days − used_days
```

### Appendix C — TOIL Balance Calculation

```
toil_multiplier   = app_settings['toil_multiplier']      (default 1.25)
toil_expiry       = app_settings['toil_expiry_months']   (default 3)

earned_hours      = SUM(overtime_entries.hours
                        WHERE created_at >= NOW() − expiry interval)
                    × toil_multiplier

used_hours        = SUM(leave_applications.total_working_days × 8
                        WHERE leave_type = 'Time Off In Lieu'
                        AND status IN ('Pending*', 'Approved'))

available_hours   = earned_hours − used_hours
available_days    = available_hours ÷ 8
```

### Appendix D — Environment Variables

**Frontend (`frontend/.env`)**

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | Base path for all API calls |
| `VITE_APP_NAME` | `VMGD LeaveDesk` | Application name shown in UI |

**Backend (`backend/.env`)**

| Variable | Example | Description |
|---|---|---|
| `PORT` | `5000` | Backend listen port |
| `HOST` | `127.0.0.1` | Bind address (127.0.0.1 in prod) |
| `NODE_ENV` | `production` | Node environment |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `JWT_SECRET` | `<random>` | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token validity period |
| `CORS_ORIGIN` | `http://leavedesk.vmgd.gov.vu` | Allowed browser origins |
| `APP_URL` | `http://leavedesk.vmgd.gov.vu` | Base URL for email links |
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | `465` | SMTP port |
| `SMTP_USER` | `user@gmail.com` | SMTP username |
| `SMTP_PASS` | `app-password` | SMTP password / app password |
| `NOTIFICATION_FROM` | `leave@vmgd.gov.vu` | Sender email address |
| `NOTIFICATION_NAME` | `VMGD LeaveDesk` | Sender display name |

---

*End of SRS — VMGD LeaveDesk v1.0*
