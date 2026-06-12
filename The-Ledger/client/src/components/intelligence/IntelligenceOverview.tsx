import { useState } from "react";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth, useStore } from "@/lib/mockData";
import {
  getExecutiveHealthSnapshot,
  getCriticalItems,
  getExecutiveSummary,
  getOperationalOverview,
  recordExecutiveAlertOpened,
  recordExecutiveDeepLinkOpened,
  type HealthLevel,
  type CriticalAlertItem,
} from "@/lib/executiveCommandEngine";
import { getUnreadCount } from "@/lib/notificationEngine";
import { AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────
// HEALTH SCORECARD HELPERS (Blueprint 6.2 palette)
// ─────────────────────────────────────────────────────────────────────

function healthPillClasses(level: HealthLevel): string {
  if (level === "healthy") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (level === "warning") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function healthDot(level: HealthLevel): string {
  if (level === "healthy") return "bg-emerald-500";
  if (level === "warning") return "bg-amber-500";
  return "bg-red-500";
}

function healthStatusText(level: HealthLevel): string {
  if (level === "healthy") return "Healthy";
  if (level === "warning") return "Warning";
  return "Critical";
}

// Severity rendering for Critical Items — canonical display taxonomy (§6.2-B, P1-E):
// critical → red dot + "Critical"; high → amber dot + "Warning"
function severityDot(priority: CriticalAlertItem["priority"]): string {
  return priority === "critical" ? "bg-red-500" : "bg-amber-500";
}

function severityLabel(priority: CriticalAlertItem["priority"]): string {
  return priority === "critical" ? "Critical" : "Warning";
}

function severityLabelClasses(priority: CriticalAlertItem["priority"]): string {
  return priority === "critical" ? "text-red-700" : "text-amber-700";
}

const CRITICAL_ITEMS_COLLAPSED_COUNT = 5;

// ─────────────────────────────────────────────────────────────────────
// OVERVIEW TAB (UX-5 spec §6.2)
// ─────────────────────────────────────────────────────────────────────

export function IntelligenceOverview() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { jobs } = useStore();
  const [showAllCritical, setShowAllCritical] = useState(false);

  const health = getExecutiveHealthSnapshot();
  const summary = getExecutiveSummary();
  const operational = getOperationalOverview();

  // Sort: critical first, then high, then createdAt descending within each band (§6.2-B)
  const criticalItems = [...getCriticalItems()].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "critical" ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const visibleCriticalItems = showAllCritical
    ? criticalItems
    : criticalItems.slice(0, CRITICAL_ITEMS_COLLAPSED_COUNT);
  const hiddenCount = criticalItems.length - CRITICAL_ITEMS_COLLAPSED_COUNT;

  function handleCriticalItemOpen(item: CriticalAlertItem) {
    if (user?.name) {
      recordExecutiveAlertOpened(item.id, user.name);
      recordExecutiveDeepLinkOpened(item.sourceRoute, user.name);
    }
    setLocation(item.sourceRoute);
  }

  const healthCards: { key: string; label: string; level: HealthLevel; score: number }[] = [
    { key: "operational", label: "Operational Health", level: health.operational.level, score: health.operational.score },
    { key: "financial", label: "Financial Health", level: health.financial.level, score: health.financial.score },
    { key: "governance", label: "Governance Risk", level: health.governance.level, score: health.governance.score },
    { key: "workflow", label: "Workflow Efficiency", level: health.workflow.level, score: health.workflow.score },
  ];

  const summaryTiles: { key: string; label: string; value: number }[] = [
    { key: "active-jobs", label: "Active Jobs", value: jobs.filter((j) => j.status === "Active").length },
    { key: "pending-reviews", label: "Pending Reviews", value: summary.pendingReviews },
    { key: "active-rules", label: "Active Rules", value: operational.activeAutomations },
    { key: "open-exceptions", label: "Open Exceptions", value: summary.openExceptions },
    { key: "active-workflows", label: "Active Workflows", value: summary.activeWorkflows },
    { key: "unread-notifications", label: "Unread Notifications", value: getUnreadCount() },
  ];

  return (
    <div className="space-y-6">
      {/* ── A. HEALTH SCORECARD ── */}
      <div data-testid="intel-health-scorecard" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Health Scorecard</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1"
            data-testid="intel-health-view-analytics"
            onClick={() => setLocation("/intelligence?tab=analytics")}
          >
            View analytics <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {healthCards.map((card) => (
            <Card key={card.key} data-testid={`intel-health-${card.key}`} className="border">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                <p className="text-2xl font-bold">{card.score}/100</p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded-full border text-xs font-medium",
                    healthPillClasses(card.level)
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", healthDot(card.level))} />
                  {healthStatusText(card.level)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── B. CRITICAL ITEMS ── */}
      <Card data-testid="intel-critical-items">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Critical Items
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {criticalItems.length} items
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {criticalItems.length === 0 && (
            <div
              data-testid="intel-critical-items-empty"
              className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground"
            >
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              No critical items — all systems healthy.
            </div>
          )}
          {visibleCriticalItems.map((item) => (
            <div
              key={item.id}
              data-testid="intel-critical-item-row"
              data-priority={item.priority}
              className="flex items-start gap-3 p-3 rounded-md border bg-card"
            >
              <span className={cn("h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0", severityDot(item.priority))} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-xs font-semibold", severityLabelClasses(item.priority))}>
                    {severityLabel(item.priority)}
                  </span>
                  <p className="text-sm font-medium truncate">{item.title}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                <p className="text-xs text-muted-foreground mt-1">Source: {item.source}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="flex-shrink-0 gap-1 text-xs"
                aria-label={`Open source: ${item.title}`}
                onClick={() => handleCriticalItemOpen(item)}
              >
                Action <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {!showAllCritical && hiddenCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs gap-1"
              data-testid="intel-critical-items-show-all"
              onClick={() => setShowAllCritical(true)}
            >
              Show all {criticalItems.length} <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── C. PLATFORM SUMMARY STRIP (read-only; §10.1 sources) ── */}
      <div data-testid="intel-summary-strip" className="space-y-2">
        <h2 className="text-lg font-semibold">Platform Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryTiles.map((tile) => (
            <div
              key={tile.key}
              data-testid={`intel-summary-tile-${tile.key}`}
              className="p-3 rounded-md border bg-card text-center"
            >
              <p className="text-2xl font-bold">{tile.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
