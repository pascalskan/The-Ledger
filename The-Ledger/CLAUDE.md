# CLAUDE.md

# THE LEDGER

Repository AI Operating Instructions

Version: 1.0
Status: Active
Last Updated: June 2026

---

# PURPOSE

You are working on The Ledger.

The Ledger is an Operational Intelligence Platform that transforms operational activity into structured financial intelligence through a controlled approval process.

The Ledger is NOT accounting software.

The Ledger sits between operations and accounting systems.

Operational Data → Review Centre → Approval → Financial Normalization → Business Intelligence → Accounting Synchronization

Nothing becomes financially real until approved.

---

# REQUIRED STARTUP PROCEDURE

Before making recommendations, writing code, modifying files, or planning implementations:

## Step 1

Read:

docs/ai-context/LEDGER_CANONICAL_CONTEXT.md

## Step 2

Read:

docs/ai-context/CURRENT_DEVELOPMENT_STATE.md

## Step 3

Inspect:

docs/handoffs/

Identify and read the most recent handoff document.

Use that handoff to understand:

* Latest completed work
* Current repository state
* Outstanding issues
* Recommended next steps

## Step 4

Attempt repository verification:

git status

git branch

git log --oneline -20

If git metadata is unavailable:

* Search for repository root
* Use available GitHub tooling
* Continue using repository files as source of truth

Do not halt work solely because git metadata is unavailable.

---

# REQUIRED PRE-IMPLEMENTATION OUTPUT

Before implementation always provide:

## Current State Summary

Summarize:

* Current roadmap position
* Current repository status
* Most recent completed phase
* Relevant doctrines

## Proposed Changes

Explain:

* What will be changed
* Why it is required
* Impact on existing systems

## Implementation Plan

Provide:

* Files likely affected
* Components affected
* Testing approach
* Risk assessment

Only begin implementation after this analysis.

---

# CANONICAL SOURCE OF TRUTH

The following file is authoritative:

docs/ai-context/LEDGER_CANONICAL_CONTEXT.md

If conflicts exist between files:

LEDGER_CANONICAL_CONTEXT.md takes precedence.

Never invent doctrine.

Never override doctrine.

Never bypass doctrine.

---

# CORE DOCTRINES

The following doctrines are mandatory.

## Approval Doctrine

No operational event may directly create:

* Revenue
* Cost
* Payroll
* Invoice Entries
* Inventory Deductions
* Financial Mutations

until approved.

Approval remains the central control mechanism of the platform.

---

## Audit Doctrine

Every financially relevant action must be traceable.

Required auditability:

* Who
* What
* When
* Previous Value
* New Value
* Source Object
* Destination Object
* External Reference

No silent financial mutations.

---

## Job Attribution Doctrine

Every financial event belongs to a job.

Jobs function as mini-ledgers.

Financial reporting is job-centric.

Nothing financially significant exists without attribution.

---

## Financial Integrity Doctrine

Financial truth must remain consistent.

Accounting systems remain downstream consumers.

The Ledger remains the operational source of truth.

---

# REVIEW CENTRE PROTECTION

Never bypass:

Worker Submission
→ Review Centre
→ Approval
→ Financial Normalization

No implementation may circumvent this workflow.

No automation may circumvent this workflow.

No AI recommendation may circumvent this workflow.

---

# AUTOMATION RULES

Automation may:

* Notify
* Escalate
* Evaluate
* Schedule
* Coordinate

Automation may never:

* Approve reports
* Approve expenses
* Approve timesheets
* Create approved invoices
* Create approved financial records
* Override governance controls
* Bypass approval workflows

Human approval remains mandatory.

---

# RBAC RULES

CEO

* Full Platform Access

Project Manager

* Scoped Job Access

Worker

* Operational Access Only

Client

* Read-Only Portal Access

Workers never receive financial visibility.

Clients never receive operational management permissions.

RBAC must always be preserved.

---

# CURRENT PLATFORM STATE

The current implementation is a high-fidelity frontend prototype.

Current stack:

* React
* TypeScript
* Vite
* TailwindCSS
* shadcn/ui
* Zustand
* Wouter
* TanStack Query
* React Hook Form
* Zod

Current architecture:

* Frontend only
* Mock data driven
* No backend
* No database
* No production authentication

Backend implementation is intentionally deferred.

Do not introduce backend architecture unless explicitly requested.

---

# IMPLEMENTATION PHILOSOPHY

Prefer:

* Existing patterns
* Existing architecture
* Existing state management
* Existing component conventions

Avoid:

* New architectural patterns
* Unnecessary abstractions
* Framework replacements
* Large-scale rewrites

Changes should feel native to the existing codebase.

---

# TESTING REQUIREMENTS

All work must be verified.

Minimum requirements:

1. Build passes
2. Existing tests pass
3. New functionality tested
4. No doctrine regressions

Where applicable:

* Playwright tests
* Doctrine tests
* RBAC verification
* Audit verification

Testing is mandatory.

---

# GIT WORKFLOW

Never commit directly to main.

Always:

1. Create feature branch
2. Implement
3. Test
4. Commit
5. Push
6. Create PR
7. Stop

Do not continue development after PR creation unless explicitly instructed.

---

# HANDOFF REQUIREMENTS

When completing a phase or substantial implementation:

Produce a handoff document.

Handoff must include:

* Summary
* Files Modified
* Files Created
* Tests Added
* Verification Results
* Doctrine Compliance
* Outstanding Work
* Recommended Next Steps

Store handoffs inside:

docs/handoffs/

---

# CONTEXT SAFETY RULE

If:

* Context window becomes large
* Tool limits are approaching
* Session stability becomes uncertain

Immediately:

1. Commit work
2. Push work
3. Create handoff
4. Stop

Never leave work stranded.

---

# ARCHITECTURE RESPONSIBILITIES

Preserve:

* Approval Doctrine
* Audit Doctrine
* Job Attribution Doctrine
* Financial Integrity Doctrine
* Review Centre Doctrine
* Notification Doctrine
* Activity Feed Doctrine
* Event Bus Doctrine
* Workflow Automation Doctrine
* Dashboard Intelligence Doctrine
* Executive Command Centre Doctrine
* Analytics Doctrine
* Reporting Doctrine
* Export & Distribution Doctrine

No implementation may weaken these protections.

---

# DECISION MAKING PRINCIPLE

When uncertain:

1. Read the Canonical Context.
2. Follow existing doctrine.
3. Preserve approval workflows.
4. Preserve auditability.
5. Preserve financial integrity.
6. Choose the least disruptive implementation.

The Ledger values correctness, auditability, traceability, and financial integrity over speed or convenience.
