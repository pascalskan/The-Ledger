# THE LEDGER — Claude Skills Framework

**Version:** 1.0
**Status:** Active
**Last Updated:** June 2026

---

## PURPOSE

This document defines the native Claude Skills framework for The Ledger. These skills enable specialist AI agents to be invoked independently or chained together for complex development tasks across Claude Code, Claude Projects, Claude CoWork, and future multi-agent workflows.

Each skill is a self-contained specialist that reads the canonical context and produces structured, actionable output without requiring additional setup.

---

## SKILLS DIRECTORY

| Skill | Role | Primary Use |
|---|---|---|
| `ledger-product-manager` | Senior Product Manager | Roadmap, scope, dependencies, sequencing |
| `ledger-architect` | Chief Architect | Architecture, doctrine validation, module design |
| `ledger-ux-auditor` | Senior UX Auditor | Navigation, workflows, role UX, scoring |
| `ledger-design-system-guardian` | Design System Guardian | UI consistency, design debt, standardization |
| `ledger-test-architect` | Test Architect | Test plans, doctrine tests, coverage, Playwright |
| `ledger-financial-doctrine-guardian` | Financial Doctrine Guardian | Financial compliance, automation safety, doctrine |
| `ledger-rbac-workflow-auditor` | RBAC and Workflow Auditor | Permissions, role boundaries, workflow integrity |

---

## SKILL DESCRIPTIONS

### ledger-product-manager

**Invocation path:** `.claude/skills/ledger-product-manager/SKILL.md`

Scope decisions, roadmap alignment, programme analysis, dependency mapping. Understands all four user programmes (CEO, PM, Worker, Client). Always the first agent in a planning pipeline.

**When to use:** Before building anything. When assessing what to build next. When scoping a feature.

---

### ledger-architect

**Invocation path:** `.claude/skills/ledger-architect/SKILL.md`

Architectural correctness, module placement, state management patterns, doctrine validation at the structural level. Enforces all four mandatory doctrines: Approval, Audit, Job Attribution, Financial Integrity.

**When to use:** After product scoping, before implementation. When an architectural question arises during implementation.

---

### ledger-ux-auditor

**Invocation path:** `.claude/skills/ledger-ux-auditor/SKILL.md`

Scores UX quality across five dimensions (Discoverability, Efficiency, Simplicity, Cognitive Load, Role Alignment). Reviews navigation, workflows, information architecture, and mobile experience by role.

**When to use:** After a feature is implemented. Before a release. When navigation changes. When a UX regression is suspected.

---

### ledger-design-system-guardian

**Invocation path:** `.claude/skills/ledger-design-system-guardian/SKILL.md`

Reviews Tailwind and shadcn/ui usage, KPI card patterns, table implementations, dialog patterns, typography, and responsive behaviour. Produces a design debt assessment.

**When to use:** After implementing any UI page or component. During design debt cleanup. Before a release.

---

### ledger-test-architect

**Invocation path:** `.claude/skills/ledger-test-architect/SKILL.md`

Produces Playwright test plans, coverage matrices, doctrine test cases, regression risk assessments, and `data-testid` requirements. Understands the platform's test ID naming conventions.

**When to use:** Before implementing a feature (to define tests). After implementing a feature (to verify coverage). When a doctrine test is needed.

---

### ledger-financial-doctrine-guardian

**Invocation path:** `.claude/skills/ledger-financial-doctrine-guardian/SKILL.md`

Enforces all eight financial doctrines: Approval, Financial Integrity, Review Centre, Accounting Sync, Financial Normalization, Financial Controls, Reconciliation, Audit. Reviews automations for financial safety. Has zero-tolerance rules that trigger immediate escalation.

**When to use:** Whenever a feature touches financial data, approval workflows, automations, or accounting sync. When in doubt, invoke this skill.

---

### ledger-rbac-workflow-auditor

**Invocation path:** `.claude/skills/ledger-rbac-workflow-auditor/SKILL.md`

Validates role permission boundaries for all four roles (CEO, PM, Worker, Client). Reviews data visibility, approval permissions, workflow boundaries, and multi-tenant isolation. Has zero-tolerance rules that trigger immediate escalation.

**When to use:** Whenever a feature has role-specific access. When navigation changes. When a new actor type is introduced.

---

## COWORK PATTERNS

### Direct Specialist Invocation

```
@ledger-product-manager What should we build next after Phase 6.8?
```

```
@ledger-architect Is this module placement architecturally correct?
```

```
@ledger-financial-doctrine-guardian Does this automation violate the Approval Doctrine?
```

```
@ledger-rbac-workflow-auditor Can a Worker see invoice totals?
```

### Sequential Specialist Chain

```
@ledger-product-manager → @ledger-architect → @ledger-financial-doctrine-guardian
```

Use when planning a new financial feature from scratch.

---

## RECOMMENDED PIPELINES

### Minimal Feature Review (Small Changes)

```
1. ledger-architect
2. ledger-test-architect
```

For small, well-scoped changes with clear architecture. Skip product and doctrine reviews for purely UX or cosmetic changes.

---

### Standard Feature Review (Medium Features)

```
1. ledger-product-manager
2. ledger-architect
3. ledger-test-architect
```

For clearly-scoped features without financial implications.

---

### Financial Feature Review (Any Financial Interaction)

```
1. ledger-product-manager
2. ledger-architect
3. ledger-financial-doctrine-guardian
4. ledger-rbac-workflow-auditor
5. ledger-test-architect
```

Mandatory for any feature that touches financial records, approval workflows, or accounting sync.

---

### Large Feature / New Domain Review (Full Pipeline)

```
1. ledger-product-manager
2. ledger-architect
3. ledger-financial-doctrine-guardian
4. ledger-rbac-workflow-auditor
5. ledger-ux-auditor
6. ledger-design-system-guardian
7. ledger-test-architect
8. Implementation
```

For new domains, major features, or anything that touches multiple user programmes.

---

### UX Audit Pipeline

```
1. ledger-ux-auditor (all roles)
2. ledger-design-system-guardian
3. ledger-rbac-workflow-auditor (confirm no role confusion)
4. ledger-test-architect (generate UX test cases)
```

---

### Pre-Release Audit Pipeline

```
1. ledger-financial-doctrine-guardian (full platform audit)
2. ledger-rbac-workflow-auditor (full platform audit)
3. ledger-ux-auditor (all roles)
4. ledger-design-system-guardian (full platform audit)
5. ledger-test-architect (coverage gap analysis)
```

---

### Financial Compliance Audit Pipeline

```
1. ledger-financial-doctrine-guardian
2. ledger-rbac-workflow-auditor
3. ledger-test-architect (generate doctrine test cases)
```

---

## PARALLEL WORKFLOWS

Some agents can run in parallel when they do not depend on each other's output:

```
Parallel Group A (independent):
  - ledger-ux-auditor
  - ledger-design-system-guardian
  - ledger-rbac-workflow-auditor

Parallel Group B (requires architect output):
  - ledger-test-architect (after architect produces structure)
```

```
Parallel Group C (independent):
  - ledger-financial-doctrine-guardian
  - ledger-ux-auditor
```

---

## DECISION GATES

Each pipeline has implicit decision gates. A downstream agent should not proceed if an upstream agent finds a blocking issue:

| Gate | Condition to Proceed |
|---|---|
| After ledger-product-manager | Scope is defined and approved |
| After ledger-architect | No VIOLATION in any doctrine |
| After ledger-financial-doctrine-guardian | No Critical financial risk unresolved |
| After ledger-rbac-workflow-auditor | No Critical RBAC violation unresolved |
| After ledger-test-architect | All P0 tests are defined |
| Before merge | All P0 tests pass |

---

## CANONICAL SOURCE OF TRUTH

All skills read:

```
docs/ai-context/LEDGER_CANONICAL_CONTEXT.md
```

If any skill output conflicts with this document, the canonical context takes precedence.

Never invent doctrine. Never override doctrine. Never bypass doctrine.
