/**
 * UX-6.6 — AUTOMATION GOVERNANCE DASHBOARD
 *
 * Brings governance visibility directly into the Automation Hub so a CEO can
 * answer "Are my automations operating safely and within governance policy?"
 * without leaving for the standalone Governance Centre.
 *
 * READ-ONLY. It derives everything from the existing governance engine
 * (records, exceptions, audit log) and the scheduler engine. It surfaces risk,
 * compliance posture, safeguards, and exposure — it does NOT create, change, or
 * remove any governance control. Restriction / suspension / review workflows
 * and the CEO's governance authority remain entirely in the Governance Centre.
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Gauge,
  AlertTriangle,
  Ban,
  Eye,
  Lightbulb,
  ExternalLink,
  CheckCircle2,
  FileWarning,
  History,
  Landmark,
} from "lucide-react";
import {
  type AutomationGovernanceRecord,
  type AutomationRiskLevel,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  GOVERNANCE_STATUS_LABELS,
  GOVERNANCE_STATUS_COLORS,
  EXCEPTION_STATUS_LABELS,
  EXCEPTION_STATUS_COLORS,
  EXCEPTION_SEVERITY_COLORS,
  getAllGovernanceRecords,
  computeGovernanceSummary,
  getAllExceptions,
  getGovernanceAuditLog,
} from "@/lib/automationGovernanceEngine";
import {
  AUTOMATION_CATEGORY_LABELS,
  AUTOMATION_CATEGORY_COLORS,
} from "@/lib/automationEngine";
import { getAllSchedules } from "@/lib/automationSchedulerEngine";

const RISK_ORDER: AutomationRiskLevel[] = ["Low", "Medium", "High", "Critical"];

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Governance detail dialog (informational) ────────────────────────────

function GovernanceDetailDialog({
  record, onClose,
}: { record: AutomationGovernanceRecord; onClose: () => void }) {
  const auditEntries = useMemo(
    () => getGovernanceAuditLog().filter((a) => a.ruleId === record.ruleId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [record.ruleId]
  );
  const exceptions = useMemo(
    () => getAllExceptions().filter((e) => e.ruleId === record.ruleId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [record.ruleId]
  );
  const restrictionHistory = auditEntries.filter((a) => a.action === "Restrict Automation");
  const suspensionHistory = auditEntries.filter((a) => a.action === "Suspend Automation");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto" data-testid="aut-gov-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{record.ruleNumber}</DialogTitle>
          <DialogDescription>{record.ruleName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Read-only banner */}
          <div className="flex items-start gap-2 rounded-md bg-violet-50 border border-violet-200 px-3 py-2.5 text-xs text-violet-700" data-testid="aut-gov-detail-readonly">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Informational governance view. Governance actions (restrict, suspend, mark compliant) remain in the Governance Centre — the CEO is the final authority.</p>
          </div>

          {/* Assessment summary */}
          <section data-testid="aut-gov-detail-assessment">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Governance Assessment</h4>
            <div className="rounded-md bg-muted/30 p-3 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-muted-foreground">Status</span><div className="mt-1"><Badge variant="outline" className={`text-xs ${GOVERNANCE_STATUS_COLORS[record.governanceStatus]}`}>{GOVERNANCE_STATUS_LABELS[record.governanceStatus]}</Badge></div></div>
              <div><span className="text-xs text-muted-foreground">Risk Level</span><div className="mt-1"><Badge variant="outline" className={`text-xs ${RISK_LEVEL_COLORS[record.riskLevel]}`}>{RISK_LEVEL_LABELS[record.riskLevel]}</Badge></div></div>
              <div><span className="text-xs text-muted-foreground">Category</span><div className="mt-1"><Badge variant="outline" className={`text-xs ${AUTOMATION_CATEGORY_COLORS[record.ruleCategory]}`}>{AUTOMATION_CATEGORY_LABELS[record.ruleCategory]}</Badge></div></div>
              <div><span className="text-xs text-muted-foreground">Last Reviewed</span><div className="mt-1 text-sm">{fmtDateTime(record.reviewedAt)}{record.reviewedBy ? ` · ${record.reviewedBy}` : ""}</div></div>
            </div>
          </section>

          {/* Risk explanation */}
          <section data-testid="aut-gov-detail-risk">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Risk Explanation</h4>
            <p className="text-sm text-muted-foreground rounded-md border p-3">{record.riskRationale || "No rationale recorded."}</p>
          </section>

          {/* Financial impact + safeguards */}
          <section data-testid="aut-gov-detail-safeguards">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Financial Impact & Safeguards</h4>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {record.isFinanciallySensitive && (<Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50"><ShieldAlert className="h-3 w-3 mr-1" />Financially Sensitive</Badge>)}
              {record.isApprovalProtected && (<Badge variant="outline" className="text-xs text-violet-700 border-violet-200 bg-violet-50"><ShieldCheck className="h-3 w-3 mr-1" />Approval Protected</Badge>)}
              {record.hasFinancialSafeguard && (<Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200 bg-emerald-50">Financial Safeguard Active</Badge>)}
              {!record.isFinanciallySensitive && !record.isApprovalProtected && (<span className="text-xs text-muted-foreground">No financial sensitivity.</span>)}
            </div>
            {record.safeguardNotes && (<p className="text-xs text-muted-foreground">{record.safeguardNotes}</p>)}
          </section>

          {/* Historical governance actions */}
          <section data-testid="aut-gov-detail-history">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5"><History className="h-3.5 w-3.5" />Historical Governance Actions</h4>
            {auditEntries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No governance actions recorded.</p>
            ) : (
              <div className="space-y-1.5">
                {auditEntries.map((a) => (
                  <div key={a.id} className="rounded-md border px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{a.action}</span>
                      <span className="font-mono text-muted-foreground">{fmtDateTime(a.timestamp)}</span>
                    </div>
                    <div className="text-muted-foreground mt-0.5">{a.previousStatus} → {a.newStatus} · by {a.performedBy}</div>
                    {a.notes && <div className="text-muted-foreground mt-0.5">{a.notes}</div>}
                  </div>
                ))}
              </div>
            )}
            {(restrictionHistory.length > 0 || suspensionHistory.length > 0) && (
              <div className="flex flex-wrap gap-2 mt-2 text-[11px] text-muted-foreground">
                <span>Restrictions: <span className="font-semibold">{restrictionHistory.length}</span></span>
                <span>Suspensions: <span className="font-semibold">{suspensionHistory.length}</span></span>
              </div>
            )}
          </section>

          {/* Exception history */}
          <section data-testid="aut-gov-detail-exceptions">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Exception History</h4>
            {exceptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No governance exceptions recorded.</p>
            ) : (
              <div className="space-y-1.5">
                {exceptions.map((e) => (
                  <div key={e.id} className="rounded-md border px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{e.exceptionType}</span>
                      <Badge variant="outline" className={`text-[10px] ${EXCEPTION_STATUS_COLORS[e.status]}`}>{EXCEPTION_STATUS_LABELS[e.status]}</Badge>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{e.description}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Audit references */}
          <section data-testid="aut-gov-detail-audit">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Audit References</h4>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Rule ID</span><span className="font-mono bg-muted px-2 py-0.5 rounded">{record.ruleId}</span></div>
              {record.governanceAuditIds.length > 0 && (
                <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Governance Audit IDs</span><span className="font-mono bg-muted px-2 py-0.5 rounded">{record.governanceAuditIds.join(", ")}</span></div>
              )}
            </div>
          </section>

          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main dashboard ──────────────────────────────────────────────────────

export function AutomationGovernanceDashboard() {
  const model = useMemo(() => {
    const records = getAllGovernanceRecords();
    const summary = computeGovernanceSummary(records);
    const exceptions = getAllExceptions();
    const audit = getGovernanceAuditLog();
    const schedules = getAllSchedules();

    // Risk distribution.
    const riskDist = RISK_ORDER.map((level) => {
      const count = records.filter((r) => r.riskLevel === level).length;
      return { level, count, pct: records.length > 0 ? Math.round((count / records.length) * 100) : 0 };
    });

    // Governance attention queue.
    const attention = records
      .filter((r) =>
        r.governanceStatus === "Requires Review" ||
        r.governanceStatus === "Restricted" ||
        r.governanceStatus === "Suspended" ||
        (r.isFinanciallySensitive && (r.riskLevel === "High" || r.riskLevel === "Critical"))
      )
      .map((r) => {
        const lastAction = audit
          .filter((a) => a.ruleId === r.ruleId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        return { record: r, actionTaken: lastAction?.action ?? "Flagged for review" };
      })
      .sort((a, b) => {
        const rank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return rank[b.record.riskLevel] - rank[a.record.riskLevel];
      });

    // Financial safety monitoring.
    const financiallySensitive = records.filter((r) => r.isFinanciallySensitive).length;
    const approvalProtected = records.filter((r) => r.isApprovalProtected).length;
    const governedSchedules = schedules.filter((s) => s.governanceReviewRequired).length;
    const restrictedFinancial = records.filter(
      (r) => r.isFinanciallySensitive && r.governanceStatus !== "Compliant"
    ).length;
    const highRiskFinancial = records.filter(
      (r) => r.isFinanciallySensitive && (r.riskLevel === "High" || r.riskLevel === "Critical")
    ).length;

    // Trend insights (data-driven, this-window).
    const compliancePct = records.length > 0 ? Math.round((summary.compliant / records.length) * 100) : 0;
    const movedToReview = audit.filter((a) => a.newStatus === "Requires Review").length;
    const restrictedCount = summary.restricted;
    const suspendedCount = summary.suspended;
    const criticalFinancialExceptions = exceptions.filter(
      (e) => e.severity === "Critical" &&
        (e.status === "Open" || e.status === "Investigating" || e.status === "Awaiting Approval")
    ).length;

    const insights: string[] = [];
    if (movedToReview > 0) insights.push(`${movedToReview} automation${movedToReview === 1 ? "" : "s"} moved to Requires Review.`);
    if (restrictedCount > 0) insights.push(`${restrictedCount} automation${restrictedCount === 1 ? " is" : "s are"} restricted due to governance concerns.`);
    if (suspendedCount > 0) insights.push(`${suspendedCount} automation${suspendedCount === 1 ? " was" : "s were"} suspended due to governance concerns.`);
    insights.push(`${compliancePct}% of governed automations remain compliant.`);
    if (criticalFinancialExceptions > 0) {
      insights.push(`${criticalFinancialExceptions} critical-risk financial automation${criticalFinancialExceptions === 1 ? " is" : "s are"} awaiting governance approval.`);
    } else {
      insights.push("No critical financial governance violations detected.");
    }

    return {
      records, summary, exceptions, riskDist, attention,
      financiallySensitive, approvalProtected, governedSchedules, restrictedFinancial, highRiskFinancial,
      insights,
    };
  }, []);

  const [selected, setSelected] = useState<AutomationGovernanceRecord | null>(null);

  const kpis = [
    { label: "Governed", value: model.summary.totalAutomations, icon: ShieldCheck, color: "text-slate-600", testId: "aut-gov-kpi-total" },
    { label: "Compliant", value: model.summary.compliant, icon: CheckCircle2, color: "text-emerald-600", testId: "aut-gov-kpi-compliant" },
    { label: "Requires Review", value: model.summary.requiresReview, icon: AlertTriangle, color: "text-amber-600", testId: "aut-gov-kpi-review" },
    { label: "Restricted", value: model.summary.restricted, icon: Ban, color: "text-amber-700", testId: "aut-gov-kpi-restricted" },
    { label: "Suspended", value: model.summary.suspended, icon: ShieldX, color: "text-red-600", testId: "aut-gov-kpi-suspended" },
    { label: "High Risk", value: model.summary.highRisk, icon: ShieldAlert, color: "text-amber-700", testId: "aut-gov-kpi-high" },
    { label: "Critical Risk", value: model.summary.criticalRisk, icon: ShieldAlert, color: "text-red-600", testId: "aut-gov-kpi-critical" },
    { label: "Exceptions", value: model.exceptions.length, icon: FileWarning, color: "text-violet-600", testId: "aut-gov-kpi-exceptions" },
  ];

  const RISK_BAR_COLORS: Record<AutomationRiskLevel, string> = {
    Low: "bg-emerald-500", Medium: "bg-blue-500", High: "bg-amber-500", Critical: "bg-red-500",
  };

  const financialTiles = [
    { label: "Financially Sensitive", value: model.financiallySensitive, testId: "aut-gov-fin-sensitive" },
    { label: "Approval Protected", value: model.approvalProtected, testId: "aut-gov-fin-protected" },
    { label: "Governed Schedules", value: model.governedSchedules, testId: "aut-gov-fin-schedules" },
    { label: "Restricted/Flagged Financial", value: model.restrictedFinancial, testId: "aut-gov-fin-restricted" },
    { label: "High-Risk Financial", value: model.highRiskFinancial, testId: "aut-gov-fin-highrisk" },
  ];

  return (
    <div className="space-y-4" data-testid="aut-governance-dashboard">
      {/* Doctrine notice + Centre link */}
      <div className="rounded-md bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700 flex items-start justify-between gap-3">
        <div>
          <span className="font-semibold">Governance Visibility: </span>
          Read-only executive view of automation risk and compliance. Governance actions and authority remain in the Governance Centre — the CEO is the final authority.
        </div>
        <Link href="/automation-governance" data-testid="aut-gov-centre-link" className="inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap hover:underline">
          Governance Centre <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* KPI overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3" data-testid="aut-gov-kpi-strip">
        {kpis.map(({ label, value, icon: Icon, color, testId }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                <span className="text-xl font-bold" data-testid={testId}>{value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Risk distribution + Trend insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="aut-gov-risk-distribution">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Gauge className="h-4 w-4 text-muted-foreground" /> Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {model.riskDist.map(({ level, count, pct }) => (
              <div key={level} data-testid={`aut-gov-risk-${level}`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <Badge variant="outline" className={`text-[10px] ${RISK_LEVEL_COLORS[level]}`}>{RISK_LEVEL_LABELS[level]}</Badge>
                  <span className="text-muted-foreground"><span className="font-semibold text-foreground" data-testid={`aut-gov-risk-count-${level}`}>{count}</span> · {pct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${RISK_BAR_COLORS[level]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card data-testid="aut-gov-insights">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Governance Trend Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {model.insights.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" data-testid={`aut-gov-insight-${i}`}>
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Financial Safety Monitoring */}
      <Card data-testid="aut-gov-financial-safety">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Landmark className="h-4 w-4 text-muted-foreground" /> Financial Safety Monitoring</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {financialTiles.map((t) => (
              <div key={t.label} className="rounded-md border bg-muted/20 px-3 py-2.5 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-violet-500 shrink-0" />
                <div>
                  <div className="text-lg font-bold" data-testid={t.testId}>{t.value}</div>
                  <div className="text-[10px] text-muted-foreground leading-tight">{t.label}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Governance Attention Queue */}
      <Card data-testid="aut-gov-attention-queue">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Governance Attention Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {model.attention.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center" data-testid="aut-gov-attention-empty">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium">No automations require governance attention.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {model.attention.map(({ record, actionTaken }) => (
                <div key={record.ruleId} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-md border px-3 py-2" data-testid={`aut-gov-attention-row-${record.ruleId}`}>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] text-muted-foreground">{record.ruleNumber}</div>
                    <div className="text-sm font-medium truncate">{record.ruleName}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className={`text-[10px] ${GOVERNANCE_STATUS_COLORS[record.governanceStatus]}`}>{GOVERNANCE_STATUS_LABELS[record.governanceStatus]}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${RISK_LEVEL_COLORS[record.riskLevel]}`}>{RISK_LEVEL_LABELS[record.riskLevel]}</Badge>
                    <Badge variant="outline" className={`text-[10px] ${AUTOMATION_CATEGORY_COLORS[record.ruleCategory]}`}>{AUTOMATION_CATEGORY_LABELS[record.ruleCategory]}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground sm:w-40 sm:text-right">
                    <div>Action: <span className="font-medium">{actionTaken}</span></div>
                    <div>Reviewed: {fmtDateTime(record.reviewedAt)}</div>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs h-7 shrink-0" onClick={() => setSelected(record)} data-testid={`aut-gov-btn-view-${record.ruleId}`}>
                    <Eye className="h-3 w-3 mr-1" /> View
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && <GovernanceDetailDialog record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
