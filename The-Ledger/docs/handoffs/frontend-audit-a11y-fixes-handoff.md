# Handoff: Front-end audit and accessibility fixes

Branch: `fix/frontend-a11y-quick-wins`
Date: 2026-10-11

## Summary

Six audit runs covered every route, role, viewport, form and dialog, including automated accessibility checks (axe, real keyboard traversal, aria tree). Findings are in `docs/audits/FRONTEND_AUDIT_LOG.md`, with fix logs and the not-done list. The fixes cover accessibility, responsive layout, missing or broken actions, confirmations, validation, and en-GB date and £ consistency.

Headline results:
- axe violating nodes: 1036 -> 96.
- Horizontal overflow: 0 pages at 375, 768 and 955px (was 11, 6 and 2).
- Typecheck passes; 979/979 regression tests pass.

## Files Created
- `client/src/lib/a11y.ts` (`activatable` keyboard-accessible clickable helper)
- `client/src/lib/format.ts` (en-GB date helpers), `client/src/lib/validate.ts`
- `client/src/hooks/use-document-title.ts`
- `client/src/components/confirm-dialog.tsx`, `client/src/components/StaffConversations.tsx`
- `docs/audits/FRONTEND_AUDIT_LOG.md`
- `tests/audit/` (axe, overflow and probe audits, regression config, summary script, result JSON)

## Files Modified (main areas)
- Shell: `index.html`, `index.css` (contrast tokens), `layout.tsx` (breakpoint md -> lg, labels, notifications), `ui/tabs.tsx`, `App.tsx` (invoice detail route, shadowed routes removed, `/qa` CEO-only).
- Interaction: `activatable` rows/cards across jobs, clients, dashboard, workers, schedule, invoices, worker and portal pages; locations, assets and stock rows now navigate to detail pages.
- Working actions: asset and stock detail dialogs; reject-with-reason in Review detail; Client Requests staff replies; worker report equipment hours.
- Confirmations: worker delete, automation Restrict/Suspend, document share, invoice Sent/Paid.
- Validation: settings, worker, equipment, client, stock, role self-lockout guard.
- `mockData.ts`, `notificationEngine.ts`, `portalCommunication.ts`: audit entries for mutations, reject/correct/escalate actions, notification subscription, staff thread helpers.

## Tests
- Updated for new behaviour: `automation-governance.spec.ts` (confirm dialog), `client-portal-documents.spec.ts`, `invoice-pipeline.spec.ts`, `audit-log.spec.ts` (empty reports are now rejected, so the test enters notes).
- Audit scripts in `tests/audit/` (run with `tests/audit/playwright.audit.config.ts`; regression via `tests/audit/regression.config.ts`).

## Doctrine Compliance
- Approval: no new path creates financial records before approval. Reject now requires a reason and is audited.
- Audit: reject, correct, escalate and entity mutations now write audit entries.
- Review Centre: escalated items remain in the pending list; PM badge scoped to managed jobs.
- RBAC: no permissions loosened. `/qa` routes restricted to CEO.

## Outstanding Work
Listed in the audit log under "Not done": heading order on 10 pages, focus return after Create Job / Build Report dialogs, automation Disable/Archive confirmations, portal download file and separate invoice stores, job Edit for title/dates/address, map clustering and legend colours, empty-state health scores, login return-URL, "Command Centre" label, residual contrast (79 nodes) and 5 unnamed buttons.

## Owner Decisions Needed
- Role permission keys are not enforced anywhere (R4-21).
- Whether PMs should see Financial Insights (test IA-19 currently asserts they do).

## Recommended Next Steps
1. Review and merge this PR.
2. Decide the two items above.
3. Work through the "Not done" list, starting with heading order and residual contrast.
