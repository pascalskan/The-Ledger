# The Ledger

**An operational intelligence platform — the controlled step between doing the
work and accounting for it.**

Most tools either record operations or record money. The Ledger sits between
them: operational activity is captured, reviewed, and only becomes financially
real once a human approves it.

```
Operational data → Review Centre → Approval → Financial normalisation → Reporting → Accounting sync
```

It is deliberately **not** accounting software. Accounting systems are
downstream consumers; The Ledger is the operational source of truth that feeds
them.

---

## The idea it is built around

> **Nothing becomes financially real until someone approves it.**

A timesheet, an expense, a materials note — none of them create revenue, cost,
payroll or an invoice line on their own. They create a *submission*, which
enters the Review Centre and waits for a person.

That single rule drives the architecture, and the codebase enforces it rather
than merely encouraging it:

| Rule | What it means in practice |
| ---- | ------------------------- |
| **Approval** | No operational event creates a financial mutation before approval. Automation may notify, escalate, evaluate and schedule — it may never approve. |
| **Audit** | Every financially relevant action records who, what, when, the previous value, the new value, and both ends of the change. No silent mutations. |
| **Job attribution** | Every financial event belongs to a job. Jobs behave as mini-ledgers, and reporting is job-centric. |
| **Financial integrity** | One consistent financial truth, held here, exported outward. |

Access is role-scoped throughout: a CEO sees the platform, a project manager
sees their jobs, a **worker never sees financial data at all**, and a client
gets a read-only portal.

---

## Status — read this before judging the code

This is a **high-fidelity frontend prototype**. It runs on mock data. There is
no application backend, no database behind the UI, and no production
authentication.

That is a deliberate sequencing decision, not an unfinished job: the approval
and audit model is the hard part of this product, and it is far cheaper to get
it right in a working interface than to discover it is wrong after building a
schema around it. `server/` exists only to host the built client.

What you can therefore read here is the **modelling and the interaction
design** — the workflow, the role boundaries, the reporting structure — rather
than a production deployment.

---

## Stack

| | |
| --- | --- |
| UI | React + TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | Zustand, TanStack Query |
| Routing | Wouter |
| Forms | React Hook Form + Zod |
| Testing | Playwright (end-to-end, including role and approval-flow coverage) |
| Schema | Drizzle ORM config, ready for the backend phase |

## Layout

```text
The-Ledger/
├── client/     React application — the prototype proper
├── server/     Thin Express host for the built client
├── shared/     Types shared across the boundary
├── docs/       Architecture, canonical context, phase handoffs
└── tests/      Playwright end-to-end tests
```

## Running it

```bash
cd The-Ledger
npm install
npm run dev
```

```bash
npm run test      # Playwright end-to-end
npm run build     # typecheck + production build
```

## Documentation

`The-Ledger/docs/` holds the architecture writing, including the canonical
context document that the implementation is checked against, and a handoff
record for each completed phase.

---

Personal project. Not affiliated with any employer or client.
