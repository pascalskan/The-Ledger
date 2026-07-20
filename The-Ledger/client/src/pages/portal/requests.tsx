import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Plus, ArrowLeft, CheckCircle2, XCircle, Clock, Loader2 } from "lucide-react";
import type { PortalRequest, PortalJob } from "@/lib/portalProjections";
import { CLIENT_REQUEST_TYPES, type ClientRequestType, type ClientRequestStatus } from "@/lib/portalRequests";

/**
 * CL-8 — Requests is the single client-communication destination, hosting both
 * formal Client Requests and informal Conversations. This returns the portal to
 * the seven sections defined by CLIENT_PORTAL_DOMAIN.md § Portal Navigation
 * Structure, without discarding the CL-5 communication work.
 *
 * The two remain distinct MODELS — only the navigation is unified. Client
 * Requests carry the frozen lifecycle, routing and escalation; conversations do
 * not and are explicitly not requests.
 */
export function ClientCommsTabs({
  active,
  onSelect,
}: {
  active: "requests" | "conversations";
  onSelect: (tab: "requests" | "conversations") => void;
}) {
  const tabs = [
    { key: "requests" as const, label: "Requests" },
    { key: "conversations" as const, label: "Conversations" },
  ];
  return (
    <div
      className="flex flex-wrap gap-2 border-b border-border pb-px"
      role="tablist"
      aria-label="Client communication sections"
      data-testid="portal-comms-tabs"
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onSelect(t.key)}
          className={`px-3.5 py-2 text-sm font-medium rounded-t-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-1 ${
            active === t.key
              ? "bg-card border border-b-white border-border text-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid={`portal-comms-tab-${t.key}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const STATUS_META: Record<ClientRequestStatus, { cls: string; icon: typeof Clock }> = {
  open: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: Clock },
  acknowledged: { cls: "bg-blue-50 text-blue-700 border-blue-200", icon: CheckCircle2 },
  in_progress: { cls: "bg-amber-50 text-amber-700 border-amber-200", icon: Loader2 },
  resolved: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  closed: { cls: "bg-muted text-muted-foreground border-border", icon: CheckCircle2 },
  declined: { cls: "bg-red-50 text-red-700 border-red-200", icon: XCircle },
};

interface PortalRequestsProps {
  requests: PortalRequest[];
  selectedRequest: PortalRequest | null;
  jobs: PortalJob[];
  onOpenRequest: (r: PortalRequest) => void;
  onBack: () => void;
  onCreateRequest: (input: {
    type: ClientRequestType;
    projectId?: string;
    subject: string;
    description: string;
  }) => void;
}

export function PortalRequests({
  requests,
  selectedRequest,
  jobs,
  onOpenRequest,
  onBack,
  onCreateRequest,
}: PortalRequestsProps) {
  if (selectedRequest) {
    return <RequestDetail request={selectedRequest} onBack={onBack} />;
  }
  return <RequestList requests={requests} jobs={jobs} onOpenRequest={onOpenRequest} onCreateRequest={onCreateRequest} />;
}

function RequestList({
  requests,
  jobs,
  onOpenRequest,
  onCreateRequest,
}: {
  requests: PortalRequest[];
  jobs: PortalJob[];
  onOpenRequest: (r: PortalRequest) => void;
  onCreateRequest: PortalRequestsProps["onCreateRequest"];
}) {
  const [composing, setComposing] = useState(false);
  const [type, setType] = useState<ClientRequestType>("general_enquiry");
  const [projectId, setProjectId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!subject.trim() || !description.trim()) {
      setError("Please complete both the subject and the details.");
      return;
    }
    setError(null);
    onCreateRequest({ type, projectId: projectId || undefined, subject, description });
    setSubject("");
    setDescription("");
    setComposing(false);
  };

  return (
    <div className="space-y-6" data-testid="portal-requests">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Requests</h1>
          <p className="text-muted-foreground mt-1">Raise and track requests with your delivery team.</p>
        </div>
        <Button
          onClick={() => setComposing((c) => !c)}
          className="bg-slate-900 hover:bg-slate-800 text-white"
          data-testid="portal-request-new"
        >
          <Plus className="h-4 w-4 mr-2" /> New request
        </Button>
      </div>

      {composing && (
        <Card className="border-border" data-testid="portal-request-compose">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg">Raise a request</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {error && (
              <div
                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                data-testid="portal-request-error"
                role="alert"
              >
                {error}
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="portal-request-type-select" className="text-xs">Request type</Label>
                <select
                  id="portal-request-type-select"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as ClientRequestType)}
                  data-testid="portal-request-type"
                >
                  {CLIENT_REQUEST_TYPES.map((t) => (
                    <option key={t.code} value={t.code}>{t.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {CLIENT_REQUEST_TYPES.find((t) => t.code === type)?.description}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="portal-request-project-select" className="text-xs">Related project (optional)</Label>
                <select
                  id="portal-request-project-select"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  data-testid="portal-request-project"
                >
                  <option value="">No specific project</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-request-subject-input" className="text-xs">Subject</Label>
              <Input
                id="portal-request-subject-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Move filter replacement to evening slot"
                data-testid="portal-request-subject"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portal-request-description-input" className="text-xs">Details</Label>
              <textarea
                id="portal-request-description-input"
                className="min-h-[96px] w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your request..."
                data-testid="portal-request-description"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Once submitted, a request cannot be edited. If you need to add information, raise a new request.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComposing(false)}>Cancel</Button>
              <Button onClick={submit} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="portal-request-submit">
                Submit request
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-border rounded-lg bg-card" data-testid="portal-requests-empty">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium text-foreground">No requests yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
            Raise a request and your delivery team will respond here.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-lg bg-card divide-y divide-slate-100" data-testid="portal-request-list">
          {requests.map((r) => {
            const meta = STATUS_META[r.status];
            return (
              <button
                key={r.id}
                onClick={() => onOpenRequest(r)}
                className="w-full text-left px-4 py-3.5 hover:bg-muted transition-colors"
                data-testid={`portal-request-${r.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{r.subject}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{r.requestNumber}</span>
                      <span>·</span>
                      <span data-testid={`portal-request-type-${r.id}`}>{r.typeLabel}</span>
                      {r.projectTitle && (<><span>·</span><span>{r.projectTitle}</span></>)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className={meta.cls} data-testid={`portal-request-status-${r.id}`}>
                      {r.statusLabel}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(r.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RequestDetail({ request, onBack }: { request: PortalRequest; onBack: () => void }) {
  const meta = STATUS_META[request.status];
  return (
    <div className="space-y-6" data-testid="portal-request-detail">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 text-muted-foreground hover:text-foreground" data-testid="portal-request-back">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Requests
      </Button>

      <div>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <Badge variant="outline" className={meta.cls} data-testid="portal-request-detail-status">
            {request.statusLabel}
          </Badge>
          <span className="text-sm font-mono text-muted-foreground">{request.requestNumber}</span>
          <span className="text-xs text-muted-foreground">{request.typeLabel}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="portal-request-detail-subject">
          {request.subject}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Submitted {new Date(request.submittedAt).toLocaleString()}
          {request.projectTitle ? ` · ${request.projectTitle}` : ""}
        </p>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg">Your request</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-sm text-foreground leading-relaxed" data-testid="portal-request-detail-description">
            {request.description}
          </p>
        </CardContent>
      </Card>

      {request.resolutionNote && (
        <Card className="border-emerald-200 bg-emerald-50/40" data-testid="portal-request-resolution">
          <CardHeader className="pb-3 border-b border-emerald-100">
            <CardTitle className="text-lg flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="h-5 w-5" /> Resolution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-emerald-900 leading-relaxed">{request.resolutionNote}</p>
          </CardContent>
        </Card>
      )}

      {request.declineReason && (
        <Card className="border-red-200 bg-red-50/40" data-testid="portal-request-decline">
          <CardHeader className="pb-3 border-b border-red-100">
            <CardTitle className="text-lg flex items-center gap-2 text-red-900">
              <XCircle className="h-5 w-5" /> Declined
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-red-900 leading-relaxed">{request.declineReason}</p>
          </CardContent>
        </Card>
      )}

      {(request.status === "declined" || request.status === "closed") && (
        <p className="text-xs text-muted-foreground" data-testid="portal-request-terminal-note">
          This request is closed. If you need anything further, please raise a new request.
        </p>
      )}
    </div>
  );
}
