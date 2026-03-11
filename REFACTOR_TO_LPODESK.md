\# LPODesk Refactor Instructions



\## Project Overview



This project was originally cloned from \*\*LeaveDesk\*\*, a leave management system.



It must now be refactored into \*\*LPODesk\*\*, a \*\*Local Purchase Order Request Workflow System\*\*.



Stack:



Backend:

NodeJS + Express

PostgreSQL



Frontend:

ReactJS (Vite)



Deployment:

PM2

Nginx / Apache



---



\# Objective



Transform the existing leave management system into a \*\*procurement request workflow system\*\* used by government staff.



The application will manage:



\* Procurement requests

\* Multi-level approvals

\* ICT validation

\* Supplier documents

\* LPO issuance



---



\# Preserve Existing Modules



Do NOT modify these unless necessary:



Authentication

Users

Roles

Departments

Permissions

Audit logs

Deployment scripts



These modules are generic and reusable.



---



\# Remove Leave Management Logic



Remove all logic related to:



leave\_requests

leave\_balances

leave\_types

leave\_calendar

leave\_approvals



This includes:



controllers

routes

services

database queries

React pages



---



\# New Core Module: Procurement Requests



Create a new module named:



requests



This module replaces leave\_requests.



Request fields:



id

title

description

supplier\_name

amount

category

status

created\_by

created\_at



Example categories:



ICT Equipment

Office Supplies

Services

Maintenance

Consultancy



Default status:



draft



---



\# Workflow System



Requests must follow an approval workflow.



Approval chain:



Staff

Manager

ICT Manager (only if request category is ICT)

Procurement Officer

Director



Workflow rules:



If category is ICT → include ICT Manager approval

If not ICT → skip ICT Manager



---



\# New Database Tables



Create the following tables.



requests



id SERIAL PRIMARY KEY

title TEXT

description TEXT

supplier\_name TEXT

amount NUMERIC

category TEXT

status TEXT DEFAULT 'draft'

created\_by INTEGER

created\_at TIMESTAMP DEFAULT now()



approvals



id SERIAL PRIMARY KEY

request\_id INTEGER

approver\_id INTEGER

role TEXT

decision TEXT

comment TEXT

approved\_at TIMESTAMP



documents



id SERIAL PRIMARY KEY

request\_id INTEGER

file\_path TEXT

uploaded\_by INTEGER

created\_at TIMESTAMP DEFAULT now()



workflow\_steps



id SERIAL PRIMARY KEY

step\_order INTEGER

role TEXT

condition TEXT



---



\# Backend Refactor



Backend location:



backend/src



Keep the architecture but introduce new modules.



Expected backend structure:



backend/src



controllers

authController.js

requestController.js

approvalController.js



routes

authRoutes.js

requestRoutes.js

approvalRoutes.js



services

requestService.js

workflowService.js



models

userModel.js

requestModel.js

approvalModel.js



middleware

authMiddleware.js



index.js



---



\# API Endpoints



Replace leave endpoints with procurement endpoints.



POST /api/requests

GET /api/requests

GET /api/requests/:id



POST /api/requests/:id/submit

POST /api/requests/:id/approve

POST /api/requests/:id/reject



POST /api/documents/upload



---



\# Workflow Service Logic



Create workflowService.js.



It determines the next approver.



Example logic:



If request.category == "ICT"

next role = ict\_manager



Otherwise skip ICT approval.



Approval flow:



manager → ict\_manager → procurement → director



or



manager → procurement → director



---



\# Frontend Refactor



Frontend location:



frontend/src



Replace leave related pages.



New pages:



Dashboard.jsx

CreateRequest.jsx

MyRequests.jsx

PendingApprovals.jsx

RequestDetails.jsx



Remove:



LeaveRequest pages

LeaveCalendar

LeaveBalance components



---



\# React Dashboard Behaviour



Staff sees:



My Requests

Create Request



Manager sees:



Requests waiting for approval



Director sees:



Final approvals



---



\# Request Creation Form



Fields:



Title

Description

Supplier

Amount

Category

Upload Quote



Categories dropdown:



ICT Equipment

Office Supplies

Services

Maintenance



---



\# Document Upload



Allow users to upload:



Supplier quotes

Invoices

Specifications



Files stored on server filesystem.



documents table stores metadata.



---



\# Approval Page



Approvers must see:



Request details

Attached documents

Approve button

Reject button

Comment field



Approval actions update:



approvals table

request status



---



\# Status Lifecycle



draft

submitted

manager\_approved

ict\_approved

procurement\_approved

director\_approved

rejected

completed



---



\# Deployment



Existing deployment must remain compatible.



Update names from:



leavedesk → lpodesk



Files requiring rename:



nginx.leavedesk.conf

apache2.leavedesk.conf

pm2.config.js



Application name:



LPODesk



---



\# Final Expected System



LPODesk must provide:



Procurement request submission

Multi-level approval workflow

ICT validation

Supplier document storage

Approval tracking

Audit logging



---



\# Refactor Strategy



Refactor in stages:



1 Remove leave modules

2 Create request module

3 Create approval module

4 Implement workflow logic

5 Update React frontend

6 Update deployment configuration



Ensure code remains modular and production-ready.



---



