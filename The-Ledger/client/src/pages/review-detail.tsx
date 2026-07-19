import { Layout } from "@/components/layout";
import { useStore, useAuth } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, FileText, Image as ImageIcon, Search, AlertCircle, ChevronLeft, ArrowRight, User, PoundSterling, ShieldAlert, History, ListChecks, Gauge, Users, Briefcase } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { getJobReviewContext, formatGbp, formatAge, ageHoursOf } from "@/lib/reviewIntelligenceEngine";
import { computePriorityQueue } from "@/lib/reviewPriorityEngine";
import { PriorityBadge } from "@/components/review/ReviewPriorityPanel";
import { BatchActionsBar } from "@/components/review/BatchActionsBar";
import type { BatchReviewInput } from "@/lib/reviewBatchEngine";
import { ReviewDecisionPanel } from "@/components/review/ReviewDecisionPanel";
import { JobRecommendationPanel } from "@/components/review/ReviewRecommendations";
import { isProjectManager } from "@/lib/roleHelpers";

export default function ReviewDetailPage() {
  const { id } = useParams();
  const { jobs, workers, reviewItems, roles, updateReviewItem } = useStore();
  const { user } = useAuth();
  const userIsPM = isProjectManager(user, roles);
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  // UX-7.3 — batch selection. Keyed by id so it persists across tab filtering.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const job = jobs.find(j => j.id === id);

  // Get real review items for this job
  const jobReviewItems = reviewItems.filter(r => r.jobId === id);
  const pendingItems = jobReviewItems.filter(item => item.status === "pending");

  if (!job) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Job Not Found</h2>
          <p className="text-slate-500 mt-2 mb-6">The job you are looking for does not exist or you don't have access.</p>
          <Button onClick={() => setLocation("/review")}>Back to Review Centre</Button>
        </div>
      </Layout>
    );
  }

  const handleApprove = (itemId: string) => {
    updateReviewItem(itemId, { status: "approved" });
  };

  const handleReject = (itemId: string) => {
    updateReviewItem(itemId, { status: "rejected" });
  };

  // UX-7.3 — Batch handlers. Each fans out to the SAME single-item store flow
  // (updateReviewItem) used by the per-item buttons above — no new approval
  // path, no bypass. Audit is recorded by BatchActionsBar before these run.
  const handleBatchApprove = (ids: string[]) => {
    ids.forEach((i) => updateReviewItem(i, { status: "approved" }));
    setSelectedIds([]);
  };
  const handleBatchReject = (ids: string[], _reason: string) => {
    ids.forEach((i) => updateReviewItem(i, { status: "rejected" }));
    setSelectedIds([]);
  };
  const handleBatchCorrection = (ids: string[], _reason: string, note: string) => {
    ids.forEach((i) =>
      updateReviewItem(i, { status: "needs-correction", correctionNotes: note } as any)
    );
    setSelectedIds([]);
  };
  const handleBatchAssign = (_ids: string[], _assignee: string) => {
    // Mock: assignment is audit-only in the prototype (no assignee field on
    // ReviewItem). The audit record is written by BatchActionsBar.
    setSelectedIds([]);
  };

  const toggleSelect = (itemId: string) =>
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((x) => x !== itemId) : [...prev, itemId]
    );

  // UX-7.1 — read-only executive context for this job. Does not alter the
  // approval flow below; it only surfaces financial impact, age, priority,
  // related job summary, and approval history.
  const reviewContext = getJobReviewContext(job.id);
  const oldestAgeHours = pendingItems.reduce((max, item) => {
    if (!item.submittedAt) return max;
    const h = ageHoursOf({ submittedAt: item.submittedAt } as any);
    return Math.max(max, h);
  }, 0);
  const detailPriority =
    reviewContext.exposure >= 4000 || oldestAgeHours > 48
      ? "Critical"
      : reviewContext.exposure >= 1000 || oldestAgeHours > 24
      ? "High"
      : "Standard";
  const priorityClass =
    detailPriority === "Critical"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : detailPriority === "High"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-slate-50 text-slate-600 border-slate-200";

  // UX-7.2 — intelligent prioritisation context for this job (informational
  // only; does not affect approval). Uses the most urgent pending review on
  // the job to surface category, score, contributing factors and queue position.
  const priorityQueue = computePriorityQueue();
  const jobPriorityReviews = priorityQueue.filter((r) => r.jobId === job.id);
  const topPriorityReview = jobPriorityReviews[0] ?? null;

  const filteredItems = activeTab === "all"
    ? pendingItems
    : activeTab === "report"
      ? pendingItems.filter(item => item.type === "report" || item.type === "worker-report")
      : pendingItems.filter(item => item.type === activeTab);

  // UX-7.3 — selection helpers scoped to the currently visible (filtered) items.
  const visibleIds = filteredItems.map((i) => i.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((vid) => selectedIds.includes(vid));
  const selectAllVisible = () =>
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  const clearSelection = () => setSelectedIds([]);

  // Selected reviews (across all tabs) mapped to the batch engine's input shape.
  const selectedReviews: BatchReviewInput[] = pendingItems
    .filter((i) => selectedIds.includes(i.id))
    .map((i) => ({
      id: i.id,
      type: i.type,
      title: (i as any).title,
      notes: (i as any).notes,
      content: (i as any).content,
    }));

  const currentUserName = user?.name || "Reviewer";

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/review")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">{job.title}</h2>
              <Badge variant="outline">{job.jobId}</Badge>
            </div>
            <p className="text-slate-500 mt-1">Review pending submissions for this job.</p>
          </div>
        </div>

        {/* UX-7.1 — read-only review context (financial impact, age, priority, job, history) */}
        <div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          data-testid="review-detail-context"
        >
          {/* Financial Impact — CEO only; PMs must not see financial exposure */}
          {!userIsPM && (
            <Card data-testid="review-detail-financial">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-slate-400">
                  <PoundSterling className="h-4 w-4" />
                  <span className="text-[11px] font-medium uppercase tracking-wide">
                    Financial Impact
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {reviewContext.exposure > 0 ? formatGbp(reviewContext.exposure) : "—"}
                </p>
                <p className="text-xs text-slate-500">Blocked pending approval</p>
              </CardContent>
            </Card>
          )}

          <Card data-testid="review-detail-age">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Clock className="h-4 w-4" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Oldest Pending
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {pendingItems.length > 0 ? formatAge(oldestAgeHours) : "—"}
              </p>
              <p className="text-xs text-slate-500">{pendingItems.length} item(s) pending</p>
            </CardContent>
          </Card>

          <Card data-testid="review-detail-priority">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldAlert className="h-4 w-4" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Priority
                </span>
              </div>
              <div className="mt-2">
                <Badge variant="outline" className={priorityClass}>
                  {detailPriority}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500 capitalize">
                {job.priority} priority job · {job.status}
              </p>
            </CardContent>
          </Card>

          <Card data-testid="review-detail-history">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <History className="h-4 w-4" />
                <span className="text-[11px] font-medium uppercase tracking-wide">
                  Approval History
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {reviewContext.history.length}
              </p>
              <p className="text-xs text-slate-500">
                {reviewContext.history.filter((h) => h.status === "approved").length} approved ·{" "}
                {reviewContext.history.filter((h) => h.status === "rejected").length} rejected ·{" "}
                {reviewContext.history.filter((h) => h.status === "corrected").length} corrected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* UX-7.2 — Intelligent prioritisation detail (informational only, CEO-only due to financial factors) */}
        {!userIsPM && topPriorityReview && (
          <Card data-testid="review-detail-priority-panel">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListChecks className="h-4 w-4 text-blue-500" /> Review Priority
              </CardTitle>
              <CardDescription>
                Guidance for what to review first — this does not change approval
                behaviour.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Priority</span>
                    <PriorityBadge category={topPriorityReview.priority.category} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Priority score</span>
                    <span
                      className="flex items-center gap-1 text-sm font-semibold text-slate-900"
                      data-testid="review-detail-priority-score"
                    >
                      <Gauge className="h-3.5 w-3.5 text-slate-400" />
                      {topPriorityReview.priority.score} / 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Queue position</span>
                    <span className="text-sm font-semibold text-slate-900">
                      #{topPriorityReview.queuePosition}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Financial exposure</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {topPriorityReview.financialImpact > 0
                        ? formatGbp(topPriorityReview.financialImpact)
                        : "—"}
                    </span>
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <p className="mb-2 text-sm font-medium text-slate-900">
                    Contributing factors
                  </p>
                  <div className="space-y-2" data-testid="review-detail-priority-factors">
                    {topPriorityReview.priority.factors.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="w-36 shrink-0 text-slate-600">
                          {f.label}
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{
                              width: `${Math.min(100, (f.points / 30) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="w-28 shrink-0 text-right text-xs text-slate-500">
                          +{f.points} · {f.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PM Review Workspace — worker info, job context, review timeline */}
        {userIsPM && (
          <div className="grid gap-4 sm:grid-cols-3" data-testid="pm-review-workspace">
            <Card data-testid="pm-review-worker-info">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Worker Information</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {pendingItems.length > 0 ? (
                  <div className="space-y-1">
                    {Array.from(new Set(pendingItems.map(i => (i as any).submittedBy).filter(Boolean))).map((name, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-medium text-slate-600">
                          {(name as string).charAt(0)}
                        </div>
                        <span className="text-slate-700">{name as string}</span>
                      </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-1">{pendingItems.length} pending submission{pendingItems.length !== 1 ? 's' : ''}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-xs">No pending submissions.</p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="pm-review-job-context">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Briefcase className="h-4 w-4" /> Job Context</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={job.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">{job.status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{job.priority}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Crew</span>
                  <span className="font-medium">{job.assignedWorkerIds.length} assigned</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">All items</span>
                  <span className="font-medium">{jobReviewItems.length} total</span>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="pm-review-timeline">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" /> Review Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  {[
                    { label: "Submitted", count: jobReviewItems.length, color: "bg-blue-500" },
                    { label: "Pending", count: pendingItems.length, color: "bg-amber-500" },
                    { label: "Correction Sent", count: jobReviewItems.filter(r => r.status === 'needs-correction').length, color: "bg-orange-500" },
                    { label: "Escalated", count: jobReviewItems.filter(r => r.status === 'escalated').length, color: "bg-purple-500" },
                    { label: "Approved", count: jobReviewItems.filter(r => r.status === 'approved').length, color: "bg-emerald-500" },
                    { label: "Rejected", count: jobReviewItems.filter(r => r.status === 'rejected').length, color: "bg-rose-500" },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${color}`} />
                        <span className="text-muted-foreground">{label}</span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* UX-7.4 — Decision Intelligence (read-only consequence preview, CEO-only) */}
        {!userIsPM && <ReviewDecisionPanel jobId={job.id} />}

        {/* UX-7.5 — Review Recommendations (read-only guidance, CEO-only) */}
        {!userIsPM && <JobRecommendationPanel jobId={job.id} />}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList>
              <TabsTrigger value="all">All Pending ({pendingItems.length})</TabsTrigger>
              <TabsTrigger value="report">Reports ({pendingItems.filter(i => i.type === "report" || i.type === "worker-report").length})</TabsTrigger>
              <TabsTrigger value="photo">Photos ({pendingItems.filter(i => i.type === "photo").length})</TabsTrigger>
            </TabsList>
            
            {pendingItems.length > 0 && (
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve All Remaining
              </Button>
            )}
          </div>

          {/* UX-7.3 — selection toolbar */}
          {filteredItems.length > 0 && (
            <div
              className="mb-4 flex items-center gap-3 text-sm"
              data-testid="review-selection-toolbar"
            >
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(v) => (v ? selectAllVisible() : clearSelection())}
                  data-testid="select-all-visible"
                />
                <span className="text-slate-600">Select all visible</span>
              </label>
              {selectedIds.length > 0 && (
                <>
                  <span className="text-slate-400">·</span>
                  <span className="font-medium text-slate-700" data-testid="selection-count">
                    {selectedIds.length} selected
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    data-testid="clear-selection"
                    onClick={clearSelection}
                  >
                    Clear
                  </Button>
                </>
              )}
            </div>
          )}

          <TabsContent value={activeTab} className="mt-0">
            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900">All Caught Up!</h3>
                  <p className="text-slate-500 mt-2">There are no pending items of this type to review.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredItems.map(item => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {/* UX-7.3 — selection checkbox */}
                      <div className="flex items-start p-6 pr-0 pt-7">
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          data-testid={`select-review-${item.id}`}
                          aria-label={`Select review ${item.title || item.id}`}
                        />
                      </div>
                      {/* Left side - Content */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {item.type === 'report' || item.type === 'worker-report' ? <FileText className="h-4 w-4 text-purple-500" /> : <ImageIcon className="h-4 w-4 text-blue-500" />}
                              <Badge variant="secondary" className="capitalize">
                                {item.type}
                              </Badge>
                              <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {item.submittedAt}
                              </span>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                            <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                              <User className="h-4 w-4" /> Submitted by <span className="font-medium">{item.submittedBy}</span>
                            </div>
                          </div>
                        </div>

                        {(item.type === 'report' || item.type === 'worker-report') && (
                          <div className="mt-4 space-y-4">
                            {item.content && (
                              <div>
                                <h4 className="text-sm font-medium text-slate-900 mb-1">Summary</h4>
                                <p className="text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">{item.content}</p>
                              </div>
                            )}

                            {item.notes && !item.content && (
                               <div>
                                 <h4 className="text-sm font-medium text-slate-900 mb-1">Summary</h4>
                                 <p className="text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">{item.notes}</p>
                               </div>
                            )}
                            
                            {/* Legacy Items */}
                            {item.items && item.items.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-slate-900 mb-2">Materials Logged</h4>
                                <div className="bg-white border rounded-md overflow-hidden">
                                  {item.items.map((mat, idx) => (
                                    <div key={idx} className={`flex justify-between p-2 px-3 ${idx !== 0 ? 'border-t' : ''}`}>
                                      <span className="text-sm text-slate-700">{mat.name}</span>
                                      <span className="text-sm font-medium">{mat.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Phase 2 Materials Used */}
                            {item.materialsUsed && item.materialsUsed.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-slate-900 mb-2">Materials Logged</h4>
                                <div className="bg-white border rounded-md overflow-hidden">
                                  {item.materialsUsed.map((mat, idx) => (
                                    <div key={idx} className={`flex justify-between p-2 px-3 ${idx !== 0 ? 'border-t' : ''}`}>
                                      <span className="text-sm text-slate-700">{mat.stockItemName}</span>
                                      <span className="text-sm font-medium">Qty: {mat.quantity}{mat.unit ? ` ${mat.unit}` : ''}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {item.type === 'photo' && item.notes && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-slate-900 mb-1">Notes</h4>
                            <p className="text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">{item.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Middle/Right - Photo if applicable */}
                      {item.type === 'photo' && item.url && (
                        <div className="md:w-1/3 bg-slate-100 flex-shrink-0">
                          <img 
                            src={item.url} 
                            alt={item.title} 
                            className="w-full h-full object-cover min-h-[200px]"
                          />
                        </div>
                      )}

                      {/* Right side - Actions */}
                      <div className="bg-slate-50 p-6 border-t md:border-t-0 md:border-l border-slate-100 md:w-48 flex flex-row md:flex-col justify-center gap-3">
                        <Button 
                          className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white w-full"
                          onClick={() => handleApprove(item.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1 md:flex-none text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 w-full"
                          onClick={() => handleReject(item.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* UX-7.3 — batch decision toolbar (appears when reviews are selected) */}
        <BatchActionsBar
          selected={selectedReviews}
          currentUserName={currentUserName}
          onApprove={handleBatchApprove}
          onReject={handleBatchReject}
          onCorrection={handleBatchCorrection}
          onAssign={handleBatchAssign}
          onClear={clearSelection}
        />
      </div>
    </Layout>
  );
}