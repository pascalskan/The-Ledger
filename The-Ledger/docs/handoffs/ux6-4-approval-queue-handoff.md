# UX-6.4 — APPROVAL QUEUE — HANDOFF

Date: June 16, 2026
Branch: `feature/ux6-automation-hub` (UX-6 series branch; 6.4 builds on 6.1–6.3)
Status: **COMPLETE** — build verified. Full Playwright suite to be run by the repository owner locally.

---

## Summary

UX-6.4 adds an **Approval Queue** tab to the Automation Hub (`/automations`) — an executive operations inbox that makes it immediately obvious when an automation has intentionally stopped at a human approval boundary. It answers: *"Which automated processes are waiting for human approval before they can continue?"* and reinforces the core doctrine that automation may queue work but never approves or bypasses the Review Centre. **Informational only** — it surfaces blocked work and the relationships back to the Review Centre / jobs / governance; it never approves anything and creates no financial mutations.

## Deliverables

1. **Approval Queue Dashboard** — 7 KPI cards: In Queue (6), CEO Approvals (4), PM Approvals (2), Financial Pending (4), Operational Pending (1), Avg Waiting, Oldest Outstanding (8d → AQ-2026-003).
2. **Executive Attention panel** — data-driven lines generated only when true (payroll awaiting CEO approval, invoice workflows paused, governance-restricted awaiting intervention, financially significant items needing approval).
3. **Approval Queue table** — Queue ID, rule, trigger, job/client, approval type, required approver, status, time waiting, blocked-since, priority, view; ordered like an inbox (priority then longest wait). Responsive column hiding + horizontal scroll.
4. **Search & combinable filters** — search across rule/queue-id/job/client/trigger/approver; approver select (CEO/PM), type select (Financial/Operational/Governance), and toggle chips (High Priority, Financially Sensitive, Governance Restricted). All compose with a live "N of M" count.
5. **Approval Detail dialog** — informational: automation summary, trigger & reason, why execution stopped + approval boundary, related job/client, governance & financial safeguards, related records (Review Centre / job deep links — surface only), audit references, and timestamp history. Carries an explicit "this approves nothing" doctrine banner.
6. **Review Centre integration** — surfaces (does not duplicate) relationships via deep links to `/review-centre`, `/jobs`, and `/automation-governance`.

## Files Created

- `client/src/lib/automationApprovalQueueEngine.ts` — new mock engine: `ApprovalQueueEntry` model, classification types (ApprovalType / ApproverRole / Priority), 6 deterministic seed entries, and pure helpers (`getApprovalQueue`, `computeApprovalQueueSummary`, `computeWaitingHours`, `formatWaiting`, `sortQueueForInbox`, `generateApprovalAttention`). Waiting times are computed against a fixed `QUEUE_REFERENCE_NOW` (2026-06-16) for determinism. Engine is read-only — no approve/mutate functions exist.
- `client/src/components/automation/AutomationApprovalQueue.tsx` — the Approval Queue tab (dashboard, attention panel, search/filters, table, detail dialog).
- `tests/doctrine/automation-approval-queue.spec.ts` — 18 doctrine tests (AQ-01…AQ-18).

## Files Modified

- `client/src/pages/automations.tsx` — new "Approval Queue" tab (`aut-tab-approval-queue` / `aut-approval-queue-panel`) rendering `<AutomationApprovalQueue />`; added `Inbox` icon import.

## Verification Results

- Build (`npm run build`): **PASS**.
- `tsc --noEmit`: no errors in any UX-6.4-touched file (pre-existing repo-wide errors in untouched files remain; the project gate is the Vite build).
- Playwright: 18 new tests authored (deterministic). All existing automation tab testIds preserved. Full-suite run pending the owner's local run.

## Doctrine Compliance

- **Approval / Review Centre / Financial Integrity:** strictly preserved — the queue is informational; it exposes no approve/reject/execute/retry control. Seed entries explicitly model payroll/expense/invoice/sync actions as *blocked, awaiting human approval* — never auto-approved. Deep links navigate only.
- **Governance / Audit / Scheduler:** unchanged; governance status, risk, and audit references are surfaced read-only.
- **Job Attribution / RBAC:** preserved; inherits the CEO-only gating of `/automations`.

## Outstanding Work / Next Steps

- Owner: run the full Playwright suite locally and confirm green.
- Future UX-6 increments (same branch): continue hub polish; the PR for the whole UX-6 series stays open until the series is complete.
