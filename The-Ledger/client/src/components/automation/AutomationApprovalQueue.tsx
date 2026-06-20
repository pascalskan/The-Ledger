/**
 * UX-6.4 — AUTOMATION APPROVAL QUEUE
 *
 * An executive "operations inbox" of automation executions that have
 * intentionally STOPPED at a human approval boundary. Answers:
 *   "Which automated processes are waiting for human approval to continue?"
 *
 * INFORMATIONAL ONLY. This surfaces blocked work and the relationships back to
 * the Review Centre / jobs / governance — it never approves anything, never
 * creates approved financial records, and never bypasses the Review Centre.
 * Human approval remains mandatory; this view does not action it.
 */

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Inbox,
  Search,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Hourglass,
  ExternalLink,
  Gavel,
  Lightbulb,
  Ban,
} from "lucide-react";
import {
  type ApprovalQueueEntry,
  type ApprovalType,
  type ApproverRole,
  APPROVAL_TYPE_COLORS,
  APPROVER_COLORS,
  PRIORITY_COLORS,
  getApprovalQueue,
  computeApprovalQueueSummary,
  computeWaitingHours,
  formatWaiting,
  sortQueueForInbox,
  generateApprovalAttention,
} from "@/lib/automationApprovalQueueEngine";
import {
  GOVERNANCE_STATUS_LABELS,
  GOVERNANCE_STATUS_COLORS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
} from "@/lib/automationGovernanceEngine";

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Detail dialog ───────────────────────────────────────────────────────

function ApprovalDetailDialog({ entry, onClose }: { entry: ApprovalQueueEntry; onClose: () => void }) {
  const waiting = computeWaitingHours(entry);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto" data-testid="aut-aq-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Inbox className="h-4 w-4" />{entry.id}</DialogTitle>
          <DialogDescription>{entry.ruleName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Doctrine banner */}
          <div className="flex items-start gap-2 rounded-md bg-violet-50 border border-violet-200 px-3 py-2.5 text-xs text-violet-700" data-testid="aut-aq-detail-doctrine">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <p>This is an informational record. The automation has stopped at an approval boundary and cannot proceed until a human approves it. Nothing here approves or executes anything.</p>
          </div>

          {/* Automation summary */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Automation Summary</h4>
            <div className="rounded-md bg-muted/30 p-3 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-xs text-muted-foreground">Rule</span><div className="mt-1 font-mono text-xs">{entry.ruleNumber}</div><div className="font-medium">{entry.ruleName}</div></div>
              <div><span className="text-xs text-muted-foreground">Queued Action</span><div className="mt-1 font-medium">{entry.category}</div></div>
              <div><span className="text-xs text-muted-foreground">Approval Type</span><div className="mt-1"><Badge variant="outline" className={`text-xs ${APPROVAL_TYPE_COLORS[entry.approvalType]}`}>{entry.approvalType}</Badge></div></div>
              <div><span className="text-xs text-muted-foreground">Required Approver</span><div className="mt-1"><Badge variant="outline" className={`text-xs ${APPROVER_COLORS[entry.approverRole]}`}>{entry.approverRole}</Badge></div></div>
            </div>
          </section>

          {/* Trigger + why stopped */}
          <section data-testid="aut-aq-detail-trigger">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Trigger & Reason</h4>
            <div className="rounded-md border p-3 text-sm space-y-2">
              <div><span className="text-xs text-muted-foreground">Trigger</span><div className="font-medium">{entry.triggerLabel} <span className="font-mono text-xs text-muted-foreground">({entry.triggerType})</span></div></div>
              <div><span className="text-xs text-muted-foreground">Why execution stopped</span><p className="mt-0.5">{entry.blockReason}</p></div>
              <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <Gavel className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span><span className="font-semibold">Approval boundary: </span>{entry.approvalBoundary}</span>
              </div>
            </div>
          </section>

          {/* Related job / client */}
          {(entry.jobName || entry.clientName) && (
            <section data-testid="aut-aq-detail-job">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Related Job</h4>
              <div className="rounded-md border p-3 text-sm grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground">Job</span><div className="mt-1 font-medium">{entry.jobName ?? "—"}</div></div>
                <div><span className="text-xs text-muted-foreground">Client</span><div className="mt-1 font-medium">{entry.clientName ?? "—"}</div></div>
              </div>
            </section>
          )}

          {/* Governance + financial safeguards */}
          <section data-testid="aut-aq-detail-governance">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Governance & Safeguards</h4>
            <div className="flex flex-wrap items-center gap-2">
              {entry.governanceStatus && (<Badge variant="outline" className={`text-xs ${GOVERNANCE_STATUS_COLORS[entry.governanceStatus]}`}>{GOVERNANCE_STATUS_LABELS[entry.governanceStatus]}</Badge>)}
              {entry.riskLevel && (<Badge variant="outline" className={`text-xs ${RISK_LEVEL_COLORS[entry.riskLevel]}`}>{RISK_LEVEL_LABELS[entry.riskLevel]} Risk</Badge>)}
              {entry.isFinanciallySensitive && (<Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50" data-testid="aut-aq-detail-sensitive"><ShieldAlert className="h-3 w-3 mr-1" />Financially Sensitive</Badge>)}
              {entry.isGovernanceRestricted && (<Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50"><Ban className="h-3 w-3 mr-1" />Governance Restricted</Badge>)}
            </div>
          </section>

          {/* Review Centre / source references (surface only) */}
          <section data-testid="aut-aq-detail-references">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Related Records</h4>
            <div className="space-y-1.5 text-sm">
              {entry.reviewItemRef && (
                <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <span><span className="text-xs text-muted-foreground">Review Item </span><span className="font-mono text-xs">{entry.reviewItemRef}</span></span>
                  {entry.reviewRoute && (
                    <Link href={entry.reviewRoute} data-testid="aut-aq-detail-review-link" className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline" onClick={onClose}>
                      Open Review Centre <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}
              {entry.reviewRoute && !entry.reviewItemRef && (
                <Link href={entry.reviewRoute} data-testid="aut-aq-detail-review-link" className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline" onClick={onClose}>
                  Open related record <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {entry.jobId && (
                <Link href="/jobs" className="inline-flex items-center gap-1 text-xs text-violet-600 hover:underline" onClick={onClose}>
                  View job record <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </section>

          {/* Audit references */}
          <section data-testid="aut-aq-detail-audit">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Audit References</h4>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Queue ID</span><span className="font-mono bg-muted px-2 py-0.5 rounded">{entry.id}</span></div>
              {entry.auditRef && (<div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Audit Ref</span><span className="font-mono bg-muted px-2 py-0.5 rounded">{entry.auditRef}</span></div>)}
              {entry.executionId && (<div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">Execution ID</span><span className="font-mono bg-muted px-2 py-0.5 rounded">{entry.executionId}</span></div>)}
            </div>
          </section>

          {/* Timestamp history */}
          <section data-testid="aut-aq-detail-timeline">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Timestamp History</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2"><Clock className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Blocked since</span><span className="font-mono">{fmtDateTime(entry.blockedSince)}</span></div>
              <div className="flex items-center gap-2"><Hourglass className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Waiting</span><span className="font-medium">{formatWaiting(waiting)}</span></div>
              <div className="flex items-center gap-2"><AlertTriangle className="h-3 w-3 text-muted-foreground" /><span className="text-muted-foreground">Status</span><span className="font-medium">{entry.status}</span></div>
            </div>
          </section>

          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export function AutomationApprovalQueue() {
  const allEntries = useMemo(() => getApprovalQueue(), []);
  const summary = useMemo(() => computeApprovalQueueSummary(allEntries), [allEntries]);
  const attention = useMemo(() => generateApprovalAttention(allEntries), [allEntries]);

  const [search, setSearch] = useState("");
  const [approverFilter, setApproverFilter] = useState<ApproverRole | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ApprovalType | "all">("all");
  const [onlyHigh, setOnlyHigh] = useState(false);
  const [onlySensitive, setOnlySensitive] = useState(false);
  const [onlyRestricted, setOnlyRestricted] = useState(false);
  const [selected, setSelected] = useState<ApprovalQueueEntry | null>(null);

  const filtered = useMemo(() => {
    let r = allEntries;
    if (approverFilter !== "all") r = r.filter((e) => e.approverRole === approverFilter);
    if (typeFilter !== "all") r = r.filter((e) => e.approvalType === typeFilter);
    if (onlyHigh) r = r.filter((e) => e.priority === "High" || e.priority === "Critical");
    if (onlySensitive) r = r.filter((e) => e.isFinanciallySensitive);
    if (onlyRestricted) r = r.filter((e) => e.isGovernanceRestricted);
    const q = search.trim().toLowerCase();
    if (q) {
      r = r.filter((e) =>
        e.ruleName.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.jobName?.toLowerCase().includes(q) ?? false) ||
        (e.clientName?.toLowerCase().includes(q) ?? false) ||
        e.triggerLabel.toLowerCase().includes(q) ||
        e.triggerType.toLowerCase().includes(q) ||
        e.approverRole.toLowerCase().includes(q)
      );
    }
    return sortQueueForInbox(r);
  }, [allEntries, approverFilter, typeFilter, onlyHigh, onlySensitive, onlyRestricted, search]);

  const kpis = [
    { label: "In Queue", value: summary.total, icon: Inbox, color: "text-slate-600", testId: "aut-aq-kpi-total" },
    { label: "CEO Approvals", value: summary.ceoApprovals, icon: ShieldCheck, color: "text-violet-600", testId: "aut-aq-kpi-ceo" },
    { label: "PM Approvals", value: summary.pmApprovals, icon: ShieldCheck, color: "text-blue-600", testId: "aut-aq-kpi-pm" },
    { label: "Financial Pending", value: summary.financialPending, icon: ShieldAlert, color: "text-red-600", testId: "aut-aq-kpi-financial" },
    { label: "Operational Pending", value: summary.operationalPending, icon: Inbox, color: "text-blue-600", testId: "aut-aq-kpi-operational" },
    { label: "Avg Waiting", value: formatWaiting(summary.avgWaitHours), icon: Hourglass, color: "text-amber-600", testId: "aut-aq-kpi-avg-wait" },
    { label: "Oldest Outstanding", value: formatWaiting(summary.oldestWaitHours), icon: Clock, color: "text-red-600", testId: "aut-aq-kpi-oldest", sub: summary.oldest?.id },
  ];

  const ToggleChip = ({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: React.ReactNode; testId: string }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-testid={testId}
      className={`text-xs rounded-full border px-3 py-1 transition-colors ${active ? "bg-violet-600 text-white border-violet-600" : "bg-background hover:bg-muted/50"}`}
    >
      {children}
    </button>
  );

  const selectClass = "h-9 rounded-md border bg-background px-3 text-sm";

  return (
    <div className="space-y-4" data-testid="aut-approval-queue">
      {/* Doctrine notice */}
      <div className="rounded-md bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700">
        <span className="font-semibold">Approval Doctrine: </span>
        Automation may queue work but never approves expenses, reports, payroll, or invoices, and never bypasses the Review Centre. These items are waiting for a human decision — surfaced here, never actioned automatically.
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3" data-testid="aut-aq-kpi-strip">
        {kpis.map(({ label, value, icon: Icon, color, testId, sub }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                <span className="text-xl font-bold" data-testid={testId}>{value}</span>
              </div>
              {sub && <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{sub}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Executive attention */}
      {attention.length > 0 && (
        <Card data-testid="aut-aq-attention">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Executive Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {attention.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" data-testid={`aut-aq-attention-${i}`}>
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search rule, queue ID, job, client, trigger, approver…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="aut-aq-search" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className={selectClass} value={approverFilter} onChange={(e) => setApproverFilter(e.target.value as ApproverRole | "all")} data-testid="aut-aq-filter-approver">
              <option value="all">All Approvers</option>
              <option value="CEO">CEO Approval</option>
              <option value="PM">PM Approval</option>
            </select>
            <select className={selectClass} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ApprovalType | "all")} data-testid="aut-aq-filter-type">
              <option value="all">All Types</option>
              <option value="Financial">Financial Approval</option>
              <option value="Operational">Operational Approval</option>
              <option value="Governance">Governance</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleChip active={onlyHigh} onClick={() => setOnlyHigh((v) => !v)} testId="aut-aq-toggle-high">High Priority</ToggleChip>
          <ToggleChip active={onlySensitive} onClick={() => setOnlySensitive((v) => !v)} testId="aut-aq-toggle-sensitive">Financially Sensitive</ToggleChip>
          <ToggleChip active={onlyRestricted} onClick={() => setOnlyRestricted((v) => !v)} testId="aut-aq-toggle-restricted">Governance Restricted</ToggleChip>
          <span className="text-xs text-muted-foreground ml-auto" data-testid="aut-aq-count">{filtered.length} of {allEntries.length}</span>
        </div>
      </div>

      {/* Queue table */}
      <div className="border rounded-md overflow-x-auto" data-testid="aut-aq-table">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground" data-testid="aut-aq-empty">
            <Inbox className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No queued approvals match the current search and filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue / Rule</TableHead>
                <TableHead className="hidden xl:table-cell">Trigger</TableHead>
                <TableHead className="hidden lg:table-cell">Job / Client</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead className="hidden md:table-cell">Approver</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
                <TableHead>Waiting</TableHead>
                <TableHead className="hidden xl:table-cell">Blocked Since</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="text-right">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id} data-testid={`aut-aq-row-${e.id}`}>
                  <TableCell>
                    <div className="font-mono text-[11px] font-semibold text-muted-foreground">{e.id}</div>
                    <div className="font-medium text-sm max-w-[200px] truncate">{e.ruleName}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {e.isFinanciallySensitive && (<Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50"><ShieldAlert className="h-2.5 w-2.5 mr-0.5" />Sensitive</Badge>)}
                      {e.isGovernanceRestricted && (<Badge variant="outline" className="text-[10px] text-amber-700 border-amber-200 bg-amber-50"><Ban className="h-2.5 w-2.5 mr-0.5" />Restricted</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-sm text-muted-foreground max-w-[140px] truncate">{e.triggerLabel}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-sm max-w-[160px] truncate">{e.jobName ?? <span className="text-muted-foreground text-xs">—</span>}</div>
                    {e.clientName && <div className="text-[11px] text-muted-foreground truncate">{e.clientName}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${APPROVAL_TYPE_COLORS[e.approvalType]}`}>{e.approvalType}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className={`text-xs ${APPROVER_COLORS[e.approverRole]}`}>{e.approverRole}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{e.status}</TableCell>
                  <TableCell className="text-sm font-medium whitespace-nowrap">{formatWaiting(computeWaitingHours(e))}</TableCell>
                  <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(e.blockedSince)}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[e.priority]}`} data-testid={`aut-aq-priority-${e.id}`}>{e.priority}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setSelected(e)} data-testid={`aut-aq-btn-view-${e.id}`}>
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {selected && <ApprovalDetailDialog entry={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
