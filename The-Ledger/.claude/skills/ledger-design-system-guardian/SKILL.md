# SKILL: ledger-design-system-guardian

**Role:** Design System Guardian — The Ledger
**Version:** 1.0
**Status:** Active

---

## PURPOSE

Protects the visual and structural consistency of The Ledger UI. Responsible for ensuring every component, page, and pattern adheres to the established Ledger design system built on Tailwind CSS and shadcn/ui.

This skill reviews implementations for design consistency, identifies design debt, and provides standardization recommendations so the UI feels like one cohesive product.

---

## SOURCE OF TRUTH

Always read before acting:

```
docs/ai-context/LEDGER_CANONICAL_CONTEXT.md
```

Also read:
- Most recent file in `docs/handoffs/`
- `client/src/components/` for existing component patterns
- `client/src/pages/` for existing page patterns
- `tailwind.config.ts` for design token configuration

---

## WHEN TO INVOKE

Invoke this skill when:

- A new page or component has been built and needs design review
- A design inconsistency has been noticed across pages
- A new component is being designed and existing patterns should be referenced
- A table, dialog, KPI card, or form is being built
- Responsive layout behaviour needs standardization review
- Design debt is being assessed across the platform
- A UI refactor is being considered
- Pre-release design consistency audit is required

---

## WHEN NOT TO INVOKE

Do not invoke this skill when:

- The question is about UX workflow or navigation (use `ledger-ux-auditor`)
- The question is about architectural structure (use `ledger-architect`)
- The question is about doctrine compliance (use `ledger-financial-doctrine-guardian`)
- The question is about test coverage (use `ledger-test-architect`)
- A purely logic-layer change is being made with no UI impact

---

## INPUTS

Provide one or more of:

| Input | Description |
|---|---|
| Component or page name | What is being reviewed |
| File path | Where the component lives |
| Description of the UI | What it looks like |
| Suspected inconsistency | What seems wrong |
| Reference component | The existing pattern to compare against |

---

## LEDGER DESIGN SYSTEM CONVENTIONS

### Technology Stack
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — component library (Dialog, Table, Badge, Card, etc.)
- **Lucide React** — icon library

### KPI Cards
- Use `Card` from shadcn/ui
- Consistent padding: `p-6`
- Title: `text-sm text-muted-foreground`
- Value: `text-2xl font-bold`
- Trend indicator: coloured badge or arrow icon
- Always include a relevant icon

### Tables
- Use `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from shadcn/ui
- Column headers: `text-left font-medium`
- Status badges: use `Badge` with variant
- Action columns: right-aligned
- Empty states: always provided with descriptive message

### Dialogs / Modals
- Use `Dialog` from shadcn/ui
- Header: `DialogHeader` with `DialogTitle`
- Footer: action buttons right-aligned (cancel left, confirm right)
- Destructive actions: `variant="destructive"`
- Confirm actions: `variant="default"`

### Filters
- Filter bar above table
- `Input` for search, `Select` for dropdowns
- Consistent horizontal layout
- Clear/reset controls provided

### Badges / Status Indicators
- Pending: `secondary`
- Approved: `default` (green-tinted or success)
- Rejected: `destructive`
- In Progress: `outline` or custom
- Custom variants documented per domain

### Typography Hierarchy
- Page title: `text-2xl font-bold` or `text-3xl font-bold`
- Section heading: `text-lg font-semibold`
- Card label: `text-sm text-muted-foreground`
- Body text: `text-sm`
- Caption / meta: `text-xs text-muted-foreground`

### Responsive Layout
- Desktop: full sidebar visible, main content area
- Mobile: sidebar collapses, hamburger menu
- Breakpoints follow Tailwind defaults (`sm`, `md`, `lg`, `xl`)
- Mobile-first approach where possible

### Spacing
- Page padding: `p-6` or `p-8`
- Section spacing: `space-y-6`
- Card spacing: `gap-4` or `gap-6` in grid layouts
- KPI card grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

---

## OUTPUT FORMAT

Produce the following sections:

### Consistency Review
- Overall consistency assessment
- Components reviewed
- Patterns identified

### Design Debt Assessment
For each inconsistency found:
- **Issue ID:** DS-XXX
- **Severity:** Critical / Major / Minor / Observation
- **Component / Page:** What is affected
- **Issue:** What the inconsistency is
- **Standard:** What the correct pattern is
- **Fix:** Specific recommendation

### Design Debt Summary

| Severity | Count |
|---|---|
| Critical | X |
| Major | X |
| Minor | X |
| Observation | X |

### Standardization Recommendations
Ordered list of changes to bring all components into alignment, highest impact first.

### Pattern Reference
Where applicable, reference the existing correct pattern that new implementations should follow.

---

## SEVERITY DEFINITIONS

| Severity | Definition |
|---|---|
| Critical | Breaks visual coherence, causes user confusion, or contradicts established component contract |
| Major | Clearly inconsistent with established patterns, noticeable to attentive users |
| Minor | Small deviation that could be standardized in a cleanup pass |
| Observation | Noted for awareness, acceptable for now |

---

## REVIEW PROCESS

1. Read canonical context
2. Identify the component or page being reviewed
3. Read the relevant component files
4. Compare against Ledger design conventions
5. Identify inconsistencies with severity levels
6. Produce recommendations ordered by impact

---

## SUCCESS CRITERIA

This skill has succeeded when:

- All inconsistencies are identified with specific, actionable fixes
- Recommendations are ordered by impact
- Correct pattern references are provided for each fix
- Design debt severity is quantified

---

## ESCALATION CRITERIA

Escalate to human review when:

- A Critical design issue would require significant structural refactoring
- A new component pattern needs to be established (not just aligned)
- A design token or theme-level change is required

---

## ANTI-PATTERNS TO FLAG

Flag immediately if:

- Custom CSS is used where Tailwind utilities exist
- Non-shadcn components are introduced without justification
- Icon libraries other than Lucide are used
- Typography deviates from the established hierarchy
- Status badge colours are inconsistent with platform conventions
- Tables are built without shadcn/ui Table components
- Dialogs are built without shadcn/ui Dialog components
