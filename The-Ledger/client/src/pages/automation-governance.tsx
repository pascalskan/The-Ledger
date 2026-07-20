/**
 * PHASE 6.0D — AUTOMATION GOVERNANCE CENTRE
 *
 * CEO-only page. Provides operational oversight, risk classification,
 * compliance monitoring, and financial safety controls for all
 * automation rules in The Ledger.
 *
 * Tabs:
 *   1. Governance Dashboard — risk table, filters, CEO actions
 *   2. Exceptions — exception queue with resolve/reject/escalate
 *   3. Compliance Audit — immutable read-only audit trail
 *
 * Doctrine:
 *   Governance NEVER weakens existing safeguards.
 *   CEO retains final authority.
 *   All actions generate immutable audit records.
 *   No silent overrides. No silent approvals.
 *   Job attribution preserved in all records.
 */

import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { PageHeader } from '@/components/page-shell';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  ShieldCheck,
  ShieldX,
  Lock,
  Unlock,
  Activity,
  FileSearch,
  TriangleAlert,
  BadgeCheck,
} from "lucide-react";
import {
  type AutomationGovernanceRecord,
  type AutomationExceptionRecord,
  type GovernanceAuditEntry,
  type AutomationRiskLevel,
  type AutomationGovernanceStatus,
  RISK_LEVEL_COLORS,
  GOVERNANCE_STATUS_COLORS,
  EXCEPTION_STATUS_COLORS,
  EXCEPTION_TYPE_COLORS,
  EXCEPTION_SEVERITY_COLORS,
  computeGovernanceSummary,
  getAllGovernanceRecords,
  filterGovernanceByStatus,
  filterGovernanceByRisk,
  filterGovernanceByCategory,
  searchGovernanceRecords,
  restrictAutomation,
  suspendAutomation,
  restoreAutomation,
  markCompliant,
  getAllExceptions,
  resolveException,
  rejectException,
  escalateException,
  getGovernanceAuditLog,
  searchGovernanceAudit,
  filterAuditByRiskImpact,
} from "@/lib/automationGovernanceEngine";
import { useAuth } from "@/lib/mockData";

// ──────────────────────────────────────────────────────
// FORMATTERS
// ──────────────────────────────────────────────────────

function fmtDateTime(iso: string | null) {
  if (!iso) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
      {new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}

function RiskBadge({ level }: { level: AutomationRiskLevel }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${RISK_LEVEL_COLORS[level]}`}
      data-testid={`gov-risk-${level.toLowerCase()}`}
    >
      {level}
    </Badge>
  );
}

function GovernanceBadge({ status }: { status: AutomationGovernanceStatus }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs ${GOVERNANCE_STATUS_COLORS[status]}`}
      data-testid={`gov-status-${status.toLowerCase().replace(/ /g, "-")}`}
    >
      {status}
    </Badge>
  );
}

// ──────────────────────────────────────────────────────
// KPI STRIP
// ──────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  color = "text-muted-foreground",
  testId,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-md bg-muted`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────
// GOVERNANCE DETAIL PANEL
// ──────────────────────────────────────────────────────

function GovernanceDetailDialog({
  record,
  onClose,
  onAction,
}: {
  record: AutomationGovernanceRecord;
  onClose: () => void;
  onAction: (action: string, ruleId: string) => void;
}) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        data-testid="gov-detail-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            {record.ruleName}
          </DialogTitle>
          <DialogDescription>
            {record.ruleNumber} • Governance Detail
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Automation Details */}
          <div>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Automation Details
            </h4>
            <div className="grid grid-cols-2 gap-2 bg-muted/30 rounded-md p-3">
              <div><span className="text-muted-foreground">Rule Number:</span> <span className="font-mono">{record.ruleNumber}</span></div>
              <div><span className="text-muted-foreground">Category:</span> {record.ruleCategory}</div>
              <div><span className="text-muted-foreground">Governance Status:</span> <GovernanceBadge status={record.governanceStatus} /></div>
              <div><span className="text-muted-foreground">Risk Level:</span> <RiskBadge level={record.riskLevel} /></div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Risk Assessment
            </h4>
            <p className="text-sm bg-orange-50 border border-orange-200 rounded-md p-3 text-orange-800">
              {record.riskRationale}
            </p>
          </div>

          {/* Safeguard Evaluation */}
          <div>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Safeguard Evaluation
            </h4>
            <div className="space-y-2">
              {record.isFinanciallySensitive && (
                <div className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 rounded-md p-2 text-red-700" data-testid="gov-governed-badge">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-semibold">Governed</span> — Financially Sensitive Automation
                </div>
              )}
              {record.isApprovalProtected && (
                <div className="flex items-center gap-2 text-xs bg-violet-50 border border-violet-200 rounded-md p-2 text-violet-700" data-testid="gov-approval-protected">
                  <Lock className="h-4 w-4" />
                  <span className="font-semibold">Approval Protected</span>
                </div>
              )}
              {record.hasFinancialSafeguard && (
                <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-md p-2 text-blue-700" data-testid="gov-financial-safeguard">
                  <BadgeCheck className="h-4 w-4" />
                  <span className="font-semibold">Financial Safeguard Active</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{record.safeguardNotes}</p>
            </div>
          </div>

          {/* Execution Statistics */}
          <div>
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Execution Statistics
            </h4>
            <div className="grid grid-cols-2 gap-2 bg-muted/30 rounded-md p-3 text-xs">
              <div>Total: <span className="font-semibold">{record.totalExecutions}</span></div>
              <div>Successful: <span className="font-semibold text-emerald-600">{record.successfulExecutions}</span></div>
              <div>Blocked: <span className="font-semibold text-amber-600">{record.blockedExecutions}</span></div>
              <div>Failed: <span className="font-semibold text-red-600">{record.failedExecutions}</span></div>
              <div className="col-span-2">Last Executed: {fmtDateTime(record.lastExecutedAt)}</div>
            </div>
          </div>

          {/* Audit References */}
          {record.governanceAuditIds.length > 0 && (
            <div>
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-2">
                Audit References
              </h4>
              <div className="flex flex-wrap gap-1">
                {record.governanceAuditIds.map((id) => (
                  <span key={id} className="font-mono text-xs bg-muted rounded px-2 py-0.5">{id}</span>
                ))}
              </div>
            </div>
          )}

          {record.notes && (
            <div className="text-xs bg-muted/30 rounded-md p-3 text-muted-foreground">
              <span className="font-semibold text-foreground">Notes: </span>{record.notes}
            </div>
          )}

          {/* CEO Actions */}
          <div className="border-t pt-4">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3">
              CEO Governance Actions
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-orange-600 border-orange-300"
                onClick={() => onAction("restrict", record.ruleId)}
                data-testid="gov-btn-restrict"
                disabled={record.governanceStatus === "Restricted" || record.governanceStatus === "Suspended"}
              >
                <Lock className="h-3 w-3 mr-1" /> Restrict
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300"
                onClick={() => onAction("suspend", record.ruleId)}
                data-testid="gov-btn-suspend"
                disabled={record.governanceStatus === "Suspended"}
              >
                <ShieldX className="h-3 w-3 mr-1" /> Suspend
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-600 border-emerald-300"
                onClick={() => onAction("restore", record.ruleId)}
                data-testid="gov-btn-restore"
                disabled={record.governanceStatus === "Compliant"}
              >
                <Unlock className="h-3 w-3 mr-1" /> Restore
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600 border-blue-300"
                onClick={() => onAction("compliant", record.ruleId)}
                data-testid="gov-btn-mark-compliant"
                disabled={record.governanceStatus === "Compliant"}
              >
                <BadgeCheck className="h-3 w-3 mr-1" /> Mark Compliant
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────
// EXCEPTION DETAIL DIALOG
// ──────────────────────────────────────────────────────

function ExceptionDetailDialog({
  exception: ex,
  onClose,
  onResolve,
  onReject,
  onEscalate,
}: {
  exception: AutomationExceptionRecord;
  onClose: () => void;
  onResolve: (id: string) => void;
  onReject: (id: string) => void;
  onEscalate: (id: string) => void;
}) {
  const isTerminal = ex.status === "Resolved" || ex.status === "Rejected";
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="max-w-xl max-h-[80vh] overflow-y-auto"
        data-testid="gov-exception-detail-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-amber-500" />
            Exception: {ex.exceptionType}
          </DialogTitle>
          <DialogDescription>{ex.id} • {ex.ruleNumber} — {ex.ruleName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2 bg-muted/30 rounded-md p-3 text-xs">
            <div>
              <span className="text-muted-foreground">Type: </span>
              <Badge variant="outline" className={`text-xs ${EXCEPTION_TYPE_COLORS[ex.exceptionType]}`}>{ex.exceptionType}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Severity: </span>
              <Badge variant="outline" className={`text-xs ${EXCEPTION_SEVERITY_COLORS[ex.severity]}`}>{ex.severity}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Status: </span>
              <Badge variant="outline" className={`text-xs ${EXCEPTION_STATUS_COLORS[ex.status]}`}>{ex.status}</Badge>
            </div>
            <div><span className="text-muted-foreground">Created: </span>{fmtDateTime(ex.createdAt)}</div>
            {ex.jobName && (
              <div className="col-span-2"><span className="text-muted-foreground">Job: </span>{ex.jobName}</div>
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-1">Description</p>
            <p className="text-sm">{ex.description}</p>
          </div>

          {ex.investigationNotes && (
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-1">Investigation Notes</p>
              <p className="text-sm bg-amber-50 border border-amber-200 rounded-md p-2 text-amber-800">{ex.investigationNotes}</p>
            </div>
          )}

          {ex.resolutionNotes && (
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-1">Resolution Notes</p>
              <p className="text-sm bg-emerald-50 border border-emerald-200 rounded-md p-2 text-emerald-800">{ex.resolutionNotes}</p>
            </div>
          )}

          {!isTerminal && (
            <div className="border-t pt-4 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-emerald-600 border-emerald-300"
                onClick={() => onResolve(ex.id)}
                data-testid="gov-btn-resolve-exception"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-300"
                onClick={() => onReject(ex.id)}
                data-testid="gov-btn-reject-exception"
              >
                <XCircle className="h-3 w-3 mr-1" /> Reject
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-violet-600 border-violet-300"
                onClick={() => onEscalate(ex.id)}
                data-testid="gov-btn-escalate-exception"
                disabled={ex.status === "Awaiting Approval"}
              >
                <AlertTriangle className="h-3 w-3 mr-1" /> Escalate
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────

export default function AutomationGovernanceCentrePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Governance state
  const [govRecords, setGovRecords] = useState<AutomationGovernanceRecord[]>(
    getAllGovernanceRecords
  );
  const [govSearch, setGovSearch] = useState("");
  const [govStatusFilter, setGovStatusFilter] = useState("all");
  const [govRiskFilter, setGovRiskFilter] = useState("all");
  const [govCategoryFilter, setGovCategoryFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] =
    useState<AutomationGovernanceRecord | null>(null);

  // Exception state
  const [exceptions, setExceptions] = useState<AutomationExceptionRecord[]>(
    getAllExceptions
  );
  const [exSearch, setExSearch] = useState("");
  const [selectedEx, setSelectedEx] = useState<AutomationExceptionRecord | null>(null);

  // Audit state
  const [auditEntries, setAuditEntries] = useState<GovernanceAuditEntry[]>(
    getGovernanceAuditLog
  );
  const [auditSearch, setAuditSearch] = useState("");
  const [auditRiskFilter, setAuditRiskFilter] = useState("all");

  // KPIs
  const summary = useMemo(() => computeGovernanceSummary(govRecords), [govRecords]);

  // Filtered governance records
  const filteredRecords = useMemo(() => {
    let r = govRecords;
    r = filterGovernanceByStatus(r, govStatusFilter as any);
    r = filterGovernanceByRisk(r, govRiskFilter as any);
    r = filterGovernanceByCategory(r, govCategoryFilter);
    r = searchGovernanceRecords(r, govSearch);
    return r;
  }, [govRecords, govSearch, govStatusFilter, govRiskFilter, govCategoryFilter]);

  // Filtered exceptions
  const filteredExceptions = useMemo(() => {
    if (!exSearch.trim()) return exceptions;
    const q = exSearch.trim().toLowerCase();
    return exceptions.filter(
      (e) =>
        e.ruleName.toLowerCase().includes(q) ||
        e.exceptionType.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
    );
  }, [exceptions, exSearch]);

  // Filtered audit
  const filteredAudit = useMemo(() => {
    let a = auditEntries;
    a = filterAuditByRiskImpact(a, auditRiskFilter);
    a = searchGovernanceAudit(a, auditSearch);
    return [...a].reverse(); // newest first
  }, [auditEntries, auditSearch, auditRiskFilter]);

  // Governance actions
  const performerName = user?.name ?? "CEO";

  function handleGovernanceAction(action: string, ruleId: string) {
    const defaultNote = `${action} action performed by ${performerName}.`;
    let result: { record: AutomationGovernanceRecord; audit: GovernanceAuditEntry } | null = null;

    if (action === "restrict") result = restrictAutomation(ruleId, performerName, defaultNote);
    else if (action === "suspend") result = suspendAutomation(ruleId, performerName, defaultNote);
    else if (action === "restore") result = restoreAutomation(ruleId, performerName, defaultNote);
    else if (action === "compliant") result = markCompliant(ruleId, performerName, defaultNote);

    if (result) {
      setGovRecords(getAllGovernanceRecords());
      setAuditEntries(getGovernanceAuditLog());
      setSelectedRecord(null);
      toast({
        title: `Governance Action: ${action.charAt(0).toUpperCase() + action.slice(1)}`,
        description: `${result.record.ruleName} — audit record created.`,
      });
    }
  }

  // Exception actions
  function handleResolveException(id: string) {
    resolveException(id, performerName, "Exception resolved by CEO.");
    setExceptions(getAllExceptions());
    setAuditEntries(getGovernanceAuditLog());
    setSelectedEx(null);
    toast({ title: "Exception Resolved", description: "Audit record generated." });
  }

  function handleRejectException(id: string) {
    rejectException(id, performerName, "Exception rejected by CEO.");
    setExceptions(getAllExceptions());
    setAuditEntries(getGovernanceAuditLog());
    setSelectedEx(null);
    toast({ title: "Exception Rejected", description: "Audit record generated." });
  }

  function handleEscalateException(id: string) {
    escalateException(id, performerName, "Escalated for CEO approval.");
    setExceptions(getAllExceptions());
    setAuditEntries(getGovernanceAuditLog());
    setSelectedEx(null);
    toast({ title: "Exception Escalated", description: "Status set to Awaiting Approval." });
  }

  return (
    <Layout>
      <div data-testid="automation-governance-centre-page" className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <PageHeader
              title="Automation Governance Centre"
              icon={ShieldAlert}
              description="Monitor automation risk, compliance and financial safeguards."
            />
          </div>
          <div className="text-xs text-muted-foreground bg-muted/50 border rounded-md px-3 py-2 max-w-sm text-right">
            CEO authority. All governance actions are audited and immutable.
          </div>
        </div>

        {/* KPI Strip */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3"
          data-testid="gov-kpi-strip"
        >
          <KpiCard label="Total Automations" value={summary.totalAutomations} icon={Activity} testId="gov-kpi-total" />
          <KpiCard label="Compliant" value={summary.compliant} icon={CheckCircle2} color="text-emerald-600" testId="gov-kpi-compliant" />
          <KpiCard label="Requires Review" value={summary.requiresReview} icon={Clock} color="text-amber-600" testId="gov-kpi-requires-review" />
          <KpiCard label="Restricted" value={summary.restricted} icon={Lock} color="text-orange-600" testId="gov-kpi-restricted" />
          <KpiCard label="Suspended" value={summary.suspended} icon={ShieldX} color="text-red-600" testId="gov-kpi-suspended" />
          <KpiCard label="High Risk" value={summary.highRisk} icon={AlertTriangle} color="text-orange-600" testId="gov-kpi-high-risk" />
          <KpiCard label="Critical Risk" value={summary.criticalRisk} icon={ShieldAlert} color="text-red-600" testId="gov-kpi-critical-risk" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="dashboard">
          <TabsList data-testid="gov-tabs">
            <TabsTrigger value="dashboard" data-testid="gov-tab-dashboard">
              <Activity className="h-4 w-4 mr-1" /> Governance Dashboard
            </TabsTrigger>
            <TabsTrigger value="exceptions" data-testid="gov-tab-exceptions">
              <TriangleAlert className="h-4 w-4 mr-1" /> Exceptions
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="gov-tab-audit">
              <FileSearch className="h-4 w-4 mr-1" /> Compliance Audit
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GOVERNANCE DASHBOARD */}
          <TabsContent value="dashboard" data-testid="gov-dashboard-tab-content">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> Governance Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4" data-testid="gov-filters">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search automations..."
                      className="pl-8"
                      value={govSearch}
                      onChange={(e) => setGovSearch(e.target.value)}
                      data-testid="gov-search"
                    />
                  </div>
                  <select
                    className="border rounded-md px-3 py-2 text-sm bg-background"
                    value={govRiskFilter}
                    onChange={(e) => setGovRiskFilter(e.target.value)}
                    data-testid="gov-filter-risk"
                  >
                    <option value="all">All Risk Levels</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                  <select
                    className="border rounded-md px-3 py-2 text-sm bg-background"
                    value={govStatusFilter}
                    onChange={(e) => setGovStatusFilter(e.target.value)}
                    data-testid="gov-filter-status"
                  >
                    <option value="all">All Statuses</option>
                    <option value="Compliant">Compliant</option>
                    <option value="Requires Review">Requires Review</option>
                    <option value="Restricted">Restricted</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                  <select
                    className="border rounded-md px-3 py-2 text-sm bg-background"
                    value={govCategoryFilter}
                    onChange={(e) => setGovCategoryFilter(e.target.value)}
                    data-testid="gov-filter-category"
                  >
                    <option value="all">All Categories</option>
                    <option value="Operational">Operational</option>
                    <option value="Workflow">Workflow</option>
                    <option value="FinanciallySensitive">Financially Sensitive</option>
                  </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto" data-testid="gov-dashboard-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Automation</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Governance Status</TableHead>
                        <TableHead>Last Executed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                            No governance records found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords.map((rec) => (
                          <TableRow key={rec.ruleId} data-testid={`gov-row-${rec.ruleId}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{rec.ruleName}</p>
                                <p className="text-xs font-mono text-muted-foreground">{rec.ruleNumber}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="text-xs">{rec.ruleCategory}</span>
                                {rec.isFinanciallySensitive && (
                                  <Badge variant="outline" className="text-xs text-violet-600 border-violet-200 bg-violet-50 w-fit" data-testid={`gov-governed-badge-${rec.ruleId}`}>
                                    Governed
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell><RiskBadge level={rec.riskLevel} /></TableCell>
                            <TableCell><GovernanceBadge status={rec.governanceStatus} /></TableCell>
                            <TableCell>{fmtDateTime(rec.lastExecutedAt)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedRecord(rec)}
                                data-testid={`gov-btn-view-${rec.ruleId}`}
                              >
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: EXCEPTIONS */}
          <TabsContent value="exceptions" data-testid="gov-exceptions-tab-content">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TriangleAlert className="h-4 w-4" /> Automation Exceptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search exceptions..."
                      className="pl-8"
                      value={exSearch}
                      onChange={(e) => setExSearch(e.target.value)}
                      data-testid="gov-ex-search"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto" data-testid="gov-exceptions-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exception ID</TableHead>
                        <TableHead>Automation</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExceptions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-8">
                            No exceptions found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredExceptions.map((ex) => (
                          <TableRow key={ex.id} data-testid={`gov-ex-row-${ex.id}`}>
                            <TableCell className="font-mono text-xs">{ex.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{ex.ruleName}</p>
                                <p className="text-xs font-mono text-muted-foreground">{ex.ruleNumber}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${EXCEPTION_TYPE_COLORS[ex.exceptionType]}`}>
                                {ex.exceptionType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${EXCEPTION_SEVERITY_COLORS[ex.severity]}`}>
                                {ex.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs ${EXCEPTION_STATUS_COLORS[ex.status]}`}>
                                {ex.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{fmtDateTime(ex.createdAt)}</TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedEx(ex)}
                                data-testid={`gov-ex-btn-view-${ex.id}`}
                              >
                                <Eye className="h-3 w-3 mr-1" /> View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: COMPLIANCE AUDIT */}
          <TabsContent value="audit" data-testid="gov-audit-tab-content">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSearch className="h-4 w-4" /> Compliance Audit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2 mb-4" data-testid="gov-audit-doctrine-notice">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  Immutable read-only governance audit trail. No edit or delete operations are permitted.
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search audit log..."
                      className="pl-8"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      data-testid="gov-audit-search"
                    />
                  </div>
                  <select
                    className="border rounded-md px-3 py-2 text-sm bg-background"
                    value={auditRiskFilter}
                    onChange={(e) => setAuditRiskFilter(e.target.value)}
                    data-testid="gov-audit-filter-risk"
                  >
                    <option value="all">All Risk Impacts</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div className="overflow-x-auto" data-testid="gov-audit-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Audit ID</TableHead>
                        <TableHead>Automation</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Risk Impact</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAudit.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">
                            No audit entries found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAudit.map((entry) => (
                          <TableRow key={entry.id} data-testid={`gov-audit-row-${entry.id}`}>
                            <TableCell className="font-mono text-xs">{entry.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{entry.ruleName}</p>
                                <p className="text-xs font-mono text-muted-foreground">{entry.ruleNumber}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{entry.action}</TableCell>
                            <TableCell className="text-sm">{entry.performedBy}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  entry.riskImpact === "None"
                                    ? "text-muted-foreground border-border bg-muted"
                                    : RISK_LEVEL_COLORS[entry.riskImpact as AutomationRiskLevel] ?? ""
                                }`}
                              >
                                {entry.riskImpact}
                              </Badge>
                            </TableCell>
                            <TableCell>{fmtDateTime(entry.timestamp)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Governance Detail Dialog */}
      {selectedRecord && (
        <GovernanceDetailDialog
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onAction={handleGovernanceAction}
        />
      )}

      {/* Exception Detail Dialog */}
      {selectedEx && (
        <ExceptionDetailDialog
          exception={selectedEx}
          onClose={() => setSelectedEx(null)}
          onResolve={handleResolveException}
          onReject={handleRejectException}
          onEscalate={handleEscalateException}
        />
      )}
    </Layout>
  );
}
