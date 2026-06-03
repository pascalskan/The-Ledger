THE LEDGER
Frontend Architecture Reference
Version: 1.0
CURRENT DEVELOPMENT MODEL
The current implementation is a High-Fidelity Frontend Prototype.
Purpose:
Workflow Validation
Financial Logic Validation
UX Validation
Approval Validation
Integration Validation
Backend implementation is intentionally deferred.
CURRENT STACK
Frontend:
React
TypeScript
Vite
TailwindCSS
shadcn/ui
Zustand
Wouter
TanStack Query
React Hook Form
Zod
Future Backend:
Express
PostgreSQL
Drizzle ORM
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
1
PROTOTYPE RULES
There is currently:
No Backend
No Database
No Real Authentication
No Server Persistence
Everything is simulated through frontend state.
CRITICAL FILES
mockData.ts
Acts as:
Mock Database
Mock Authentication Provider
Mock Financial Store
workerStore.ts
Acts as:
Global Application State
Company Context
Date Context
Layout State
ROLE MODEL
CEO
Full Platform Access
Project Manager
Scoped Job Access
Worker
Mobile Workflow Access
Client
Read-Only Portal Access
•
•
•
•
•
•
•
•
•
•
•
•
•
•
•
2
CORE DATA FLOW
Worker Activity
↓
Worker Submission
↓
Review Centre
↓
Approval
↓
Financial Normalization
↓
Financial Explorer
↓
Accounting Sync
DEVELOPMENT RULES
Never bypass the Review Centre.
Never bypass Approval Doctrine.
Never bypass RBAC.
Never bypass Auditability.
Never implement backend architecture unless explicitly requested.
Always implement frontend-first solutions.