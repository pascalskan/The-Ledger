# Handoff: Front-end audit — remaining fixes

Branch: `fix/frontend-audit-remaining` (from main after PR #44)
Date: 2026-10-11

## Summary
Second pass over the "Not done" list in `docs/audits/FRONTEND_AUDIT_LOG.md` (see "Fix log 3").

## Files Modified
- Headings: review panels, `review-detail.tsx`, `schedule.tsx`, `JobScheduleCard.tsx`, `ExpenseExposurePanel.tsx`, `settings.tsx`, `workers.tsx`, `worker/jobs.tsx`, `worker/report.tsx`, `ProjectContacts.tsx`.
- Focus return: `jobs.tsx`, `reporting-centre.tsx`.
- Confirmations: `automations.tsx` (Disable/Archive rule, Disable schedule).
- Login return-URL: `App.tsx` (ProtectedRoute), `auth.tsx`, `mockData.ts` (logout flag).
- Job edit: `job-detail.tsx` (title, dates, address).
- Map: `map.tsx` (status icons, spread, fit bounds, accessible names).
- Job health: `JobIntelligenceSection.tsx` (no-activity state).
- Contrast: small-text colour fixes across automation, finance, analytics, payroll, worker pages.

## Tests
Updated `automation-builder`, `automation-centre`, `automation-scheduler` specs to click the confirm dialog. Full suite 979/979 before the final heading/map tweaks; affected subset 333/333 after.

## Doctrine Compliance
No change to the Approval path. Disable/Archive now need confirmation; job edits write audit entries through the existing `updateJob`.

## Outstanding Work
OG image text, seed invoice cost-rate data, portal download file and separate invoice stores, "Command Centre" label, map `<h1>`, residual contrast (53 nodes). Owner decisions from the previous handoff still stand (role permission enforcement, PM access to Financial Insights).
