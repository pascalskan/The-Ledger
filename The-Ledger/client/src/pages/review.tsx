import { Layout } from "@/components/layout";
import { useStore, useAuth } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, FileText, Image as ImageIcon, Search, Briefcase, LayoutDashboard, ListChecks, Sparkles, Activity, Inbox, TriangleAlert, ArrowRight, ClipboardCheck, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";
import { ReviewExecutiveDashboard } from "@/components/review/ReviewExecutiveDashboard";
import { ReviewPriorityPanel, PriorityBadge } from "@/components/review/ReviewPriorityPanel";
import { getJobPriority, getJobPriorityRank } from "@/lib/reviewPriorityEngine";
import { RecommendationDistributionPanel } from "@/components/review/ReviewRecommendations";
import { ReviewAnalyticsDashboard } from "@/components/review/ReviewAnalyticsDashboard";
import { ReviewExecutiveBriefing } from "@/components/review/ReviewExecutiveBriefing";
import { isProjectManager } from "@/lib/roleHelpers";

export default function ReviewPage() {
  const { jobs, workers, reviewItems, roles, updateReviewItem } = useStore();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  // UX-7.2 — queue ordering: "standard" preserves existing behaviour;
  // "priority" reorders by intelligent prioritisation (visibility only).
  const [order, setOrder] = useState<"standard" | "priority">("standard");
  // UX-7.8 — the CEO intelligence layers are unified into a single tabbed
  // Review Operations Centre (executive-first; briefing leads).
  const [hubTab, setHubTab] = useState("briefing");
  const [pmTab, setPmTab] = useState("pending");
  const [correctionItemId, setCorrectionItemId] = useState<string | null>(null);
  const [correctionNote, setCorrectionNote] = useState("");

  const userIsPM = isProjectManager(user, roles);
  // UX-7.1 — executive visibility layer is CEO-only; PMs keep the scoped queue.
  const isPM = userIsPM;
  const isCEO = user?.roleIds?.includes("role-ceo") || user?.roleIds?.includes("drole-ceo");

  const jobsWithReviews = jobs.filter(j => {
    if (j.status !== 'Active' && j.status !== 'Completed') return false;
    if (isPM && user && j.managerId !== user.id) return false;
    return true;
  }).map(job => {
    // Check real review items for this job
    const jobItems = reviewItems.filter(r => r.jobId === job.id && r.status === "pending");
    
    const pendingPhotos = jobItems.filter(r => r.type === "photo").length;
    const pendingReports = jobItems.filter(
      r => r.type === "report" || r.type === "worker-report"
    ).length;
    const pendingIssues = jobItems.filter(r => r.type === "log").length;
    
    const totalPending = pendingPhotos + pendingReports + pendingIssues;
    
    return {
      ...job,
      pendingPhotos,
      pendingReports,
      pendingIssues,
      totalPending
    };
  }).filter(j => j.totalPending > 0);

  const searchedJobs = jobsWithReviews.filter(j =>
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.jobId.toLowerCase().includes(search.toLowerCase())
  );

  // UX-7.2 — apply the selected ordering. Standard keeps the original order;
  // priority sorts by aggregated job priority (most urgent first).
  const filteredJobs =
    order === "priority"
      ? [...searchedJobs].sort(
          (a, b) => getJobPriorityRank(a.id) - getJobPriorityRank(b.id)
        )
      : searchedJobs;

  // ── PM REVIEW OPERATIONS CENTRE ─────────────────────────────────
  if (userIsPM) {
    const pmJobs = jobs.filter(j => j.managerId === user?.id);
    const pmReviewItems = reviewItems.filter(r => pmJobs.some(j => j.id === r.jobId));

    const pendingItems = pmReviewItems.filter(r => r.status === "pending");
    const correctedItems = pmReviewItems.filter(r => r.status === "needs-correction");
    const rejectedItems = pmReviewItems.filter(r => r.status === "rejected");
    const escalatedItems = pmReviewItems.filter(r => r.status === "escalated");

    const overdueItems = pendingItems.filter(r => {
      if (!r.submittedAt) return false;
      const ageHours = (Date.now() - new Date(r.submittedAt).getTime()) / 3600000;
      return ageHours > 24;
    });

    const getItemPriority = (item: typeof pmReviewItems[0]): "critical" | "attention" | "normal" => {
      if (!item.submittedAt) return "normal";
      const ageHours = (Date.now() - new Date(item.submittedAt).getTime()) / 3600000;
      if (ageHours > 48) return "critical";
      if (ageHours > 24 || item.status === "needs-correction") return "attention";
      return "normal";
    };

    const sortedPending = [...pendingItems].sort((a, b) => {
      const rank = { critical: 0, attention: 1, normal: 2 };
      return rank[getItemPriority(a)] - rank[getItemPriority(b)];
    });

    const handleQuickApprove = (itemId: string) => {
      updateReviewItem(itemId, { status: "approved" });
    };

    const handleRequestCorrection = (itemId: string, note: string) => {
      updateReviewItem(itemId, { status: "needs-correction", correctionNotes: note } as any);
      setCorrectionItemId(null);
      setCorrectionNote("");
    };

    const handleEscalate = (itemId: string) => {
      updateReviewItem(itemId, {
        status: "escalated",
        escalatedAt: new Date().toISOString(),
        escalatedBy: user?.id,
      } as any);
    };

    const getJobTitle = (jobId: string) => pmJobs.find(j => j.id === jobId)?.title ?? jobId;
    const getWorkerName = (item: typeof pmReviewItems[0]) => {
      const w = workers.find(w => w.id === (item as any).workerId);
      return w ? `${w.firstName} ${w.lastName}` : (item as any).submittedBy ?? "Unknown";
    };

    const formatAge = (submittedAt: string) => {
      const hours = (Date.now() - new Date(submittedAt).getTime()) / 3600000;
      if (hours < 1) return "< 1h ago";
      if (hours < 24) return `${Math.floor(hours)}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    };

    const PriorityChip = ({ priority }: { priority: "critical" | "attention" | "normal" }) => {
      if (priority === "critical") return <Badge variant="outline" className="border-rose-300 text-rose-700 text-[10px]">Critical</Badge>;
      if (priority === "attention") return <Badge variant="outline" className="border-amber-300 text-amber-700 text-[10px]">Attention</Badge>;
      return <Badge variant="outline" className="border-slate-200 text-slate-500 text-[10px]">Normal</Badge>;
    };

    const PendingItemCard = ({ item }: { item: typeof pmReviewItems[0] }) => {
      const priority = getItemPriority(item);
      const isRequiringCorrection = correctionItemId === item.id;
      return (
        <Card
          key={item.id}
          data-testid={`pm-review-item-${item.id}`}
          className={priority === "critical" ? "border-rose-200 bg-rose-50/30" : priority === "attention" ? "border-amber-200 bg-amber-50/20" : ""}
        >
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <PriorityChip priority={priority} />
                  <Badge variant="secondary" className="capitalize text-[10px]">{item.type}</Badge>
                  {item.submittedAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{formatAge(item.submittedAt)}
                    </span>
                  )}
                </div>
                <p className="font-medium text-sm">{(item as any).title ?? item.type}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getJobTitle(item.jobId)} · {getWorkerName(item)}
                </p>
                {(item as any).content && (
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{(item as any).content}</p>
                )}
              </div>
              <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                  data-testid={`pm-review-quick-approve-${item.id}`}
                  onClick={() => handleQuickApprove(item.id)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-amber-200 text-amber-700 hover:bg-amber-50 h-8 text-xs"
                  data-testid={`pm-review-request-correction-${item.id}`}
                  onClick={() => { setCorrectionItemId(item.id); setCorrectionNote(""); }}
                >
                  Correction
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 h-8 text-xs"
                  data-testid={`pm-review-escalate-${item.id}`}
                  onClick={() => handleEscalate(item.id)}
                >
                  <ShieldAlert className="h-3 w-3 mr-1" /> Escalate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => setLocation(`/review/${item.jobId}`)}
                  data-testid={`pm-review-open-detail-${item.id}`}
                >
                  Detail <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
            {isRequiringCorrection && (
              <div className="mt-3 pt-3 border-t space-y-2" data-testid={`pm-review-correction-form-${item.id}`}>
                <label className="text-xs font-medium text-slate-700">Correction note for worker</label>
                <Input
                  placeholder="Explain what needs to be corrected..."
                  value={correctionNote}
                  onChange={e => setCorrectionNote(e.target.value)}
                  className="text-xs h-8"
                  data-testid={`pm-review-correction-input-${item.id}`}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleRequestCorrection(item.id, correctionNote)}
                    data-testid={`pm-review-correction-submit-${item.id}`}
                  >
                    Send Correction
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setCorrectionItemId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      );
    };

    return (
      <Layout>
        <div className="space-y-6" data-testid="pm-review-page">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Review Queue</h2>
            <p className="text-muted-foreground mt-1">
              Review and action worker submissions for your assigned jobs.
            </p>
          </div>

          {/* Metrics strip */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4" data-testid="pm-review-metrics">
            <Card className="bg-blue-50/50 border-blue-100">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Pending</p>
                <p className="text-3xl font-bold text-blue-900 mt-1" data-testid="pm-review-metric-pending">{pendingItems.length}</p>
                <p className="text-[11px] text-blue-500 mt-0.5">awaiting review</p>
              </CardContent>
            </Card>
            <Card className={overdueItems.length > 0 ? "bg-rose-50/50 border-rose-100" : ""}>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-rose-600 uppercase tracking-wide">Overdue</p>
                <p className="text-3xl font-bold text-rose-900 mt-1" data-testid="pm-review-metric-overdue">{overdueItems.length}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">&gt; 24 hours pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">Corrections</p>
                <p className="text-3xl font-bold mt-1" data-testid="pm-review-metric-corrections">{correctedItems.length}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">awaiting resubmission</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Escalated</p>
                <p className="text-3xl font-bold mt-1" data-testid="pm-review-metric-escalations">{escalatedItems.length}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">awaiting CEO review</p>
              </CardContent>
            </Card>
          </div>

          {/* 4-tab queue */}
          <Tabs value={pmTab} onValueChange={setPmTab} data-testid="pm-review-tabs">
            <TabsList>
              <TabsTrigger value="pending" data-testid="pm-review-tab-pending">
                Pending{pendingItems.length > 0 && <Badge variant="secondary" className="ml-2 h-5 text-[10px]">{pendingItems.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="corrected" data-testid="pm-review-tab-corrected">
                Corrected{correctedItems.length > 0 && <Badge variant="secondary" className="ml-2 h-5 text-[10px]">{correctedItems.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="rejected" data-testid="pm-review-tab-rejected">
                Rejected
              </TabsTrigger>
              <TabsTrigger value="escalated" data-testid="pm-review-tab-escalated">
                Escalated{escalatedItems.length > 0 && <Badge variant="secondary" className="ml-2 h-5 text-[10px]">{escalatedItems.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* Pending tab */}
            <TabsContent value="pending" className="mt-4">
              <div className="space-y-3" data-testid="pm-review-queue">
                {sortedPending.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg" data-testid="pm-review-queue-empty">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <p className="font-medium">Queue is clear</p>
                    <p className="text-sm text-muted-foreground">No pending submissions require review.</p>
                  </div>
                ) : (
                  sortedPending.map(item => <PendingItemCard key={item.id} item={item} />)
                )}
              </div>
            </TabsContent>

            {/* Corrected tab — items awaiting re-review after correction request */}
            <TabsContent value="corrected" className="mt-4">
              <div className="space-y-3" data-testid="pm-review-corrected-list">
                {correctedItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <p className="font-medium">No corrections pending</p>
                    <p className="text-sm text-muted-foreground">No items are awaiting worker correction.</p>
                  </div>
                ) : (
                  correctedItems.map(item => (
                    <Card key={item.id} data-testid={`pm-review-corrected-item-${item.id}`} className="border-amber-200 bg-amber-50/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="border-amber-300 text-amber-700 text-[10px]">Correction Sent</Badge>
                              <Badge variant="secondary" className="capitalize text-[10px]">{item.type}</Badge>
                            </div>
                            <p className="font-medium text-sm">{(item as any).title ?? item.type}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{getJobTitle(item.jobId)} · {getWorkerName(item)}</p>
                            {(item as any).correctionNotes && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                <span className="font-medium">Correction note: </span>{(item as any).correctionNotes}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="ghost" className="h-8 text-xs shrink-0" onClick={() => setLocation(`/review/${item.jobId}`)}>
                            View <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Rejected tab */}
            <TabsContent value="rejected" className="mt-4">
              <div className="space-y-3" data-testid="pm-review-rejected-list">
                {rejectedItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <p className="font-medium">No rejections</p>
                    <p className="text-sm text-muted-foreground">No items have been rejected.</p>
                  </div>
                ) : (
                  rejectedItems.map(item => (
                    <Card key={item.id} data-testid={`pm-review-rejected-item-${item.id}`} className="border-rose-200 bg-rose-50/20">
                      <CardContent className="p-4 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="border-rose-300 text-rose-700 text-[10px]">Rejected</Badge>
                            <Badge variant="secondary" className="capitalize text-[10px]">{item.type}</Badge>
                            {item.submittedAt && <span className="text-xs text-muted-foreground">{formatAge(item.submittedAt)}</span>}
                          </div>
                          <p className="font-medium text-sm">{(item as any).title ?? item.type}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{getJobTitle(item.jobId)} · {getWorkerName(item)}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-8 text-xs shrink-0" onClick={() => setLocation(`/review/${item.jobId}`)}>
                          View <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            {/* Escalated tab — read-only; PM escalated to CEO */}
            <TabsContent value="escalated" className="mt-4">
              {escalatedItems.length > 0 && (
                <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-md flex items-start gap-2 text-sm text-purple-800">
                  <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>These items have been escalated to the CEO for review. You cannot approve or reject escalated items — they are pending CEO action.</span>
                </div>
              )}
              <div className="space-y-3" data-testid="pm-review-escalated-list">
                {escalatedItems.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                    <p className="font-medium">No escalations</p>
                    <p className="text-sm text-muted-foreground">No items have been escalated.</p>
                  </div>
                ) : (
                  escalatedItems.map(item => (
                    <Card key={item.id} data-testid={`pm-review-escalated-item-${item.id}`} className="border-purple-200 bg-purple-50/20">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="border-purple-300 text-purple-700 text-[10px]">Escalated — Awaiting CEO</Badge>
                              <Badge variant="secondary" className="capitalize text-[10px]">{item.type}</Badge>
                            </div>
                            <p className="font-medium text-sm">{(item as any).title ?? item.type}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{getJobTitle(item.jobId)} · {getWorkerName(item)}</p>
                            {(item as any).content && (
                              <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{(item as any).content}</p>
                            )}
                            {(item as any).escalatedAt && (
                              <p className="text-[11px] text-muted-foreground mt-1.5">
                                Escalated {formatAge((item as any).escalatedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Layout>
    );
  }
  // ── END PM REVIEW OPERATIONS CENTRE ─────────────────────────────

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {isCEO ? "Review Operations Centre" : "Review Center"}
            </h2>
            <p className="text-slate-500 mt-1">
              {isCEO
                ? "The decision engine of the business — attention, prioritisation, impact, recommendations and operations in one place. Every approval still happens in the queue below."
                : "Review and approve worker submissions, photos, and reports."}
            </p>
          </div>
        </div>

        {/* UX-7.8 — Review Operations Centre: the UX-7.1–7.7 intelligence layers
            unified into one executive, read-only tabbed experience (CEO-only).
            The live approval queue remains below and is unchanged. */}
        {isCEO && (
          <Tabs value={hubTab} onValueChange={setHubTab} className="w-full">
            <TabsList
              className="flex w-full flex-wrap justify-start"
              aria-label="Review Operations Centre sections"
              data-testid="review-hub-tabs"
            >
              <TabsTrigger value="briefing" data-testid="review-hub-tab-briefing">
                <Briefcase className="mr-1.5 h-4 w-4" /> Briefing
              </TabsTrigger>
              <TabsTrigger value="dashboard" data-testid="review-hub-tab-dashboard">
                <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
              </TabsTrigger>
              <TabsTrigger value="prioritisation" data-testid="review-hub-tab-prioritisation">
                <ListChecks className="mr-1.5 h-4 w-4" /> Prioritisation
              </TabsTrigger>
              <TabsTrigger value="recommendations" data-testid="review-hub-tab-recommendations">
                <Sparkles className="mr-1.5 h-4 w-4" /> Recommendations
              </TabsTrigger>
              <TabsTrigger value="analytics" data-testid="review-hub-tab-analytics">
                <Activity className="mr-1.5 h-4 w-4" /> Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="briefing" className="mt-6">
              <ReviewExecutiveBriefing />
            </TabsContent>
            <TabsContent value="dashboard" className="mt-6">
              <ReviewExecutiveDashboard />
            </TabsContent>
            <TabsContent value="prioritisation" className="mt-6">
              <ReviewPriorityPanel />
            </TabsContent>
            <TabsContent value="recommendations" className="mt-6">
              <RecommendationDistributionPanel />
            </TabsContent>
            <TabsContent value="analytics" className="mt-6">
              <ReviewAnalyticsDashboard />
            </TabsContent>
          </Tabs>
        )}

        {/* Operational queue header (the action surface, always visible) */}
        {isCEO && (
          <div className="flex items-center gap-2 pt-2">
            <Inbox className="h-5 w-5 text-slate-400" />
            <h3 className="text-lg font-semibold text-slate-900">Review Queue</h3>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-blue-50/50 border-blue-100">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">Total Pending</p>
                <p className="text-2xl font-bold text-blue-700">
                  {jobsWithReviews.reduce((sum, j) => sum + j.totalPending, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Reports</p>
                <p className="text-2xl font-bold text-slate-900">
                  {jobsWithReviews.reduce((sum, j) => sum + j.pendingReports, 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Photos</p>
                <p className="text-2xl font-bold text-slate-900">
                  {jobsWithReviews.reduce((sum, j) => sum + j.pendingPhotos, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Jobs Requiring Review</CardTitle>
                <CardDescription>Select a job to review its pending submissions</CardDescription>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                {/* UX-7.2 — Standard / Priority order toggle (visibility only) */}
                {isCEO && (
                  <div
                    className="inline-flex rounded-md border border-slate-200 p-0.5"
                    data-testid="review-order-toggle"
                  >
                    <Button
                      type="button"
                      size="sm"
                      variant={order === "standard" ? "default" : "ghost"}
                      className="h-8"
                      aria-pressed={order === "standard"}
                      data-testid="review-order-standard"
                      onClick={() => setOrder("standard")}
                    >
                      Standard Order
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={order === "priority" ? "default" : "ghost"}
                      className="h-8"
                      aria-pressed={order === "priority"}
                      data-testid="review-order-priority"
                      onClick={() => setOrder("priority")}
                    >
                      Priority Order
                    </Button>
                  </div>
                )}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search jobs..."
                    className="pl-9 bg-slate-50"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Pending Items</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10" data-testid="review-queue-empty">
                      <div className="flex flex-col items-center justify-center text-center">
                        <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-500" />
                        <p className="font-medium text-slate-900">
                          {search ? "No jobs match your search" : "Queue is clear"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {search
                            ? "Try a different job title or ID."
                            : "No jobs currently require review — every submission has been actioned."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-medium text-slate-700">{job.jobId}</TableCell>
                      <TableCell>
                        <div className="font-medium">{job.title}</div>
                        <div className="text-xs text-slate-500">{job.locationAddress}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {job.pendingReports > 0 && (
                            <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200">
                              <FileText className="w-3 h-3 mr-1" /> {job.pendingReports} Reports
                            </Badge>
                          )}
                          {job.pendingPhotos > 0 && (
                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                              <ImageIcon className="w-3 h-3 mr-1" /> {job.pendingPhotos} Photos
                            </Badge>
                          )}
                          {job.pendingIssues > 0 && (
                            <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> {job.pendingIssues} Logs
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`review-job-priority-${job.id}`}>
                        <PriorityBadge category={getJobPriority(job.id).category} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => setLocation(`/review/${job.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Review Items
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}