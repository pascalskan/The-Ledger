# THE LEDGER
## Current Development State

Last Updated: July 19, 2026

---

## WORKSTREAM D — CLIENT PORTAL (CL-1 → CL-7)

Status: **COMPLETE — awaiting review and merge**
Branch: `feature/client-portal-workstream` (forked from `main` after the Worker workstream merge)
Handoff: `docs/handoffs/client-portal-workstream-handoff.md`

The Client Portal was rebuilt from a single unauthenticated mock page into a complete,
doctrine-compliant customer-facing surface.

| Phase | Title | Commit |
|---|---|---|
| CL-1 | Client Portal Audit | — |
| CL-2 | Foundation, Provisioning & Authentication | `d3c82ba` |
| CL-3 | Portal Shell, Dashboard & Navigation | `3cb66c0` |
| CL-4 | Project Visibility & Deliverables | `f718798` |
| CL-5 | Documents & Communication | `29ef52a` |
| CL-6 | Financial Transparency | `167ecc1` |
| CL-7 | Final Validation, Audit & Merge Readiness | (final commit) |

Delivered:

- **Projection layer** (`client/src/lib/portalProjections.ts`) — the doctrine boundary. Every
  portal view consumes projections; only the portal controller touches the store. Cost, margin,
  payroll, review, governance and accounting-sync data are structurally unreachable.
- **Portal authentication** — `PortalAccount` (Active/Disabled/Pending), session separate from
  internal auth, CEO-only provisioning.
- **Responsive shell** with 8 sections (desktop / tablet / mobile).
- **Project experience** — milestones, deliverables, derived progress, client-safe timeline.
- **Documents** — explicit PM/CEO sharing with non-destructive, audited revocation.
- **Communication Centre** — structured threads replacing the free-text comment box.
- **Financial Centre** — quotes, variations, invoices, payments, credit notes, derived KPIs.
- **Audit** — 15 client-portal audit event types.
- **Doctrine tests** — 62 across 6 client-portal specification files.

Resolved from the CL-1 audit: the cosmetic hardcoded login, the absent projection layer, the
missing audit trail, hardcoded financial figures, and an active doctrine violation (crew
surnames exposed to clients).

**Outstanding:** the frozen `CLIENT_REQUEST_DOMAIN.md` (8 request types, routing, escalation,
resolution/decline) is **not implemented** — the Requests section is a placeholder. Two
implementation decisions require owner ratification (an 8th navigation item, and financial
visibility extended to quotes/variations/credit notes). See the handoff document.

---

## (Previous state below — last updated June 16, 2026)

---

## Repository Baseline

Branch: main
Verification:
- Build: PASS
- Playwright: 501 total / 499 passed / 2 known baseline failures (AF-08, NC-25 — see UX Redesign Programme section)

---

## Repository Status

The following have been merged into main:

- Phase 6.8 — Report Exports & Distribution Centre
- Claude Project Context System (CLAUDE.md, docs/ai-context/, docs/handoffs/, docs/architecture/archive/)
- Domain Definition Program (docs/domain/)
- UX-1, UX-2, UX-3, UX-QW (UX Redesign Programme — June 5, 2026)
- UX-4 — Finance Hub (UX Redesign Programme — June 10, 2026)

main is up to date with origin/main.

---

## Verification Status

Build: PASS
Playwright: 501 total / 499 passed / 2 known baseline failures
Regressions: 0

Known baseline failures (pre-existing, unrelated to UX-4):

- AF-08 (tests/doctrine/activity-feed.spec.ts — "KPI last7days count equals total"): seed date drift issue.
- NC-25 (tests/doctrine/notification-centre.spec.ts — mobile bell badge): duplicate notif-bell-badge locator causing a Playwright strict-mode failure.

---

## UX Redesign Programme

Programme document: docs/ux/UX_REDESIGN_PROGRAMME.md (authoritative tracker)

- UX-1 (Critical Credibility Fixes): COMPLETE — merged to main, June 5, 2026
- UX-2 (Navigation Restructuring): COMPLETE — merged to main, June 5, 2026
- UX-3 (Dashboard Redesign): COMPLETE — merged to main, June 5, 2026
- UX-QW (Quick Wins post-audit): COMPLETE — merged to main, June 5, 2026
- UX-4 (Finance Hub): COMPLETE — merged to main, June 10, 2026
- UX-5 (Intelligence Hub): COMPLETE — branch feature/ux5-intelligence-hub, June 16, 2026 (build + full Playwright suite green; awaiting owner merge to main)
- UX-6 (Automation Hub): NEXT — active upcoming work item (depends on UX-5)
- UX-7 (Review Centre Enhancement): Pending
- UX-8 (Operations Hub & Final Polish): Not started

### UX-5 — Intelligence Hub (COMPLETE, awaiting owner merge)

Specification: docs/specifications/UX-5-INTELLIGENCE-HUB-SPECIFICATION-v1.1.md (frozen)

Delivered on feature/ux5-intelligence-hub:

- `/intelligence` hub (CEO-only) with five tabs: Overview, Analytics, Reports, Exports (Exports/Distribution sub-tabs), Activity
- Overview: 4-dimension Health Scorecard, Critical Items panel (P1-E severity rendering), 6-tile Platform Summary strip (§10.1 verified sources)
- Analytics/Reports/Exports content extracted and mounted unchanged (AnalyticsCentreContent, ReportsContent, ExportsContent, DistributionContent)
- Activity tab (ActivityHub): combined activity + notification chronology, canonical priority mapping (P0-A), total type mapping, mark-read/dismiss, Show Event Detail toggle (?detail=1 precedence, P1-D), bus-af- Platform Event join, pagination
- Legacy redirects: /executive-command-centre, /analytics-centre, /reporting-centre, /activity-feed → hub tabs; role-aware /notifications (CEO → hub Activity, PM → unchanged Notification Centre)
- /event-monitor retained as hidden CEO-only route — no nav item, NO redirect (P0-B)
- Link sweep S-1…S-8 applied (header alert, nav, bell, dashboard Zone A, reportingEngine deep links, engine route constants)
- NC-25 companion fix: unique mobile/desktop bell badge testIds (isolated commit)
- Hub audit recorders in analyticsEngine.ts (designated hub audit host)

Test migration: ECC + activity-feed + notification CEO-half rewritten; analytics/reporting/exports navigation-migrated; event-bus touched up; AF-04–AF-08 retired (AF-08 leaves the known-failure ledger); new tests/doctrine/intelligence-hub.spec.ts (38 tests).

Playwright baseline after UX-5: **512 total / 512 passed / 0 known failures** (AF-08 retired, NC-25 fixed) — full suite verified green by the repository owner, June 16, 2026.

### UX-4 — Finance Hub (COMPLETE)

UX-4 implementation finished successfully:

- Finance Hub Overview implemented
- Records tab complete
- Invoicing integrated
- Payroll integrated
- Accounting integrated
- Legacy finance routes consolidated into `/finance`
- Audit instrumentation complete
- RBAC complete

Handoff: docs/handoffs/ux4-finance-hub-handoff.md

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
