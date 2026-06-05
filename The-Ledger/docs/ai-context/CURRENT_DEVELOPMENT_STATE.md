# THE LEDGER
## Current Development State

Last Updated: June 4, 2026

---

## Repository Baseline

Branch: main
Verification:
- Build: PASS
- Playwright: 501 / 501 Tests PASS

---

## Repository Status

The following have been merged into main:

- Phase 6.8 — Report Exports & Distribution Centre
- Claude Project Context System (CLAUDE.md, docs/ai-context/, docs/handoffs/, docs/architecture/archive/)
- Domain Definition Program (docs/domain/)

main is up to date with origin/main.

---

## Verification Status

Build: PASS
Playwright: 501 / 501 Tests PASS
Regressions: 0

---

## Current Stage

**Domain Definition Program — COMPLETE**

**Backend Architecture Specification — PENDING**

The platform has completed all frontend prototype phases, the Architectural Audit, and the Domain Definition Program. The next planned phase is Backend Architecture Specification.

---

## Current Prototype Status

- Executive Platform: Complete
- Worker Platform: Complete
- Client Portal Foundation: Complete
- Automation Platform: Complete
- Governance Platform: Complete
- Analytics Platform: Complete
- Reporting Platform: Complete
- Export & Distribution Platform: Complete

---

## Domain Definition Program

Status: COMPLETE
Date: June 4, 2026 (Round 1 + Round 2)

All fourteen business domains have been fully defined and frozen. These documents are the authoritative starting point for backend domain specification.

Authoritative Reference: docs/domain/DOMAIN_MODEL_SUMMARY.md

### Frozen Domains

| Domain | File | Status |
|---|---|---|
| Expense | docs/domain/EXPENSE_DOMAIN.md | FROZEN |
| Rejection | docs/domain/REJECTION_DOMAIN.md | FROZEN |
| Timesheet | docs/domain/TIMESHEET_DOMAIN.md | FROZEN |
| Site | docs/domain/SITE_DOMAIN.md | FROZEN |
| Issue | docs/domain/ISSUE_DOMAIN.md | FROZEN |
| Financial Record Correction | docs/domain/FINANCIAL_RECORD_CORRECTION_DOMAIN.md | FROZEN |
| Job | docs/domain/JOB_DOMAIN.md | FROZEN |
| Report | docs/domain/REPORT_DOMAIN.md | FROZEN |
| Stock | docs/domain/STOCK_DOMAIN.md | FROZEN |
| Asset | docs/domain/ASSET_DOMAIN.md | FROZEN |
| Client Request | docs/domain/CLIENT_REQUEST_DOMAIN.md | FROZEN |
| Client Portal | docs/domain/CLIENT_PORTAL_DOMAIN.md | FROZEN |
| Scheduling | docs/domain/SCHEDULING_DOMAIN.md | FROZEN |
| Worker Classification | docs/domain/WORKER_CLASSIFICATION_DOMAIN.md | FROZEN |

---

## Architectural State

The Ledger now possesses:

- Frozen business domain model
- Frozen lifecycle definitions
- Frozen ownership definitions
- Frozen approval authority definitions
- Frozen rejection definitions
- Frozen financial mutation definitions

Backend implementation has not started.

Backend architecture specification has not started.

---

## Claude Project Context System

The following Claude project context structure has been established and merged into main:

- CLAUDE.md — AI operating instructions and startup procedure
- docs/ai-context/ — Canonical context and current development state
- docs/handoffs/ — Phase-by-phase handoff documents
- docs/architecture/archive/ — Archived architecture documents
- docs/domain/ — Frozen domain model documents

This context system governs all future Claude sessions working on The Ledger.

---

## Latest Completed Milestone

Domain Definition Program — June 4, 2026

Produced:
- 14 frozen domain documents
- DOMAIN_MODEL_SUMMARY.md (authoritative synthesis)
- 25 frozen backend planning decisions
- Complete financial mutation point map
- Complete approval authority model
- Complete lifecycle models for all entities
- Complete domain invariant set (32 invariants)
- Complete audit entry type catalogue

---

## Next Development Cycle

**Backend Architecture Specification**

Scope:
- Domain Architecture
- Data Architecture
- Service Architecture
- Event Architecture
- Multi-Tenancy Architecture
- Authentication Architecture
- API Architecture

All 14 frozen domain documents serve as the authoritative input to this phase.

---

## Backend Architecture Phase

Status: **COMPLETE**
Date: June 4, 2026

### Architecture Specification (v1.0)

Thirteen architecture documents produced and committed to branch `feature/backend-architecture-specification`:

- BACKEND_ARCHITECTURE_SUMMARY.md
- BACKEND_DOMAIN_ARCHITECTURE.md
- BACKEND_LAYERING_ARCHITECTURE.md
- BACKEND_SERVICE_ARCHITECTURE.md
- BACKEND_EVENT_ARCHITECTURE.md
- BACKEND_DATA_ARCHITECTURE.md
- BACKEND_AUTH_ARCHITECTURE.md
- BACKEND_MULTITENANCY_ARCHITECTURE.md
- BACKEND_API_ARCHITECTURE.md
- BACKEND_INFRASTRUCTURE_ARCHITECTURE.md
- BACKEND_DOCUMENT_INTELLIGENCE_ARCHITECTURE.md
- BACKEND_OBSERVABILITY_ARCHITECTURE.md
- BACKEND_IMPLEMENTATION_ROADMAP.md

### Architecture Refinement Pass (v2.0)

Eight documents updated and committed to branch `feature/backend-architecture-refinement`:

| Document | Change |
|---|---|
| BACKEND_ARCHITECTURE_SUMMARY.md | Full update — new context map, service map, event map, data ownership, tenant model, notification model, financial intelligence model, AI boundaries |
| BACKEND_DOMAIN_ARCHITECTURE.md | Tenant Context extracted (was in Identity); Financial Intelligence Context added; Notification Centre formalised as sub-domain; 9 → 11 bounded contexts |
| BACKEND_SERVICE_ARCHITECTURE.md | Tenant Module added; Financial Intelligence Module added; Notification Centre sub-module defined with full lifecycle and notification type registry |
| BACKEND_EVENT_ARCHITECTURE.md | Tenant events added; Financial Intelligence events added; Notification Centre events formalised; subscriber registry updated |
| BACKEND_DATA_ARCHITECTURE.md | `tenant` schema added; `financial_intelligence` schema added; `notification` schema extracted from `intelligence`; 10 → 13 schemas |
| BACKEND_AUTH_ARCHITECTURE.md | Company ownership moved to Tenant Context; tenant status check added to authentication flow |
| BACKEND_MULTITENANCY_ARCHITECTURE.md | Tenant Module owns Company; provisioning routed through Tenant Module; suspension triggers session revocation |
| BACKEND_DOCUMENT_INTELLIGENCE_ARCHITECTURE.md | AI Limitations Covenant added; processing pipeline stages defined; security boundaries expanded; financial mutation restrictions explicit |

### Architecture Decision Summary

- Deployment model: Modular Monolith
- Event strategy: Hybrid Event Architecture (transactional outbox)
- Layering: 4-layer DDD
- Multi-tenancy: Row-level isolation + PostgreSQL RLS
- Bounded contexts: 11
- Database schemas: 13
- Auth: JWT + separate portal JWT
- Service modules: 11

### Current Repository State

Backend implementation: Not started
Architecture documents: Frozen at v2.0
Branch: feature/backend-architecture-refinement (pending PR merge)

---

## Current Stage

**Backend Architecture Specification — COMPLETE**

**Next Development Target: Phase 6.1 — Notification Centre (backend implementation)**

All architecture documents serve as the authoritative foundation for backend implementation.
The frozen domain model (docs/domain/) and frozen architecture (docs/backend/) are the two authoritative inputs for all future backend development sessions.
