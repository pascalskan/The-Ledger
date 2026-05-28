# The Ledger — Architecture Overview

## Overview

The Ledger is a multi-tenant operational management platform designed for field service, engineering, infrastructure, and operational contracting businesses.

The system combines:

* operational scheduling,
* workforce coordination,
* financial visibility,
* asset management,
* review workflows,
* and role-based access control

into a unified operational intelligence platform.

The Ledger is being architected as a scalable enterprise system rather than a lightweight CRUD application.

---

# Current Technical Stack

## Frontend

* React
* TypeScript
* Vite
* TailwindCSS
* shadcn/ui

## Backend (Planned Phase 2)

* Node.js
* Express
* PostgreSQL
* Prisma ORM
* JWT/Auth layer
* Multi-tenant architecture

---

# Architectural Philosophy

The Ledger follows several core architectural principles:

## 1. Canonical Domain Modeling

All business entities are defined centrally through shared domain types.

Examples:

* Job
* Worker
* Client
* ReviewItem
* Role
* User

These types act as the single source of truth across:

* pages,
* components,
* permissions,
* scheduling,
* and future backend APIs.

---

## 2. Multi-Tenant First

The system is designed around company isolation from the beginning.

All core entities contain:

* companyId
* tenant ownership assumptions
* scoped access boundaries

---

## 3. RBAC-Centric Security

The Ledger uses Role-Based Access Control (RBAC) as a foundational architectural layer.

Permissions are abstracted through reusable utilities rather than hardcoded UI logic.

---

## 4. Operational Intelligence

The scheduling system is designed around operational forecasting rather than basic calendar visualization.

The system models:

* workforce utilization,
* operational margin,
* resource allocation,
* labor forecasting,
* and financial contribution.

---

## 5. Strict Type Safety

TypeScript strictness is treated as architectural infrastructure.

The project uses:

* canonical shared types,
* discriminated unions,
* reusable permission helpers,
* and normalized interfaces.

---

# Current Phase Status

## Phase 1 — Frontend Stabilization ✅ COMPLETE

Completed:

* canonical type normalization
* RBAC infrastructure
* permission utilities
* scheduling hardening
* TypeScript strictness cleanup
* frontend runtime stabilization

---

## Phase 2 — Backend & Data Architecture (NEXT)

Planned:

* PostgreSQL schema design
* Prisma implementation
* API contracts
* authentication layer
* tenant enforcement
* persistence architecture
* service abstraction
* mock data replacement

---

# Long-Term Vision

The Ledger is intended to evolve into a fully integrated operational ERP platform for field operations businesses.

Long-term goals include:

* real-time operational forecasting
* advanced analytics
* audit systems
* workflow automation
* mobile field operations
* integrations (QuickBooks, Xero, etc.)
* AI-assisted operational planning
* enterprise-grade reporting
