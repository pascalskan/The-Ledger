import { Layout } from "@/components/layout";
import { useStore, useAuth } from "@/lib/mockData";
import { isCEO, isProjectManager } from "@/lib/roleHelpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoute, useLocation } from "wouter";
import { Calendar, MapPin, Users, Truck, ReceiptText, ArrowLeft, FileText, Eye, Search, FilePlus, ClipboardCheck, TriangleAlert, CheckCircle2, Clock, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { JobIntelligenceSection } from "@/components/JobIntelligenceSection";
import { JobFinancialSummarySection } from "@/components/JobFinancialSummarySection";
import { InvoiceReadinessPanel } from "@/components/finance/InvoiceReadinessPanel";
import { PendingExposurePanel } from "@/components/finance/PendingExposurePanel";
import { JobForecastPanel } from "@/components/finance/JobForecastPanel";
import { JobSyncPanel } from "@/components/finance/JobSyncPanel";
import { JobReconciliationPanel } from "@/components/finance/JobReconciliationPanel";
import { JobExceptionPanel } from "@/components/finance/JobExceptionPanel";
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from "@/lib/invoiceBuilder";

export default function JobDetailPage() {
  const { jobs, clients, workers, equipment, invoices, addInvoice, roles, updateJob, users, invoiceDrafts, reviewItems } = useStore();
  const { user } = useAuth();
  const [match, params] = useRoute("/jobs/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [viewDoc, setViewDoc] = useState<{name: string, url: string} | null>(null);

  const userIsPM = isProjectManager(user, roles);
  const userIsCEO = isCEO(user, roles);

  if (!match || !params?.id) {
    return (
      <Layout>
        <div className="space-y-4" data-testid="status-job-not-found">
          <p className="text-sm text-muted-foreground">Invalid job URL.</p>
          <Button variant="outline" onClick={() => setLocation("/jobs")} data-testid="button-back-jobs-invalid">Back to Jobs</Button>
        </div>
      </Layout>
    );
  }

  const job = jobs.find(j => j.id === params.id);

  if (!job) {
    return (
      <Layout>
        <div className="space-y-4" data-testid="status-job-not-found">
          <h2 className="text-2xl font-semibold">Job not found</h2>
          <p className="text-muted-foreground">This job might have been deleted or does not exist.</p>
          <Button variant="outline" onClick={() => setLocation("/jobs")} data-testid="button-back-jobs-not-found">Back to Jobs</Button>
        </div>
      </Layout>
    );
  }

  // PM access control — PM may only view jobs they manage
  if (userIsPM && job.managerId !== user?.id) {
    return (
      <Layout>
        <div className="space-y-4 max-w-xl mx-auto mt-12 text-center" data-testid="pm-job-access-denied">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <TriangleAlert className="h-6 w-6 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold">Access Restricted</h2>
          <p className="text-muted-foreground text-sm">
            You can only view jobs that are assigned to you. This job is managed by another Project Manager.
          </p>
          <Button variant="outline" onClick={() => setLocation("/jobs")} data-testid="button-pm-access-denied-back">
            Back to My Jobs
          </Button>
        </div>
      </Layout>
    );
  }

  const client = clients.find(c => c.id === job.clientId);
  const existingInvoice = invoices.find(i => i.jobId === job.id);

  const [isEditing, setIsEditing] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");
  const [equipmentSearch, setEquipmentSearch] = useState("");

  const [edit, setEdit] = useState({
    status: job.status,
    priority: job.priority,
    managerId: job.managerId || "",
    assignedWorkerIds: [...job.assignedWorkerIds],
    assignedEquipmentIds: [...job.assignedEquipmentIds],
    equipmentUsage: (job as any).equipmentUsage
      ? ([...(job as any).equipmentUsage] as any[]).map((u) => ({
          equipmentId: u.equipmentId,
          days: typeof u.days === "number" ? u.days : 1,
          dayRateAtTime: typeof u.dayRateAtTime === "number" ? u.dayRateAtTime : 150,
          note: u.note,
        }))
      : job.assignedEquipmentIds.map((eid) => ({
          equipmentId: eid,
          days: 1,
          dayRateAtTime: (equipment.find((e) => e.id === eid) as any)?.dayRate ?? 150,
        })),
  });

  const companyWorkers = useMemo(
    () => workers.filter((w) => w.companyId === job.companyId),
    [workers, job.companyId]
  );
  const companyEquipment = useMemo(
    () => equipment.filter((e) => e.companyId === job.companyId),
    [equipment, job.companyId]
  );

  const toggleWorker = (wid: string) => {
    setEdit((p) => {
      const next = new Set(p.assignedWorkerIds);
      if (next.has(wid)) next.delete(wid);
      else next.add(wid);
      return { ...p, assignedWorkerIds: Array.from(next) };
    });
  };

  const toggleEquipment = (eid: string) => {
    setEdit((p) => {
      const next = new Set(p.assignedEquipmentIds);
      if (next.has(eid)) {
        next.delete(eid);
      } else {
        next.add(eid);
      }

      const nextIds = Array.from(next);
      const usageById = new Map((p as any).equipmentUsage.map((u: any) => [u.equipmentId, u]));
      const nextUsage = nextIds.map((id) => {
        const existing = usageById.get(id);
        const eq = equipment.find((e) => e.id === id) as any;
        return (
          existing || {
            equipmentId: id,
            days: 1,
            dayRateAtTime: eq?.dayRate ?? 150,
          }
        );
      });

      return { ...p, assignedEquipmentIds: nextIds, equipmentUsage: nextUsage } as any;
    });
  };

  const startEdit = () => {
    const baseUsage = (job as any).equipmentUsage
      ? ([...(job as any).equipmentUsage] as any[]).map((u) => ({
          equipmentId: u.equipmentId,
          days: typeof u.days === "number" ? u.days : 1,
          dayRateAtTime: typeof u.dayRateAtTime === "number" ? u.dayRateAtTime : 150,
          note: u.note,
        }))
      : job.assignedEquipmentIds.map((eid) => ({
          equipmentId: eid,
          days: 1,
          dayRateAtTime: (equipment.find((e) => e.id === eid) as any)?.dayRate ?? 150,
        }));

    setEdit({
      status: job.status,
      priority: job.priority,
      managerId: job.managerId || "",
      assignedWorkerIds: [...job.assignedWorkerIds],
      assignedEquipmentIds: [...job.assignedEquipmentIds],
      equipmentUsage: baseUsage,
    } as any);
    setIsEditing(true);
  };

  const saveEdit = () => {
    const usage = (edit as any).equipmentUsage as any[];

    updateJob(job.id, {
      status: edit.status,
      priority: edit.priority,
      managerId: edit.managerId === "none" ? undefined : (edit.managerId || undefined),
      assignedWorkerIds: edit.assignedWorkerIds,
      assignedEquipmentIds: edit.assignedEquipmentIds,
      equipmentUsage: usage
        .filter((u) => edit.assignedEquipmentIds.includes(u.equipmentId))
        .map((u) => ({
          equipmentId: u.equipmentId,
          days: Math.max(0, Number(u.days) || 0),
          dayRateAtTime: Math.max(0, Number(u.dayRateAtTime) || 0),
          note: (u.note || "").trim() || undefined,
        })),
    } as any);

    toast({ title: "Job updated", description: "Assignments and status saved." });
    setIsEditing(false);
  };

  // ── PM WORKSPACE ────────────────────────────────────────────────
  if (userIsPM) {
    const jobReviewItems = reviewItems.filter(r => r.jobId === job.id);
    const pendingReviews = jobReviewItems.filter(r => r.status === 'pending');
    const correctionsNeeded = jobReviewItems.filter(r => r.status === 'needs-correction');
    const escalatedReviews = jobReviewItems.filter(r => r.status === 'escalated');
    const assignedWorkers = workers.filter(w => job.assignedWorkerIds.includes(w.id));
    const assignedEquipment = equipment.filter(e => job.assignedEquipmentIds.includes(e.id));
    const hasAttention = pendingReviews.length > 0 || correctionsNeeded.length > 0;

    return (
      <Layout>
        <div className="space-y-6" data-testid={`pm-job-workspace-${job.id}`}>
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/jobs")}
                data-testid="button-back-jobs"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono" data-testid="badge-job-id">{job.jobId}</Badge>
                  <Badge data-testid="badge-job-status">{job.status}</Badge>
                  {job.priority === 'High' || job.priority === 'Critical' ? (
                    <Badge variant="outline" className="border-amber-300 text-amber-700">{job.priority} Priority</Badge>
                  ) : null}
                </div>
                <h1 className="text-2xl font-bold mt-1" data-testid="text-job-title">{job.title}</h1>
                {client && (
                  <p className="text-sm text-muted-foreground" data-testid="text-job-client">for {client.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* Attention Required Banner */}
          {hasAttention && (
            <div
              className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
              data-testid="pm-workspace-attention-banner"
            >
              <TriangleAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-900">This job requires attention</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {pendingReviews.length > 0 && `${pendingReviews.length} pending review${pendingReviews.length !== 1 ? 's' : ''}`}
                  {pendingReviews.length > 0 && correctionsNeeded.length > 0 && ' · '}
                  {correctionsNeeded.length > 0 && `${correctionsNeeded.length} correction${correctionsNeeded.length !== 1 ? 's' : ''} needed`}
                </p>
              </div>
            </div>
          )}

          {/* Overview */}
          <Card data-testid="pm-workspace-overview">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {job.description && (
                <p className="text-muted-foreground">{job.description}</p>
              )}
              <div className="grid gap-2 sm:grid-cols-2 pt-1">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Starts {new Date(job.startAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Ends {new Date(job.endAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{job.locationAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{assignedWorkers.length} crew member{assignedWorkers.length !== 1 ? 's' : ''} assigned</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Crew */}
          <Card data-testid="pm-workspace-crew">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Crew</CardTitle>
            </CardHeader>
            <CardContent>
              {assignedWorkers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No crew assigned to this job.</p>
              ) : (
                <div className="divide-y text-sm">
                  {assignedWorkers.map(w => (
                    <div key={w.id} className="flex items-center justify-between py-2" data-testid={`pm-crew-row-${w.id}`}>
                      <span className="font-medium">{w.firstName} {w.lastName}</span>
                      <Badge variant="outline" className={`text-xs ${w.status === 'Active' ? 'border-emerald-300 text-emerald-700' : ''}`}>{w.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card data-testid="pm-workspace-reviews">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {jobReviewItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">No submissions for this job yet.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-4 text-sm mb-3">
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{pendingReviews.length}</span> pending
                    </span>
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{correctionsNeeded.length}</span> corrections
                    </span>
                    {escalatedReviews.length > 0 && (
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-purple-700">{escalatedReviews.length}</span> escalated
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{jobReviewItems.filter(r => r.status === 'approved').length}</span> approved
                    </span>
                  </div>
                  <div className="divide-y text-sm">
                    {jobReviewItems.slice(0, 5).map(r => {
                      const submitter = workers.find(w => w.id === r.workerId);
                      return (
                        <div key={r.id} className="flex items-center justify-between py-2" data-testid={`pm-review-row-${r.id}`}>
                          <div>
                            <span className="font-medium capitalize">{r.type}</span>
                            {submitter && <span className="text-xs text-muted-foreground ml-2">by {submitter.firstName} {submitter.lastName}</span>}
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              r.status === 'pending' ? 'border-amber-300 text-amber-700' :
                              r.status === 'approved' ? 'border-emerald-300 text-emerald-700' :
                              r.status === 'needs-correction' ? 'border-red-300 text-red-700' :
                              r.status === 'escalated' ? 'border-purple-300 text-purple-700' :
                              ''
                            }
                          >
                            {r.status === 'needs-correction' ? 'Correction Needed' :
                             r.status === 'escalated' ? 'Escalated' :
                             r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                  {jobReviewItems.length > 5 && (
                    <p className="text-xs text-muted-foreground pt-1">+{jobReviewItems.length - 5} more submissions</p>
                  )}
                  <div className="pt-2">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setLocation(`/review/${job.id}`)} data-testid="pm-workspace-open-review-queue">
                        Review This Job
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setLocation('/review')} data-testid="pm-workspace-open-all-reviews">
                        All Reviews
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Schedule */}
          <Card data-testid="pm-workspace-schedule">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" /> Schedule</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Start Date</p>
                  <p className="font-medium">{new Date(job.startAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">End Date</p>
                  <p className="font-medium">{new Date(job.endAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
              {(job as any).schedule && (job as any).schedule.length > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Upcoming Shifts</p>
                  <div className="divide-y">
                    {((job as any).schedule as any[]).slice(0, 5).map((shift: any, i: number) => (
                      <div key={i} className="flex justify-between py-2 text-sm" data-testid={`pm-schedule-shift-${i}`}>
                        <span>{shift.date || shift.day}</span>
                        <span className="text-muted-foreground">{shift.start || shift.startTime} — {shift.end || shift.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No individual shifts scheduled.</p>
              )}
              <Button variant="outline" size="sm" onClick={() => setLocation('/schedule')} data-testid="pm-workspace-open-schedule">
                Open Schedule
              </Button>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card data-testid="pm-workspace-documents">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {job.documents && job.documents.length > 0 ? (
                <div className="space-y-2">
                  {job.documents.map((doc, i) => (
                    <div key={i} className="flex justify-between items-center border rounded p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-500" />
                        <span>{doc.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setViewDoc(doc)} data-testid={`button-job-doc-view-${i}`}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No documents attached.</p>
              )}
            </CardContent>
          </Card>

          {/* Attention Required */}
          <Card data-testid="pm-workspace-attention">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-amber-500" /> Attention Required</CardTitle>
            </CardHeader>
            <CardContent>
              {!hasAttention ? (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Nothing requires attention on this job.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReviews.length > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50/40 p-3 text-sm">
                      <p className="font-medium text-amber-900">{pendingReviews.length} pending review{pendingReviews.length !== 1 ? 's' : ''} awaiting your decision</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setLocation('/review')}
                        data-testid="pm-workspace-attention-review-link"
                      >
                        Go to Review Queue
                      </Button>
                    </div>
                  )}
                  {correctionsNeeded.length > 0 && (
                    <div className="rounded-md border border-red-200 bg-red-50/40 p-3 text-sm">
                      <p className="font-medium text-red-900">{correctionsNeeded.length} submission{correctionsNeeded.length !== 1 ? 's' : ''} need correction</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Doc preview dialog */}
          <Dialog open={!!viewDoc} onOpenChange={(o) => !o && setViewDoc(null)}>
            <DialogContent className="sm:max-w-[600px] h-[80vh]">
              <DialogHeader>
                <DialogTitle>{viewDoc?.name}</DialogTitle>
                <DialogDescription>Document Preview</DialogDescription>
              </DialogHeader>
              <div className="flex-1 w-full h-full bg-slate-100 rounded-md flex items-center justify-center border">
                <div className="text-center p-8">
                  <FileText className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                  <p className="text-muted-foreground">Preview not available in demo mode.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Layout>
    );
  }

  // ── CEO VIEW ───────────────────────────────────────────
  return (
    <Layout>
      <div className="space-y-6" data-testid={`page-job-${job.id}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/jobs")}
              data-testid="button-back-jobs"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono" data-testid="badge-job-id">{job.jobId}</Badge>
                <Badge data-testid="badge-job-status">{job.status}</Badge>
              </div>
              <h1 className="text-2xl font-bold mt-1" data-testid="text-job-title">{job.title}</h1>
              {client && (
                <p className="text-sm text-muted-foreground cursor-pointer hover:underline" onClick={() => setLocation(`/clients/${client.id}`)} data-testid="text-job-client">for {client.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button variant="outline" onClick={startEdit} data-testid="button-job-edit">Edit</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} data-testid="button-job-cancel">Cancel</Button>
                <Button onClick={saveEdit} data-testid="button-job-save">Save</Button>
              </>
            )}

          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Schedule &amp; Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span data-testid="text-job-dates">
                  {new Date(job.startAt).toLocaleString()} 
                  {" · "}
                  {new Date(job.endAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span data-testid="text-job-location">{job.locationAddress}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority</span>
                {!isEditing ? (
                  <span data-testid="text-job-priority">{job.priority}</span>
                ) : (
                  <select
                    data-testid="select-job-priority-edit"
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={edit.priority as any}
                    onChange={(e) => setEdit((p) => ({ ...p, priority: e.target.value as any }))}
                  >
                    {(["Critical", "High", "Medium", "Low"] as const).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Project Manager</span>
                {!isEditing ? (
                  <span data-testid="text-job-manager">
                    {job.managerId ? users.find(u => u.id === job.managerId)?.name || "Unknown PM" : "Unassigned"}
                  </span>
                ) : (
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={edit.managerId}
                    onChange={(e) => setEdit((p) => ({ ...p, managerId: e.target.value }))}
                  >
                    <option value="none">Unassigned</option>
                    {users.filter(u => u.roleIds?.includes("role-pm") || u.roleIds?.includes("drole-pm")).map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                {!isEditing ? (
                  <span data-testid="text-job-status">{job.status}</span>
                ) : (
                  <select
                    data-testid="select-job-status-edit"
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={edit.status as any}
                    onChange={(e) => setEdit((p) => ({ ...p, status: e.target.value as any }))}
                  >
                    {(["Planned", "Active", "Completed", "Cancelled"] as const).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assigned Workers</span>
                <span data-testid="text-job-workers-count">{job.assignedWorkerIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Assets Deployed</span>
                <span data-testid="text-job-equipment-count">{job.assignedEquipmentIds.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <JobIntelligenceSection jobId={job.id} />

        <JobFinancialSummarySection jobId={job.id} />

        {/* Phase 5.2: Invoice Readiness + Pending Exposure */}
        <div className="grid gap-4 md:grid-cols-2">
          <InvoiceReadinessPanel jobId={job.id} />
          <PendingExposurePanel jobId={job.id} />
        </div>

        {/* Phase 5.5: Financial Forecast */}
        <JobForecastPanel jobId={job.id} />

        {/* Phase 5.6: Accounting Synchronization */}
        <JobSyncPanel jobId={job.id} />

        {/* Phase 5.8: Reconciliation Status */}
        <JobReconciliationPanel jobId={job.id} />

        {/* Phase 5.9: Exception & Controls Status */}
        <JobExceptionPanel jobId={job.id} />

        {/* Phase 5.3: Invoice Draft status */}
        {(() => {
          const draft = invoiceDrafts.find(d => d.jobId === job.id);
          if (!draft) return null;
          return (
            <Card data-testid={`job-invoice-draft-panel-${job.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FilePlus className="h-4 w-4" /> Invoice Draft
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Invoice Number</span>
                  <span className="font-mono font-semibold" data-testid={`job-draft-number-${job.id}`}>{draft.invoiceNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={INVOICE_STATUS_COLORS[draft.status]} data-testid={`job-draft-status-${job.id}`}>
                    {INVOICE_STATUS_LABELS[draft.status]}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold" data-testid={`job-draft-total-${job.id}`}>
                    £{draft.total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Assigned Crew
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!isEditing ? (
                <>
                  {job.assignedWorkerIds.length === 0 && (
                    <p className="text-muted-foreground" data-testid="text-job-no-workers">No workers assigned.</p>
                  )}
                  {job.assignedWorkerIds.map(id => {
                    const w = workers.find(worker => worker.id === id);
                    if (!w) return null;
                    return (
                      <div
                        key={id}
                        className="flex justify-between items-center border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900 cursor-pointer hover:bg-muted/50"
                        data-testid={`row-job-worker-${id}`}
                        onClick={() => setLocation(`/workers/${id}`)}
                      >
                        <span>{w.firstName} {w.lastName}</span>
                        <Badge variant="outline">{w.roleIds.map(rid => roles.find(r => r.id === rid)?.name).filter(Boolean).join(", ") || "—"}</Badge>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="space-y-4" data-testid="panel-job-workers-edit">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search crew..."
                      value={workerSearch}
                      onChange={(e) => setWorkerSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {companyWorkers
                      .filter((w) => {
                        const searchLower = workerSearch.toLowerCase();
                        return (
                          w.firstName.toLowerCase().includes(searchLower) ||
                          w.lastName.toLowerCase().includes(searchLower) ||
                          w.roleIds.some((rid) =>
                            roles.find((r) => r.id === rid)?.name.toLowerCase().includes(searchLower)
                          )
                        );
                      })
                      .map((w) => {
                      const checked = edit.assignedWorkerIds.includes(w.id);
                      return (
                        <label
                          key={w.id}
                          className="flex items-center justify-between gap-3 rounded-md border p-2 hover:bg-muted/40 cursor-pointer"
                          data-testid={`checkbox-job-worker-${w.id}`}
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{w.firstName} {w.lastName}</div>
                            <div className="text-xs text-muted-foreground truncate">{w.roleIds.map(rid => roles.find(r => r.id === rid)?.name).filter(Boolean).join(", ") || "—"}</div>
                          </div>
                          <input
                            data-testid={`input-job-worker-${w.id}`}
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() => toggleWorker(w.id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-4 w-4" /> Assets Deployed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!isEditing ? (
                <>
                  {job.assignedEquipmentIds.length === 0 && (
                    <p className="text-muted-foreground" data-testid="text-job-no-equipment">No equipment assigned.</p>
                  )}
                  {job.assignedEquipmentIds.map(id => {
                    const asset = equipment.find(eq => eq.id === id);
                    if (!asset) return null;
                    return (
                      <div
                        key={id}
                        className="flex justify-between items-center border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900 cursor-pointer hover:bg-muted/50"
                        data-testid={`row-job-equipment-${id}`}
                        onClick={() => setLocation(`/equipment/${id}`)}
                      >
                        <span>{asset.name}</span>
                        <Badge variant="outline">{asset.category}</Badge>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="space-y-4" data-testid="panel-job-equipment-edit">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assets..."
                      value={equipmentSearch}
                      onChange={(e) => setEquipmentSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {companyEquipment
                      .filter((eq) => {
                        const searchLower = equipmentSearch.toLowerCase();
                        return (
                          eq.name.toLowerCase().includes(searchLower) ||
                          eq.category.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((eq) => {
                      const checked = edit.assignedEquipmentIds.includes(eq.id);
                      return (
                        <label
                          key={eq.id}
                          className="flex items-center justify-between gap-3 rounded-md border p-2 hover:bg-muted/40 cursor-pointer"
                          data-testid={`checkbox-job-equipment-${eq.id}`}
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{eq.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{eq.category} · {eq.status}</div>
                          </div>
                          <input
                            data-testid={`input-job-equipment-${eq.id}`}
                            type="checkbox"
                            className="h-4 w-4"
                            checked={checked}
                            onChange={() => toggleEquipment(eq.id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Documents
                </CardTitle>
            </CardHeader>
            <CardContent>
                {job.documents && job.documents.length > 0 ? (
                    <div className="space-y-2">
                        {job.documents.map((doc, i) => (
                            <div key={i} className="flex justify-between items-center border rounded p-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-500" />
                                    <span>{doc.name}</span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setViewDoc(doc)} data-testid={`button-job-doc-view-${i}`}>
                                    <Eye className="h-4 w-4 mr-1" /> View
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic">No documents attached.</p>
                )}
            </CardContent>
        </Card>

        <Dialog open={!!viewDoc} onOpenChange={(o) => !o && setViewDoc(null)}>
            <DialogContent className="sm:max-w-[600px] h-[80vh]">
                <DialogHeader>
                    <DialogTitle>{viewDoc?.name}</DialogTitle>
                    <DialogDescription>Document Preview</DialogDescription>
                </DialogHeader>
                <div className="flex-1 w-full h-full bg-slate-100 rounded-md flex items-center justify-center border">
                    <div className="text-center p-8">
                        <FileText className="h-16 w-16 mx-auto text-slate-400 mb-4" />
                        <p className="text-muted-foreground">Preview not available in demo mode.</p>
                        <p className="text-xs text-muted-foreground mt-2">In a real app, this would render PDF or Image content.</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
