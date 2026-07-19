import { useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-shell";
import { useStore, useAuth } from "@/lib/mockData";
import { isCEO, isProjectManager } from "@/lib/roleHelpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, TriangleAlert, ShieldCheck, Search, Building2, Briefcase } from "lucide-react";
import {
  getAllRequests,
  getRequestsForProjects,
  computeEscalation,
  acknowledgeRequest,
  startRequestProgress,
  resolveRequest,
  declineRequest,
  getRequestTypeMeta,
  REQUEST_STATUS_LABELS,
  type ClientRequest,
  type ClientRequestStatus,
} from "@/lib/portalRequests";

const STATUS_CLS: Record<ClientRequestStatus, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  acknowledged: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
  declined: "bg-red-50 text-red-700 border-red-200",
};

type StatusFilter = "all" | "outstanding" | ClientRequestStatus;

export default function ClientRequestsPage() {
  const { clients, jobs, roles } = useStore();
  const { user } = useAuth();
  const { toast } = useToast();

  const userIsCEO = isCEO(user, roles);
  const userIsPM = isProjectManager(user, roles);

  const [version, setVersion] = useState(0);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("outstanding");
  const [active, setActive] = useState<ClientRequest | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [mode, setMode] = useState<"resolve" | "decline" | null>(null);

  // RBAC — CLIENT_REQUEST_DOMAIN.md § Platform Side Visibility:
  //   CEO: all client requests across all jobs
  //   PM:  client requests for jobs they are assigned to
  //   Worker: no visibility (route is CEO/PM only)
  const visible = useMemo(() => {
    void version;
    if (userIsCEO) return getAllRequests();
    if (userIsPM) {
      const myJobIds = jobs.filter((j) => j.managerId === user?.id).map((j) => j.id);
      return getRequestsForProjects(myJobIds);
    }
    return [];
  }, [userIsCEO, userIsPM, jobs, user?.id, version]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return visible
      .filter((r) => {
        if (filter === "all") return true;
        if (filter === "outstanding") return !["resolved", "closed", "declined"].includes(r.status);
        return r.status === filter;
      })
      .filter((r) =>
        term
          ? r.subject.toLowerCase().includes(term) ||
            r.requestNumber.toLowerCase().includes(term) ||
            (clients.find((c) => c.id === r.clientId)?.name ?? "").toLowerCase().includes(term)
          : true
      );
  }, [visible, filter, search, clients]);

  const escalatedCount = visible.filter((r) => computeEscalation(r).escalated).length;

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "Unknown client";
  const jobTitle = (id?: string) => (id ? jobs.find((j) => j.id === id)?.title : undefined);

  const refresh = () => setVersion((v) => v + 1);
  const actor = user?.name || "Unknown";

  const closeDialog = () => {
    setActive(null);
    setMode(null);
    setNote("");
    setNoteError(null);
  };

  const runAction = (fn: () => { ok: boolean; reason?: string }) => {
    const result = fn();
    if (!result.ok) {
      toast({ title: "Action not permitted", description: result.reason, variant: "destructive" });
      return false;
    }
    refresh();
    return true;
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="client-requests-page">
        <PageHeader
          title="Client Requests"
          description="Requests submitted by clients through the portal."
          actions={
            escalatedCount > 0 ? (
              <Badge variant="destructive" className="self-start" data-testid="client-requests-escalated-badge">
                <TriangleAlert className="h-3.5 w-3.5 mr-1.5" />
                {escalatedCount} escalated
              </Badge>
            ) : null
          }
        />

        {/* Doctrine notice */}
        <div
          className="rounded-lg border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground flex items-start gap-2"
          data-testid="client-requests-doctrine-notice"
        >
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Client requests are management communications and do <strong>not</strong> enter the Review Centre.
            No request creates a financial record. Accepting a scope change or scheduling change is a
            deliberate decision recorded here; any resulting job or invoice is created through the standard
            workflow. Resolutions and decline reasons are shared with the client.
          </span>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <label htmlFor="client-requests-search" className="sr-only">Search requests</label>
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="client-requests-search"
              type="search"
              placeholder="Search subject, number or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="client-requests-search"
            />
          </div>
          <div>
            <label htmlFor="client-requests-filter" className="sr-only">Filter by status</label>
            <select
              id="client-requests-filter"
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as StatusFilter)}
              data-testid="client-requests-filter"
            >
              <option value="outstanding">Outstanding</option>
              <option value="all">All</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>

        {/* Queue */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50" data-testid="client-requests-empty">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">No requests</h3>
            <p className="text-muted-foreground text-sm mt-1">Nothing matches the current filter.</p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="client-requests-list">
            {filtered.map((r) => {
              const esc = computeEscalation(r);
              const meta = getRequestTypeMeta(r.type);
              return (
                <Card key={r.id} data-testid={`client-request-${r.id}`}>
                  <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{r.requestNumber}</span>
                        <Badge variant="outline" className={STATUS_CLS[r.status]} data-testid={`client-request-status-${r.id}`}>
                          {REQUEST_STATUS_LABELS[r.status]}
                        </Badge>
                        {meta.decisionRequired && (
                          <Badge variant="outline" className="text-[10px]" data-testid={`client-request-decision-${r.id}`}>
                            Decision required
                          </Badge>
                        )}
                        {esc.escalated && (
                          <Badge variant="destructive" className="text-[10px]" data-testid={`client-request-escalated-${r.id}`}>
                            <TriangleAlert className="h-3 w-3 mr-1" />
                            Escalated · {esc.waitingHours}h unacknowledged
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 font-medium truncate">{r.subject}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" /> {clientName(r.clientId)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {jobTitle(r.projectId) ?? "No linked project"}
                        </span>
                        <span>{meta.label}</span>
                        <span>Submitted {new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {r.status === "open" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runAction(() => acknowledgeRequest(r.id, actor))}
                          data-testid={`client-request-acknowledge-${r.id}`}
                        >
                          Acknowledge
                        </Button>
                      )}
                      {r.status === "acknowledged" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runAction(() => startRequestProgress(r.id, actor))}
                          data-testid={`client-request-start-${r.id}`}
                        >
                          Start work
                        </Button>
                      )}
                      {["acknowledged", "in_progress"].includes(r.status) && (
                        <Button
                          size="sm"
                          onClick={() => { setActive(r); setMode("resolve"); }}
                          data-testid={`client-request-resolve-${r.id}`}
                        >
                          Resolve
                        </Button>
                      )}
                      {["open", "acknowledged", "in_progress"].includes(r.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => { setActive(r); setMode("decline"); }}
                          data-testid={`client-request-decline-${r.id}`}
                        >
                          Decline
                        </Button>
                      )}
                    </div>
                  </CardContent>

                  {(r.resolutionNote || r.declineReason) && (
                    <CardContent className="px-4 pb-4 pt-0">
                      <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs" data-testid={`client-request-outcome-${r.id}`}>
                        <span className="font-semibold">
                          {r.resolutionNote ? "Resolution shared with client: " : "Decline reason shared with client: "}
                        </span>
                        {r.resolutionNote ?? r.declineReason}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolve / decline dialog — note is mandatory and shared with the client */}
      <Dialog open={!!active && !!mode} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent data-testid="client-request-dialog">
          <DialogHeader>
            <DialogTitle>{mode === "resolve" ? "Resolve request" : "Decline request"}</DialogTitle>
            <DialogDescription>
              {mode === "resolve"
                ? "A resolution note is required and will be shared with the client."
                : "A decline reason is required and will be shared with the client. There is no silent decline."}
            </DialogDescription>
          </DialogHeader>

          {active && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-mono text-xs text-muted-foreground">{active.requestNumber}</span>
                <div className="font-medium">{active.subject}</div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client-request-note" className="text-xs">
                  {mode === "resolve" ? "Resolution note" : "Decline reason"}
                </Label>
                <textarea
                  id="client-request-note"
                  className="min-h-[100px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={mode === "resolve" ? "Explain how this was resolved..." : "Explain why this is being declined..."}
                  data-testid="client-request-note"
                />
                {noteError && (
                  <p className="text-xs text-destructive" data-testid="client-request-note-error" role="alert">
                    {noteError}
                  </p>
                )}
              </div>
              {mode === "decline" && (
                <p className="text-[11px] text-muted-foreground">
                  A declined request cannot be reopened. The client must raise a new request.
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button
              variant={mode === "decline" ? "destructive" : "default"}
              onClick={() => {
                if (!active || !mode) return;
                const fn = mode === "resolve"
                  ? () => resolveRequest(active.id, actor, note)
                  : () => declineRequest(active.id, actor, note);
                const result = fn();
                if (!result.ok) {
                  setNoteError(result.reason);
                  return;
                }
                refresh();
                toast({
                  title: mode === "resolve" ? "Request resolved" : "Request declined",
                  description: "The client can now see your response in their portal.",
                });
                closeDialog();
              }}
              data-testid="client-request-dialog-confirm"
            >
              {mode === "resolve" ? "Resolve" : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
