# WORKSTREAM E — PLATFORM INFORMATION ARCHITECTURE

## Handoff Document

Date: July 19, 2026
Branch: `feature/workstream-e-platform-ia`
Base: `main` @ `42cf4d6` (915 / 915 Playwright PASS)
Audit & frozen scope: `docs/ux/WORKSTREAM_E_IA_AUDIT.md`

---

# 1. SUMMARY

Workstream E is the only cross-cutting workstream. A–D each own a role; E owns the
seams between them — the inconsistencies that are invisible inside one module and
obvious the moment a user crosses between two.

The E-1 audit found five defect classes. E-2 → E-5 resolved all five. E-6 added 40
doctrine tests so they cannot silently return.

| Finding | Severity | Phase | Status |
|---|---|---|---|
| F-1 Centre/Center split, branching on role | CRITICAL | E-2 | Resolved |
| F-2 No PageHeader; ~30 of 48 pages had no `h1` | HIGH | E-3, E-4 | Resolved |
| F-3 ~1,700 raw palette literals across 40 files | HIGH | E-5 | Resolved |
| F-4 Portal more polished than executive platform | MEDIUM | E-3, E-5 | Resolved |
| F-5 Nav labels mismatched destinations | MEDIUM | E-2, E-4 | Resolved |

The headline defect: `review.tsx` branched on role, so a CEO saw "Review Operations
Centre" and a PM saw "Review Center" — **different names for the same destination**.

---

# 2. COMMITS

| Commit | Phase | Content |
|---|---|---|
| `961354a` | E-1 | Audit document and frozen platform lexicon |
| `da507b4` | E-2 | Centre spelling sweep; honest nav labels |
| `efbb1d1` | E-3 | `PageHeader` / `SectionHeader` / `EmptyState` / `LoadingState` |
| `899aa2a` | E-4 | ~25 pages migrated; heading hierarchy fixed |
| `2145f35` | E-5 | Token sweep; EmptyState consolidation |
| *(this)* | E-6 | 40 doctrine tests; handoff; canonical context |

---

# 3. FILES CREATED

- `docs/ux/WORKSTREAM_E_IA_AUDIT.md` — audit, frozen lexicon, phase plan
- `client/src/components/page-shell.tsx` — the four shared primitives
- `tests/doctrine/platform-ia.spec.ts` — IA-01 … IA-24 (40 tests)
- `docs/handoffs/workstream-e-platform-ia-handoff.md` — this document

# 4. FILES MODIFIED

~95 files. By category:

- **Terminology (11)** — `review.tsx`, `review-detail.tsx`, `qa.tsx`,
  `financial-explorer.tsx`, `payroll.tsx`, `payroll-export.tsx`,
  `JobIntelligenceSection.tsx`, `InvoiceReadinessPanel.tsx`, `JobForecastPanel.tsx`,
  `PendingExposurePanel.tsx`, plus comments in `mockData.ts` / `offlineQueueStore.ts`
- **Navigation (1)** — `layout.tsx`: two label corrections
- **PageHeader adoption (~25 pages)** — listed in the `899aa2a` commit message
- **Token sweep (~40 files)** — pages, components, portal, worker surfaces

---

# 5. TESTS ADDED

`tests/doctrine/platform-ia.spec.ts` — 40 tests, IA-01 … IA-24.

| Group | IDs | Covers |
|---|---|---|
| Terminology canon | IA-01–06 | F-1 |
| Heading hierarchy | IA-07–14 | F-2 |
| Nav / destination match | IA-15–19 | F-5 |
| Cross-role consistency | IA-21–22 | F-2, F-3 |
| Doctrine preservation | IA-23–24 | Approval Doctrine |

IA-09 is parameterised across 18 CEO routes, which is why 24 IDs yield 40 tests.

**Expected total: 955 = 915 baseline + 40.** Confirmed by `playwright test --list`.

## 5.1 A test that was deliberately removed

An earlier IA-20 asserted that empty-state headings numbered `>= 0` — vacuously true,
incapable of failing. It was removed rather than shipped. F-4's consolidation is
verified structurally instead: exactly one `function EmptyState` now exists in
`client/src`, in `page-shell.tsx`. Whether a section renders empty depends on seed
data, so an e2e assertion would be flaky or fake.

---

# 6. VERIFICATION RESULTS

| Check | Result |
|---|---|
| `npm run build` | **PASS** (after every phase) |
| `data-testid` contract | **0 removed** — verified after E-4 and E-5 |
| Spec compiles / lists | **PASS** — 40 tests |
| Full suite count | 955 (= 915 + 40), reconciles exactly |
| Existing heading-level assertions | **0 in the suite** — `h2`→`h1` cannot break any |
| Existing "Review Center" text assertions | **0** — sweep cannot break any |

## 6.1 What has NOT been verified — read this before merging

**The Playwright suite has not been run.** Per the standing preference, the repository
owner runs it locally. Two consequences:

1. **The 40 new tests have never executed.** They compile and list, but no assertion
   has been proven to pass. Expect to fix one or two on first run — the most likely
   candidates are IA-13 (depends on a `/jobs/` link selector), IA-15 (clicks a nav
   link that must be visible without expanding a section), and IA-14 (asserts `/map`
   has no `h1`, which is true today but is an inference from source, not observation).
2. **The 915 existing tests have not been re-run against these changes.** The static
   checks above are strong — 0 testids removed, 0 heading-level assertions, 0 literal
   "Review Center" assertions — but they are static. They cannot catch a layout change
   that alters visibility, click interception, or scroll position.

**Recommended first run:** `npx playwright test tests/doctrine/platform-ia.spec.ts`
before the full suite, so new-test failures are isolated from regressions.

## 6.2 A pre-existing issue found in passing

`npm run build` uses Vite/esbuild, which **does not typecheck**. Running
`tsc --noEmit` reports **76 errors**, identical in count on `main` and on this branch,
none in files E created. They are pre-existing and out of E's scope, but they mean
"Build PASS" is a weaker signal than it looks. Worth its own task before backend work
begins, since the backend phase will lean on types much harder than a mock-data
frontend does.

---

# 7. DOCTRINE COMPLIANCE

Workstream E is a **presentation-layer consolidation only** — the same posture as UX-5.

No change was made to:

- Any engine in `client/src/lib/` (except two code comments in `mockData.ts` and
  `offlineQueueStore.ts`, which changed "Review Center" to "Review Centre")
- `portalProjections.ts` or any projection model — the Client Portal doctrine boundary
  is untouched, so no internal field became reachable
- RBAC role gates, route protection, or any `roles={[...]}` declaration
- The Review Centre approval path
- Any audit event, emission point, or payload
- Financial normalization

Doctrines explicitly preserved: Approval, Audit, Job Attribution, Financial Integrity,
Review Centre, Notification, Activity Feed, Event Bus, Workflow Automation, Dashboard
Intelligence, Executive Command Centre, Analytics, Reporting, Export & Distribution,
Client Portal Projection.

IA-23 and IA-24 assert the two that a presentation change could most plausibly
undermine: that no approval control appeared outside the Review Centre, and that the
Review Centre is still the approval surface.

---

# 8. OUTSTANDING WORK

## 8.1 E-7 — Accessibility & Commercial Polish — OWNER DECISION REQUIRED

Workstream E as chartered also owns demo experience, investor presentation quality,
accessibility, responsive behaviour and performance perception. E-4 resolved the single
largest accessibility defect (missing `h1`). The rest is a distinct body of work:

- Focus management and focus-visible rings across the custom sidebar
- ARIA landmarks and `aria-current` on navigation
- Full WCAG AA contrast audit
- Skeleton states for perceived performance (`LoadingState` exists but is unadopted)
- Responsive audit at tablet breakpoints for the internal platform

**Recommendation: scope as an explicit E-7 rather than expanding E-4.** Without that
boundary, "finish Workstream E" has no definable completion criterion.

## 8.2 Dead files

`client/src/pages/activity-feed.tsx` and `client/src/pages/executive-command-centre.tsx`
are unreferenced — superseded by the UX-5 Intelligence Hub. `/activity-feed` redirects.
They were skipped during migration rather than styled. Flagged as a separate task;
deletion deserves its own verified change.

Note the contrast: `analytics-centre.tsx` and `reporting-centre.tsx` are **not** dead —
`intelligence-hub.tsx` still imports content components from them.

## 8.3 Deferred by design

- **`/map`** has no page header (full-bleed map). IA-14 pins this so it stays a
  deliberate exemption rather than becoming an accident.
- **Detail pages** (job, client, worker, asset, location, stock, equipment, invoice,
  review) keep bespoke entity headers. Back-link + eyebrow + title is a genuinely
  different pattern from a section page. They received the `h2`→`h1` fix only.
- **Remaining palette literals** — `bg-slate-{700..950}`, `border-slate-{300,400,700..900}`,
  `text-slate-{200,300}` and all `/opacity` variants are intentional dark surfaces and
  overlays. Each was verified to pair with `text-white`.
- **`LoadingState`** is built but unadopted; adoption belongs to E-7.

---

# 9. RECOMMENDED NEXT STEPS

1. Run `tests/doctrine/platform-ia.spec.ts` in isolation; fix any new-test failures.
2. Run the full suite; confirm 955 / 955 and 0 regressions against the 915 baseline.
3. Decide on **E-7** (§8.1) — this is the gate on declaring Workstream E complete.
4. Review and merge this branch.
5. Cross-workstream A–E completeness review, as originally planned.
6. Consider addressing the 76 pre-existing type errors (§6.2) before backend work.
7. Begin backend implementation against the frozen domain model and architecture.

---

# 10. STATUS

**E-1 → E-6 complete and committed. Build PASS. Playwright unrun — owner verification
required before merge.**

Workstream E's five findings are resolved and test-guarded. Whether the workstream is
*complete* depends on the E-7 decision in §8.1.
