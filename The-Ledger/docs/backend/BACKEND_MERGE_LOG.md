# THE LEDGER — BACKEND MERGE LOG

Maintained by: the Project Manager (main session)
Branch: `backend` (GitHub) — the "main" of the theoretical GitHub
Process: `docs/backend/BACKEND_AGENT_ROSTER.md` (v1.1), The Job Lifecycle

---

## PURPOSE

This is the record of the theoretical GitHub. Every job assigned to a subagent, every commit the PM checked, every review round, every merge into `backend` and every notification sent is written here. Every agent reads it at the start of a job, so later agents know what earlier agents built.

Only the PM edits this file.

---

## JOB INDEX

| Job | Phase | Agent | Branch | Status | Merge SHA |
|---|---|---|---|---|---|
| phase-1-spec | 1 Tenant | backend-architect (new instance) | agent/backend-architect/phase-1-spec | Merged — approved by owner Oct 25, 2026 | f3a4ef1 |
| phase-0-platform | 0 Infrastructure | backend-platform-engineer | agent/backend-platform-engineer/phase-0 | Merged | 03af379 |
| phase-0-fix-1 | 0 Infrastructure | backend-platform-engineer | agent/backend-platform-engineer/phase-0-fix-1 | Open | — |
| phase-0-gate-tests | 0 Infrastructure | backend-test-engineer | agent/backend-test-engineer/phase-0 | Open | — |
| phase-0-replit | 0 Infrastructure | backend-architect | agent/backend-architect/phase-0-replit | Merged | 99746d9 |
| phase-0-spec | 0 Infrastructure | backend-architect | agent/backend-architect/phase-0-spec | Merged — approved by owner Oct 21, 2026 | 5768030 |

Status values: **Open** (assigned, commits in progress) → **In review** (review rounds running) → **Merged** → or **Abandoned** (with reason).

---

## ENTRY TEMPLATE

Copy this block for each job, newest at the top of the Entries section.

```
### <job> — <agent> — <status>

Phase: <n> <module>
Branch: agent/<agent>/<job>   (from backend @ <sha>)
Specification: docs/backend/phases/<file>

Commits checked
| # | SHA | Message | PM verdict | Notes |
|---|---|---|---|---|

Review rounds
| Round | Focus | Findings sent | Agent answer | Result |
|---|---|---|---|---|
| 1 | Correctness | | | |
| 2 | Security and doctrine | | | |
| 3 | Efficiency and quality | | | |

Verification on merge: npm run check / build / unit / gate — <results>
Merge: <merge sha> into backend on <date>
Public surface changed: <exports, events, routes, tables>
Notified: <agents and what they were told>
Follow-ups: <anything deferred, with owner>
```

---

## ENTRIES

### phase-1-spec — backend-architect (new instance) — Merged (approved by owner)

Phase: 1 Tenant Module
Branch: agent/backend-architect/phase-1-spec   (from backend @ 359fa02)
Specification: docs/backend/phases/PHASE-1-tenant.md (to be written)
Assigned October 21, 2026, while Phase 0 is being built (owner asked for parallel progress). Includes the Phase 1 platform work decided in Phase 0: company_id foreign keys on the platform tables (OQ-04) and the shared pagination helper (OQ-17). Owner checkpoint required before implementation.
Handover (October 24, 2026): the first instance stopped at a usage limit on October 21 before writing anything. A new Sonnet instance restarts the job on the same worktree and branch.

Commits checked
| # | SHA | Message | PM verdict | Notes |
|---|---|---|---|---|
| 1 | 17a5767 | docs(backend): Phase 1 spec sections 1-4 (scope, sources, data model, domain model) | Accepted, continue (with notes for commit 2) | Notes: lifecycle row lock must be FOR NO KEY UPDATE (FOR UPDATE would block every tenant FK check); INV-1 wording vs plans exception; FK checks need no REFERENCES grant; enforce 'tenant-cli' literal location (INV-11 forgery path); audit entry for configuration change records previous/new values per Audit Doctrine, events field names only; OQ1-11 decided by PM — job D adds companies A/B fixture helper and updates Phase 0 gate fixtures, job C merges only after that and with the Phase 0 gate suite green; updated_by FK as Phase 2 obligation |
| 2 | 0f477c0 | docs(backend): Phase 1 spec v0.2 - use cases, API, events, audit; PM review points 1-7 | Accepted, continue (with notes for commit 3) | Points 1–7 applied. Notes: now() is transaction start, so statusChangedAt cannot order lifecycle events — add companies.lifecycle_version (+1 per transition, trigger-enforced) and order by it; one trim-before-validate/store/compare rule for all text inputs; Phase 7 obligation on showing script operator/hostAccount/reason to the tenant CEO; G1 race, staleness, fail-closed, forged-cursor, padded no-op and 403-before-400 cases required in §9 |
| 3 | d416622 | docs(backend): Phase 1 spec v0.3 - gate tests, prototype differences, commit plans, open questions | Accepted — job complete, review rounds start | Commit-2 notes applied: lifecycle_version (+1, trigger-enforced) orders lifecycle events; clock_timestamp() after lock; one trim rule; Phase 7 operator-metadata obligation; G1-01…G1-72 incl. the eight required race/edge cases. Jobs A → B → D1 → C → D2 |
| 4 | 0ebcaff | docs(backend): Phase 1 spec v0.4 - review round 1 (correctness) | Round 1 answer | See review rounds |
| 5 | 7cac8fc | docs(backend): Phase 1 spec v0.5 - review round 2 (security and doctrine) | Round 2 answer | See review rounds |
| 6 | 211c8ba | docs(backend): Phase 1 spec v0.6 - review round 3 (efficiency and quality) | Round 3 answer | See review rounds |

Review rounds
| Round | Focus | Findings sent | Agent answer | Result |
|---|---|---|---|---|
| 1 | Correctness (independent Sonnet reviewer; PM-verified, PG claims tested on local 16.14) | 3 blockers (Drizzle inserts vs column grants; script has no catalogue; Phase 0 gate red after job A), 6 majors (TRUNCATE trigger/SQLSTATE, terminal state in shared fixtures, FK convention vs rule 7, no test catches FOR UPDATE, in-process scrub, job sequencing), 11 minors (incl. locale-dependent [[:cntrl:]]). PM decisions: sql-template inserts; opener takes [tenantModule]; new job D0 stub port lands with A; later-module FKs by custom migration plus generic catalogue gate test | 0ebcaff (v0.4): all 20 fixed, none disputed; G1-73…G1-76 added; six jobs A, D0, B, D1, C, D2 | Passed (PM re-checked: locale-independent character class verified on PG 16.14; no stray control characters in the file) |
| 2 | Security and doctrine (independent Sonnet reviewer) | 0 blockers, 4 majors (non-HTTP tenant enforcement by convention; regex DoS from 1 MB body; operator metadata in tenant-visible audit; script keeps JWT/worker secrets), 12 minors. PM decisions: PA-06 required subscriber tenantStatusPolicy ('active_only'|'any', no default) enforced by the worker; length-before-pattern; metadata.platformAdmin reserved key with Phase 7 redaction gate; script env allowlist; admin functions in tenant/admin.ts with branded script contexts; worker column-level SELECT on configurations; retention triggers; ISO 4217 list; lock_timeout 5 s | 7cac8fc (v0.5): all 16 fixed, none disputed; PA-06 (§5.8), G1-77 added; job A gains A5 | Passed (PM checked structure intact after the agent's §5.8 reinsertion) |
| 3 | Efficiency and quality (independent Sonnet reviewer) | 6 majors (A/D0 circular per-commit checks; B4 uses types registered in B5; oversized commits; script imports vs roster; rule 13 in the wrapper; OQ1-08 vs PA-06), 16 minors, 7 nits. PM decisions: A4a → D0a → A4b/c with PM-directed sibling-branch merge; catalogue in B4; split A2/A3/A4/B2/B4; keep admin.ts and amend roster (OQ1-18); loadCliEnvironment; 2 s status-lookup deadline; PA-06 memo/skip/rate-limit; joined getTenantContext; lock_timeout + 503 SERVICE_BUSY on UC-06; latches instead of sleeps; suite-wide log-marker hook | 211c8ba (v0.6): all 29 fixed, none disputed; 77 gate tests (G1-69 retired into G1-24), FB and SC tables; six jobs with stepwise A/D0 checks | Passed (PM checked: every cited G1 ID defined, no stray characters, all 12 sections present) |


Merged into backend at f3a4ef1 (October 25, 2026) after three review rounds. Owner approval (October 25, 2026): the owner approved the Phase 1 Tenant specification v0.6 and all PM-recommended answers to OQ1-01 … OQ1-18 as written. Applied: spec status APPROVED; roster v1.3 (OQ1-18 script imports and PM-directed sibling-branch merges; agent definitions updated). Next: open jobs A, D0, B, D1, C, D2 once Phase 0 is merged into backend.
### phase-0-platform — backend-platform-engineer — Merged

Phase: 0 Infrastructure Foundation
Branch: agent/backend-platform-engineer/phase-0   (from backend @ 359fa02)
Specification: docs/backend/phases/PHASE-0-infrastructure.md v0.6 (approved)
Assigned October 21, 2026. Nine-commit plan, spec §11.2. Local .env (git-ignored) points at the Docker mirror ledger-pg; local development JWT keys generated by the PM.
Handover (October 24, 2026): the first instance stopped at a usage limit on October 21 with uncommitted work and no commits. Per the owner's direction that all subagents run on Sonnet, a new Sonnet instance takes over the same worktree and branch, reviews the leftover work against the specification, and continues the commit plan.

Commits checked
| # | SHA | Message | PM verdict | Notes |
|---|---|---|---|---|
| 1 | 535a668 | platform: tooling, scripts and test configuration | Accepted, continue | Leftover work reviewed and kept; npm ci clean; check covers tests; unit project only, nothing from server/tests referenced; .env.example fails validation by design. Scripts that need later files deferred to commits 4 and 8 (accepted). |
| 2 | bf35351 | platform: configuration, modes, logger and error serializer | Accepted, continue | PM re-ran: check passes, 137/137 unit tests; no process.env outside platform/config in non-test files; TLS fail-closed per RB2-03. Rulings: loadApiConfig stays synchronous using node:crypto key checks (jose in commit 6 with a same-keys test); build.ts client .env scan kept in commit 2; AppError early ok; WARN when sslrootcert is present (commit 3/4); startup LOG_LEVEL fix in commit 3. Test engineer told the config interfaces |
| 3 | b675296 | platform: HTTP pipeline, errors and frontend-only mode | Accepted, continue | PM re-ran: check clean, 184/184. Frontend-only Playwright 971/979, the 8 load flakes passed on a single-worker rerun (979/979); run on Chromium 1234 junctioned for the expected 1223 — accepted for this check only, the G0-02 gate run uses the lockfile's browser. Accepted: URIError client-error fix to commit-2 code; trackRoute route template; interim states to be closed by commits 4/6/7. Fix in commit 4: drizzle.config.ts still points at the deleted shared/schema.ts |
| 4 | 54c8f30 | platform: database client, platform tables and grant migration | Accepted, continue | PM re-ran: check clean; unit 205/205, db 41/41; no process.env outside config (incl. drizzle.config.ts). 0001/0002 SQL read and match §3.5. Ruling for the test engineer (pass with the pull instruction): G0-51 reads guarded settings first and sets PG* owner credentials with PGDATABASE a non-test name (heliumdb), guard unchanged; createTestPools() is an accepted extra helper. ledger_dev to be migrated by the PM at phase verification |
| 5 | fb76fb4 | platform: unit of work, audit writer, outbox writer, tenant scoping | Accepted, continue (hardening in commit 6) | PM re-ran: check clean; unit 266/266, db 95/95; no process.env outside config. Beyond-spec items accepted (UnitOfWorkAbortedError, expireContextWhenClosed, early adoptUnit/HumanActorRequiredError, lower-cased ids, top-level JSON null = SQL NULL with a nested-null round-trip test). Condition: installDefaultRunner becomes install-once (no undefined), reset only in testing/, never on the module surface. migrate test keeps a strict check on platform-owned schemas. Test-engineer call shapes to pass with the pull instruction |
| 6 | a703658 | platform: JWT utilities and token middleware | Accepted, continue | PM re-ran: check clean; unit 340/340, db 100/100; algorithm pinned, maxTokenAge 15m, clockTolerance 0. Closes the /health 503 and no-token 404 interim states; commit-5 hardening done (install-once). Rulings: createApiApp gains `auth` (async key import) — deviation from PS-02, accepted; runner reset made structural in commit 7 (holder unexported, reset throws unless isVitest); production exit on unmigrated DB is correct — runbook note 'db:migrate before start'. Commit 7 must install the runner with registry catalogues |
| 7 | c14f0c2 | platform: module registry, subscriber registry and port registry | Accepted, continue | PM re-ran: check clean; unit 399/399, db 113/113; no process.env outside config. All interim states closed; runner carries registry catalogues; reset structural (throws outside Vitest). Rulings: `__` namespaces allowed only under Vitest (spec note at next amendment); entry-point seam approved for commit 8 (startApi/startWorker in platform taking modules, injected exit, spawned smoke tests); modules/registry.ts is the composition root, repointed to platform/index.ts in commit 9 |
| 8 | f9e746c | platform: outbox worker and worker process | Accepted, continue | PM re-ran: check clean; unit 410/410, db 142/142; no process.env outside config. .replit diff matches RP-06; claim EXPLAIN uses event_outbox_ready_idx with LockRows/Limit, no sort (R3-01). Entry-point seam (startApi/startWorker) with in-process G0-41(i). Rulings: single-process spawn accepted, PM checks for orphans on Replit; SIGTERM test skipIf(win32) so the Linux gate covers it; G0-41(i) API case runs in full mode (tell test engineer); commit-9 Playwright check may use the junctioned Chromium, authoritative G0-02 is the PM's with the matching browser after owner OK |
| 9 | c24d6e7 | platform: public surface and final verification | Accepted — job complete, review rounds start | server/platform/index.ts surface with allowlist test (14 values, 26 types; no tables, pools, system or testing exports); registry.ts repointed; G0-43 keys; shutdown tests (SIGTERM Linux-only) |
| 9a | 836cfde | platform: make two commit-9 tests prove what they claim | Accepted | Test files only. PM re-ran final tree: check clean; unit 420/420; db 143 pass + 1 skipped (Linux SIGTERM); gate 0 files. Frontend-only Playwright on chromium 1223: 970/979, 9 cold-load flakes pass at 1 worker (979/979). Rule: server/platform/process/ name kept — the scanner flags the identifier, not string literals; G0-40 confirms after the pull |

October 25, 2026: with the owner's permission, the PM ran `npx playwright install chromium` (Playwright 1.60.0): chromium-1223 and chromium_headless_shell-1223 are now installed in the default ms-playwright folder. Commit 9's check and the G0-02 sign-off run use the expected browser; the junction workaround is retired.

Review rounds
| Round | Focus | Findings sent | Agent answer | Result |
|---|---|---|---|---|
| 1 | Correctness (independent Sonnet reviewer; PM verified both majors in code) | 0 blockers; 2 majors (checked-out pg client has no 'error' listener → process crash on connection loss; mid-batch throw leaves claimed rows locked and heartbeated forever); 6 minors (humanOnly by caller token; uow.tx.$client leak; production exit on refusal; finish ROLLBACK failure; stop() flag; maxTokenAge → TOKEN_EXPIRED). PM rulings: connection-class/RuntimeRoleError in a subscriber = loop-level failure, release without counting; m3 kept as §3.5 says (exit 1 in production), runbook covers db:migrate; release-on-stop ratified as a deviation | 7aebe86 (+eda3633 test fix), 7f72656, d8b8ba1, f62887c, f57c192: all fixed with tests (M1 regression test fails on the old code); m3 acknowledged | Passed (PM re-ran f57c192: check clean; unit 451/451; db 173 + 1 skipped) |
| 2 | Security and doctrine (independent Sonnet reviewer; PM verified majors 1–2 in code) | 3 majors (closed flag set after COMMIT/ROLLBACK lets late writes autocommit; uow.tx._.session.client still reaches the raw client — release/password/raw COMMIT; six serializer bypasses), 4 minors (VITE_ checks weaker than Vite; case-insensitive /API not logged; no unhandled-rejection handler; shared mutable payload + other-role secrets left in env), 1 spec residual (raw tx.execute → scanner flags sql.raw, test engineer). PM rulings: closing flag before COMMIT/ROLLBACK; allowlisted tx facade + pre-COMMIT integrity check (transaction_timestamp, current_user, app.company_id); bindings/args/toJSON/URL walk; per-process env hardening accepted beyond spec | 844235d, 2405853, f531726, fb2b3cf, 821b112, e89e3fb, df4191e, 038a878, 9740a02: all fixed with tests (M1, M3, m7a fail on old code); pre-COMMIT check costs one statement per unit; tx facade + one-method client + transaction-control denylist | Passed (PM re-ran 9740a02: check clean; unit 566/566; db 222 + 1 skipped; build clean) |
| 3 | Efficiency and quality (independent Sonnet reviewer; PM reproduced both majors in node) | 2 majors (quadratic URL-credential regex on every log string — 235 ms at 20k chars; transaction-control denylist bypassed by nested delimiters — three COMMIT bypasses reproduced), 7 minors (double scan; 4 round trips per unit; 2 redundant outbox statements per row; duplicated transaction pattern; Error message/stack not redacted; dead code and duplication; sleeps in tests), 2 nits. PM rulings: linear regex with early return; single tokenising pass plus refusal of multi-statement module SQL; BEGIN+set_config in one statement with asserted UUID literal; refreshHeld RETURNING; withTransaction helper; worker pool max 2 | 2579303…1ac58e4 (16 commits): all 11 fixed; hand-written PostgreSQL-style tokenizer with nested comments and multi-statement refusal; 3 platform round trips per unit; 16 statements per 2-subscriber event (was 20) | PM re-ran (unit 632/632, db 199 + 1 skipped) and probed the guard with 31 inputs: one bypass left (E''' escape strings) — follow-up requested (E-string tokenising + fail closed on unterminated tokens); 33ccefa fixed it — PM re-probed (E-string bypasses refused, legitimate E-strings allowed), unit 651/651, db 199 + 1 skipped, build and bundle-string scan clean | Passed |


Merged into backend at 03af379 (October 26, 2026) after three review rounds; merged code is identical to 33ccefa outside docs. Notified: backend-test-engineer (pull instruction with all accumulated rulings and interfaces). Follow-ups for phase verification: a Vitest 'something prevents the main process from exiting' warning after the test run (open handle to find); the Linux-only SIGTERM test and orphan check run first on the Replit gate; runbook note 'npm run db:migrate before starting a production build'; fold into the Phase 0 spec at its next amendment: rule-13 test-file ruling, ALTER USER lint, `__` namespaces only under Vitest, G0-51 PGDATABASE, createApiApp auth, startApi/startWorker seam, release-on-stop, pre-COMMIT integrity check, multi-statement refusal.
### phase-0-fix-1 — backend-platform-engineer — Open

Phase: 0 Infrastructure Foundation (gate fix)
Branch: agent/backend-platform-engineer/phase-0-fix-1   (from backend @ 3ec483e)
Why: gate test G0-46(d) — the runtime-role refusal for unexpected memberships must name the extra role (spec §9, G0-46 row); the platform names only the connecting role.

Commits checked
| # | SHA | Message | PM verdict | Notes |
|---|---|---|---|---|

### phase-0-gate-tests — backend-test-engineer — Open

Phase: 0 Infrastructure Foundation
Branch: agent/backend-test-engineer/phase-0   (from backend @ 359fa02)
Specification: docs/backend/phases/PHASE-0-infrastructure.md v0.6 (approved)
Assigned October 21, 2026, in parallel with phase-0-platform. Gate tests G0-01 … G0-51 from the spec, not the implementation; runs green only after the platform merges and the PM asks for a pull.
Handover (October 24, 2026): the first instance stopped at a usage limit on October 21 with uncommitted work and no commits. Per the owner's direction that all subagents run on Sonnet, a new Sonnet instance takes over the same worktree and branch, reviews the leftover work against the specification, and continues the commit plan.

Commits checked
| # | SHA | Message | PM verdict | Notes |
|---|---|---|---|---|
| 1 | 42d8f23 | tests(phase-0): support primitives and gate_test fixtures | Accepted, continue | Leftover files kept; test-env.ts fixed to parse (not load) .env so the gate never pollutes process.env; gate_test fixtures idempotent with api_only granted to ledger_app only. PM RULING (agent question): spec §4.8 rule 13 applies to non-test files only; test files = *.test.ts and server/tests/** (rule 1a definition), exemption checked by path; server/platform/testing/** is platform code and reads config only via server/platform/config/. Platform engineer notified. To be folded into the spec at its next amendment. |
| 2 | d39cac8 | tests(phase-0): boundary scanner, migration lint and G0-40 fixture tree | Accepted, continue | TypeScript-parser scanner for rules 1, 1a, 2–6, 8–13 and the migration lint; 57 planted sources and 18 SQL fixtures, 50/50 expected violations, controls clean. PM rulings: report the most specific rule only (precedence 12, 11, 1a, 10, 8, 6, 5, 4, 3, 2, 9, 1, 13); ALTER USER refused like ALTER ROLE (spec note at next amendment); no test exemption for rules 2, 8, 12; add a fixture for a module file importing the registry. Real-tree scan red until platform commit 3 moves server/index.ts env reads into config |
| 3 | b619926 | tests(phase-0): G0-40 boundary and migration-lint gate, G0-42 no Redis | Accepted, continue | Rule 8 gap closed (module importing registry); precedence asserted; 25 pass, 1 skip, 1 todo on vitest 4.1.12 (scratchpad install); mutation checks fail (a)/(f)/(g) as expected. Condition: the PLATFORM_PRESENT skip on G0-40(l) is removed in the merge-backend commit (gate becomes unconditional). Next: spec-only input tables (G0-39, G0-36, G0-32), no guessed platform signatures |
| 4 | d067610 | tests(phase-0): token attack cases (G0-32, G0-33, G0-35) with generator controls | Accepted, continue | Spec-only token case data with one-defect-per-case and cryptographic controls (33 pass, 37 todo awaiting platform); keys generated at run time, none embedded. Probe context paths /api/v1/__probe/context and /portal/v1/__probe/context accepted. Next: G0-39, then G0-36 + G0-51; then stop until the platform merges |
| 5 | a578ceb | tests(phase-0): G0-39 test-database guard cases with placeholder-password controls | Accepted, continue | Per-run placeholder passwords on unroutable .invalid hosts; leakedSecrets proven non-vacuous; one defect per case; 42 pass, 63 todo. Rows where §9.10 does not fix the reported rule/variable stay loose, with a comment |
| 6 | 1adcdcb | tests(phase-0): G0-36 and G0-51 configuration cases and fallback control | Accepted — spec-only work complete; agent idle until the platform merges | Env-object cases with exact expected ConfigError.variables and leak lists; G0-51(e) proves the PG* owner fallback is real on the test DB; mutation check fails as designed; 55 pass, 93 todo. Scrub test uses the PG* prefix rule (§9 RB2-02 row) |
| 7 | 0b7584a + 7efc745 | merge backend (platform); tests(phase-0): G0-40(l) unconditional on the merged platform; sql.raw rule | Accepted, continue | Pulled backend at 7cd21f2, no conflicts. PLATFORM_PRESENT skip removed; real-tree scan of 115 files + 3 migrations finds no violation; sql.raw in module code is a rule-10 violation. PM re-ran: check clean, gate 56 passed / 92 todo. G0-51(e2) pgpass deprecation warning kept on purpose |
| 8 | 12a89fd | tests(phase-0): support layer - probe modules, app and worker builders, log capture | Accepted, continue | gate_probe / gate_alpha / gate_beta probe modules with a call-recording kit; createHarness builds full-mode apps through the platform's own loaders and registries; statement recorder; in-memory log capture; harness smoke test. PM re-ran: gate 63 passed / 92 todo; test-only files only |
| 9 | 99a4f73 | tests(phase-0): G0-03 to G0-08 audit atomicity and the Unit of Work | Accepted, continue | 39 tests read back as owner; G0-03 revoke/restore with control; G0-05 direct and swallowed; G0-07 no SAVEPOINT; G0-08 zero statements per refusal. PM re-ran: gate 102 passed / 92 todo; no platform defect. Next commit adds a per-file §3.5 grant check so a failed revoke restore is loud |
| 10 | 9d1b0bf | tests(phase-0): G0-31 to G0-35 and G0-48 against the platform; grant check before every file | Accepted, continue | Token attack cases sent over Supertest with handler-never-ran, WWW-Authenticate and token-not-logged checks; surface swaps; API/frontend separation; namespaces, public routes, contextOf. assertGrantsIntact before every file. G0-48(e) reading confirmed (contextOf after leaving the async scope). PM re-ran: gate 138 passed / 56 todo; no platform defect |
| 11 | 4c0cd97 | tests(phase-0): G0-09 to G0-19 and G0-44 outbox integrity and causation | Accepted, continue | Outbox delivery, idempotency, concurrency, fencing, heartbeat, backoff/dead letter, recovery, causation. Mutation checks (platform temporarily mutated, restored, nothing committed) fail the right tests. Rulings: G0-14(a2) added (W1 resumes while W2 holds the row — fences on locked_by; spec note at next amendment); 5 s base backoff + owner-set next_attempt_at for determinism. PM re-ran: gate 175 passed / 57 todo; platform files unchanged vs backend |
| 12 | c4aa3c0 | tests(phase-0): G0-20 to G0-26, G0-43, G0-45, G0-46 roles, grants, triggers, self-check | Accepted, continue | 106 tests; every role statement in BEGIN…ROLLBACK with SQLSTATE and privilege cross-checks; exact column sets; owner-proof triggers; throwaway roles. Mutation checks fail the right tests. G0-46(d) found a platform defect (refusal doesn't name the extra role, spec says it must) → fix job phase-0-fix-1; todo until merged. G0-45 rebuild substitute accepted. PM re-ran: gate 281 passed / 58 todo |

Review rounds
| Round | Focus | Findings sent | Agent answer | Result |
|---|---|---|---|---|

### phase-0-replit — backend-architect — Merged

Phase: 0 Infrastructure Foundation (amendment)
Branch: agent/backend-architect/phase-0-replit   (from backend @ 1ee38a2, which includes the root .replit from main, PRs #46/#47)
Specification: docs/backend/phases/PHASE-0-infrastructure.md → v0.6
Why: the owner approved the Phase 0 specification and all PM-recommended answers to the open questions (October 21, 2026), and decided that all hosting is on Replit; Replit adaptations are required now.
PM groundwork: main has a root .replit (PRs #46 and #47, CI green, merged); Replit project The-Ledger-main pulled main @ a70c19d; Replit PostgreSQL 16.10 (host helium, reachable only inside Replit): development database heliumdb, test database ledger_test created; roles ledger_runtime, ledger_app and ledger_worker created there without passwords (the owner sets them); local mirror for agents: Docker container ledger-pg (PostgreSQL 16.14, 127.0.0.1:55432) with ledger_dev, ledger_test and the same roles.
Items: RP-01 variable names vs the Replit-injected DATABASE_URL; RP-02 the owner-URL-present rule; RP-03 libpq PG* fallbacks; RP-04 superuser owner; RP-05 two test environments; RP-06 worker process on Replit; RP-07 other Replit risks.

Commits checked
| # | SHA | Message | PM verdict | Notes |
|---|---|---|---|---|
| 1 | 138b169 | docs(phase-0-spec): v0.6 [1] owner approval; Replit variables, env reading, explicit connections | Accepted, continue | Owner approval and OQ closures recorded; LEDGER_ variable names, no migration fallback to Replit DATABASE_URL; config module is the only process.env reader (rule 13); explicit Pool objects, complete URLs, PGOPTIONS refused. Note sent: keep the literal process.env.NODE_ENV for esbuild define. |
| 2 | 50e8fba | docs(phase-0-spec): v0.6 [2] superuser owner, test environments, worker on Replit, Replit risks | Accepted, continue | RP-04 found a real bug: test rebuild would have dropped pg_catalog etc. under the postgres superuser; fixed. Two test environments documented; worker workflow TOML for platform commit 8; Phase 9 always-on worker. PM ruling OQ-19: The-Ledger-main is not published until production Secrets and roles exist. |
| 3 | 862eeed | docs(phase-0-spec): v0.6 [3] Replit gate tests, map, differences, checklist, OQ-19 ruling | Accepted | G0-51 libpq fallback test, G0-36(j)/G0-39/G0-46/G0-20 updates, §9.2/§10/§11 updated, cross-reference check 0 problems. Job finished → review rounds. |
| 4 | f83efa1 | docs(phase-0-spec): v0.6 review round 1 fixes RA1-01 to RA1-04 | Accepted (round 1 closed) | See round 1 row |
| 5 | 359f4ac | docs(phase-0-spec): v0.6 round 2 [A] env reading allowlist, scrubbing, TLS fail-closed, Replit .env | Accepted (round 2) | |
| 6 | 80426d2 | docs(phase-0-spec): v0.6 round 2 [B] migration lint, bounded test roles, obligations, Replit notes | Accepted (round 2 closed) | |
| 7 | 9ec7169 | docs(phase-0-spec): v0.6 review round 3 fixes RC3-01 to RC3-05 | Accepted (round 3 closed) | |

Review rounds
| Round | Focus | Findings sent | Agent answer | Result |
|---|---|---|---|---|
| 1 | Correctness | RA1-01 Replit gate run must not disturb the main workspace (temporary worktree); RA1-02 G0-02 frontend-only run vs agent .env files; RA1-03 worker wait loop silent and unbounded; RA1-04 evidence that the gate does not depend on .replit workflows | Fix commit f83efa1: temporary detached gate worktree on Replit; frontend-only G0-02 procedure; waiting messages + console table; G0-38 ephemeral port (agent-found) | Closed — PM verified |
| 2 | Security and doctrine | Doctrine: 0 Blocking, 1 Should fix (rule-13 scanner evasions), 4 Notes. Security: 0 Blocking, 3 Should fix (scrub superuser env after load, TLS fail-closed in production, no .env on Replit), 6 Notes. PM verified helium enforces passwords (wrong-password login refused). Sent as RB2-01…RB2-09 | Commits 359f4ac, 80426d2: rule-13 allowlist, owner-variable scrub, TLS fail-closed, no .env on Replit, migration lint, bounded test roles, §4.10 rows, Replit notes | Closed — PM verified |
| 3 | Efficiency and quality | RC3-01 mutation table rows for every amendment guarantee; RC3-02 self-check one statement per connection; RC3-03 Replit gate npm ci cost; RC3-04 every amendment item mapped to a commit and the checklist; RC3-05 header/status, cross-reference re-run | Fix commit 9ec7169: ten mutation-table rows with anti-vacuous controls (G0-36(o)/(n), G0-51(e), G0-39(q), G0-46(f)); self-check one statement per connection; npm ci --prefer-offline with timings; every item mapped to commits 2/4/8/9 and agents; header/status | Closed — PM verified |

Verification on merge: docs-only job (one file, +305/−84); no code changed, so check/build/tests unaffected and not run. Cross-reference script: 0 problems.
Merge: 99746d9 into backend on October 21, 2026 (--no-ff).
Public surface changed: none in code; the specification now names the LEDGER_ variables, the config-module-only environment rule (13), explicit pools, the Replit test environments and the .replit worker workflow.
Notified: the platform engineer and the test engineer are briefed from spec v0.6 and this entry when their Phase 0 jobs start (next).
Follow-ups: owner sets ledger_app/ledger_worker passwords on Replit and the three _TEST Secrets before the first Replit gate run.

### phase-0-spec — backend-architect — Merged (awaiting owner checkpoint)

Phase: 0 Infrastructure Foundation
Branch: agent/backend-architect/phase-0-spec   (from backend @ b6ab5be)
Specification: docs/backend/phases/PHASE-0-infrastructure.md (v0.5, 2,015 lines)
Preflight: no phase dependencies; decisions D-10, D-12, D-14, D-16 APPROVED.
Assigned: October 20, 2026. Planned commits: (1) sections 1–4, (2) sections 5–8, (3) sections 9–12.

Commits checked
| # | SHA | Message | PM verdict | Notes |
|---|---|---|---|---|
| 1 | 33d9b6b | docs(phase-0-spec): scope, sources, data model and platform model | Changes requested | A: FileStorage stays Phase 4 (PM ruling, roadmap). B: add causation (event/actor) for subscriber work. C: record Data vs Event architecture conflict on approval→normalization transaction as owner OQ. D: evaluate separate worker DB role. E: propose frontend-only start mode (D-13). F: pg error messages leak input values. G: domain-layer access to CompanyId type. |
| 2 | e8c2383 | docs(phase-0-spec): apply PM review A-G to sections 1-4 | Accepted, continue | A–G resolved: causation columns + unforgeable subscriber context; ledger_worker role; frontend-only mode; allowlist serializer; plain strings in domain; OQ-16 raised (approval→financial record: same transaction vs subscriber). Carried to round 1: R1-01 — Review→Financial Normalization call is upward, not like D-06. |
| 3 | fa3b411 | docs(phase-0-spec): platform services, API, events and audit entries | Accepted, continue | PS-01…PS-22 incl. PS-16 port registry; worker fencing verified; error envelope never echoes messages. Pulled backend (merge 5f532dc, D-17). Carried: R1-01 cite D-17; R2-01 no personal data in paths; R3-01 claim query vs ready index. |
| 4 | 3c9d626 | docs(phase-0-spec): gate tests, differences, commit plan, open questions | Accepted | 43 gate tests (G0-01…G0-43) mapped to all six roadmap gate items; §10 differences; 9-commit plan; OQ-01…OQ-18. Job finished → review rounds. |
| 5 | 6959ffd | docs(phase-0-spec): review round 1 fixes R1-01 to R1-05 | Accepted (round 1 closed) | See round 1 row |
| 6 | e367436 | docs(phase-0-spec): round 2 [1] roles, grants and immutability triggers | Accepted, continue | ledger_runtime group role (no app↔worker membership), §3.1.8a financial/approval writes API-only, column INSERT grants, owner-proof immutability triggers, runtime-role self-check, PUBLIC revokes, password. Note sent: other roles relying on PUBLIC CONNECT need explicit grants. |
| 7 | f1ea859 | docs(phase-0-spec): round 2 [2] contexts, ports, registry and boundaries | Accepted, continue | Agent hit a usage limit after committing, before reporting; PM reviewed the commit directly (clean tree, complete). humanOnly ports, WeakSet-brand frozen expiring contexts, private causation actor, system-context surface (rule 11), declarative public routes + module namespaces, no savepoints, rule 10, tenantValues + set_config, audit/event catalogues with jobRequired, requeue rules, OQ-09 ruling, §4.10 obligations. |
| 8 | 1a21789 | docs(phase-0-spec): round 2 [3] logging, HTTP, tokens, config and guard | Accepted, continue | Driver-parser test-DB guard + server-side current_database() check; error serializers on every key; route templates and the no-personal-data-in-paths convention (closes R2-01 carried); JWT required claims and max age; portal secret format; security headers; deduplicated /health. |
| 9 | d8d875e | docs(phase-0-spec): round 2 [4] gate tests, differences, obligations, open questions | Accepted | 50 gate tests; every R2 item and the OQ-09 ruling mapped in §9.2; §10.3, §11, §12 and §4.10 updated; spec v0.4. PM ruling on the agent question: server/scripts/** ownership added to the roster. |
| 10 | 7636b4e | docs(phase-0-spec): round 3 [1] claim plan, index budget, acquire check, lock heartbeat | Accepted, continue | Claim uses the ready index without a sort; append-only tables keep only constraint/reader indexes; role check moved into withClient (connect hooks are not awaited); lock heartbeat per row and per subscriber. |
| 11 | 36a978e | docs(phase-0-spec): round 3 [2] approval-column grants, type ownership, port roles | Accepted, continue | Worker INSERT on review tables column-level without decision columns; audit/event type ownership with module-bound units and adopt(); rule 12 port implementations; port roles (approvalEffects ceo/pm); default-privilege EXECUTE revoke; client/.env* secret scans. |
| 12 | f9537ed | docs(phase-0-spec): round 3 [3] checklist, test strength, run cost, self-check and logging | Accepted, continue | Implementer checklist §11.1; mutation table §9.12 (19 guarantees, tests tightened); agent found and fixed a gap in its own heartbeat (now batch-wide); §9.13 run cost and determinism; self-check effective memberships/privileges; nested-error walk; route on 500s. Note sent: worker test hooks must not be settable in production. |
| 13 | c8ba5dd | docs(phase-0-spec): round 3 [4] cross-reference check, numbering, version, worker hooks | Accepted | Scripted cross-reference check (0 problems after 50 manual fixes); PS numbering offset removed; production worker factory takes no test hooks; G0-01 checks the bundle. |

Review rounds
| Round | Focus | Findings sent | Agent answer | Result |
|---|---|---|---|---|
| 1 | Correctness | R1-01 D-17 port design in §4.8/§4.9/PS-16; R1-02 backoff formula gives 0.5× base on first failure; R1-03 G0-14 can deadlock on the effects key; R1-04 esbuild hard-codes NODE_ENV=production in the bundle; R1-05 gate globalSetup owned by test engineer breaks implementer branch; R1-06 evidence on G0-12(b) and finish-lock-lost | Fix commit 6959ffd (spec v0.3): port fields in registry, import rule 9 (no module cycles), PS-16 wiring order; backoff uses new count; latch first in G0-14 + new G0-14(b); bundles always production; platform owns test setup, test engineer owns only gate fixtures; R1-06 evidenced | Closed — PM verified each fix in the file |
| 2 | Security and doctrine | Doctrine reviewer: 2 Blocking (worker role inherits API role → could write financial tables; approval-effects port reachable from system contexts) + 11 Should fix. Security reviewer: 0 Blocking + 12 Should fix. PM verified and merged into R2-B1, R2-B2, R2-01…R2-18 (context forgery, causation hidden, system-context surface, declarative public routes + namespaces, column INSERT grants, savepoints, no module connections, tenant stamping, owner triggers on audit/event_log, runtime-role self-check, PUBLIC revokes, robust test-DB guard, logging gaps + route templates + path convention, JWT required claims + secret format, security headers, job attribution on audit and events, requeue safety, test code out of bundles). PM ruling: OQ-09 stale recovery counts as an attempt. | Commits e367436, f1ea859, 1a21789, d8d875e (spec v0.4), every ID answered; PM verified each group in the file | Closed — PM verified; doctrine reviewer: 21/21 resolved (+1 Should fix, 2 Notes); security reviewer: 9/12 resolved, 3 partly (+5 Notes); remainders moved to round 3 (R3-09…R3-17) |
| 3 | Efficiency and quality | R3-01 claim ORDER BY vs ready index; R3-02 write amplification on append-only tables; R3-03 node-postgres does not await pool connect handlers (self-check timing); R3-04 batch lock ageing vs stale threshold; R3-05 cross-reference integrity; R3-06 implementer checklist; R3-07 mutation table (which test fails for which defect); R3-08 gate run cost and flaky timing; from re-verification: R3-09 worker INSERT on submissions column-level without status/approval columns; R3-10 catalogue owning module; R3-11 approval-effects reachable only via bind; R3-12 self-check effective memberships/privileges; R3-13 nested errors in logs; R3-14 route not path on 500s + undecodable param; R3-15 port roles list; R3-16 Bearer case recorded; R3-17 function EXECUTE in later schemas + client/.env* | Commits 7636b4e, 36a978e, f9537ed, c8ba5dd (spec v0.5), every ID answered | Closed — PM verified each group in the file |

Verification on merge: docs-only job (one file, docs/backend/phases/PHASE-0-infrastructure.md, +2,015); no code changed, so npm run check / build / tests are unaffected and were not run for this merge. Architect ran a scripted cross-reference check (0 problems).
Merge: 5768030 into backend on October 21, 2026 (--no-ff).
Public surface changed: none in code. The specification defines the platform surface every module will use (server/platform/index.ts, ModuleRegistration, ports, catalogues, roles and grants) and 59 gate-test rows (G0-01 … G0-50 with lettered cases).
Notified: no other agent is on a job yet. The platform engineer and the test engineer are briefed from this specification and this entry when their Phase 0 jobs are assigned after the owner checkpoint.
Follow-ups: owner checkpoint (spec approval and OQ-02 … OQ-18); owner prerequisite before platform commit 4 — hosted PostgreSQL dev and test databases plus the one-off role SQL in §3.5; PM to update CLAUDE.md "CURRENT PLATFORM STATE" when Phase 0 code merges.
