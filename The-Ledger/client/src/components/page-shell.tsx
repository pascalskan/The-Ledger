/**
 * PAGE SHELL PRIMITIVES — Workstream E (E-3)
 *
 * A single presentation vocabulary shared by every role surface: CEO, PM,
 * Worker and Client Portal.
 *
 * Before E-3, 33 internal pages hand-rolled their title. Roughly 30 of 48
 * rendered it as an <h2> with no <h1> anywhere on the page, and title size
 * split between text-3xl (leaf pages) and text-2xl (hubs) with no rule — so
 * the title changed size as the user navigated. The Client Portal had a real
 * EmptyState component while the executive platform had one ad-hoc local copy.
 *
 * These primitives fix all of that in one place.
 *
 * DOCTRINE: presentation only. Nothing here reads, derives, or mutates
 * operational or financial state. No component in this file may ever accept a
 * callback that approves, rejects, or normalises anything — actions passed to
 * `actions` are rendered, never invoked, by these primitives.
 *
 * TESTID CONTRACT (E-4 migration safety):
 * `testId` is applied to the heading element itself, matching the pre-E-4
 * markup (`<h1 data-testid="finance-hub-heading">`). These components NEVER
 * generate a testid — an omitted `testId` renders no attribute at all. This is
 * what allows 33 pages to migrate without breaking any of the 915 existing
 * tests.
 */

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { LucideIcon } from "lucide-react";

// ──────────────────────────────────────────────────────
// PAGE HEADER
// ──────────────────────────────────────────────────────

interface PageHeaderProps {
  /** The page title. Rendered as the page's single <h1>. */
  title: React.ReactNode;
  /** Supporting sentence beneath the title. */
  description?: React.ReactNode;
  /** Applied to the <h1>. Never generated — omit for no attribute. */
  testId?: string;
  /** Buttons or controls aligned to the right of the title. */
  actions?: React.ReactNode;
  /** Optional icon rendered inline before the title. */
  icon?: LucideIcon;
  className?: string;
}

/**
 * The single <h1> of a page. Exactly one PageHeader per route.
 *
 * Size is fixed at text-3xl so that titles do not resize between hubs and leaf
 * pages — the inconsistency F-2 recorded.
 */
export function PageHeader({
  title,
  description,
  testId,
  actions,
  icon: Icon,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1
          className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground"
          data-testid={testId}
        >
          {Icon && <Icon className="h-7 w-7 shrink-0" />}
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// SECTION HEADER
// ──────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Applied to the <h2>. Never generated. */
  testId?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
}

/**
 * A section division *within* a page. Renders <h2>, so the document outline
 * stays h1 → h2 rather than starting at h2 as most pages did before E-4.
 */
export function SectionHeader({
  title,
  description,
  testId,
  actions,
  icon: Icon,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h2
          className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground"
          data-testid={testId}
        >
          {Icon && <Icon className="h-5 w-5 shrink-0" />}
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// EMPTY STATE
// ──────────────────────────────────────────────────────

interface EmptyStateProps {
  /** Short statement of what is absent, e.g. "No quotes". */
  title: string;
  /** Why it is absent, or what will cause it to appear. */
  body?: string;
  icon?: LucideIcon;
  testId?: string;
  /** Optional call to action, e.g. a button that opens the relevant builder. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * The platform's one empty state.
 *
 * Generalised from the Client Portal's implementation (Workstream D), which
 * was the only well-formed empty state in the codebase — F-4 recorded that the
 * client-facing surface was more polished than the executive one. `body` and
 * `icon` are optional here so that the ad-hoc label-only states in the
 * internal platform can migrate without inventing copy for them.
 */
export function EmptyState({
  title,
  body,
  icon: Icon,
  testId,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed border-border bg-card px-6 py-12 text-center",
        className,
      )}
      data-testid={testId}
    >
      {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />}
      <h3 className="text-lg font-medium text-foreground">{title}</h3>
      {body && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

// ──────────────────────────────────────────────────────
// LOADING STATE
// ──────────────────────────────────────────────────────

interface LoadingStateProps {
  /** Number of skeleton rows. Match the shape of the content being awaited. */
  rows?: number;
  testId?: string;
  /** Announced to assistive technology while content loads. */
  label?: string;
  className?: string;
}

/**
 * Skeleton placeholder occupying the shape of pending content.
 *
 * `aria-busy` and the visually-hidden label mean screen-reader users are told
 * that content is loading rather than encountering an empty region.
 */
export function LoadingState({
  rows = 3,
  testId,
  label = "Loading",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn("space-y-3", className)}
      data-testid={testId}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
