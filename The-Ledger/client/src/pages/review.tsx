import { Layout } from "@/components/layout";
import { useStore, useAuth } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, FileText, Image as ImageIcon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useLocation } from "wouter";
import { ReviewExecutiveDashboard } from "@/components/review/ReviewExecutiveDashboard";
import { ReviewPriorityPanel, PriorityBadge } from "@/components/review/ReviewPriorityPanel";
import { getJobPriority, getJobPriorityRank } from "@/lib/reviewPriorityEngine";
import { RecommendationDistributionPanel } from "@/components/review/ReviewRecommendations";
import { ReviewAnalyticsDashboard } from "@/components/review/ReviewAnalyticsDashboard";
import { ReviewExecutiveBriefing } from "@/components/review/ReviewExecutiveBriefing";

export default function ReviewPage() {
  const { jobs, workers, reviewItems } = useStore();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  // UX-7.2 — queue ordering: "standard" preserves existing behaviour;
  // "priority" reorders by intelligent prioritisation (visibility only).
  const [order, setOrder] = useState<"standard" | "priority">("standard");

  // In a real app, this would be data fetched from a backend containing pending items per job
  // For the mockup, we'll generate some demo review items based on active/completed jobs

  const isPM = user?.roleIds?.includes("role-pm") || user?.roleIds?.includes("drole-pm");
  // UX-7.1 — executive visibility layer is CEO-only; PMs keep the scoped queue.
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Review Center</h2>
            <p className="text-slate-500 mt-1">Review and approve worker submissions, photos, and reports.</p>
          </div>
        </div>

        {/* UX-7.7 — Executive Review Briefing: roll-up of all UX-7 intelligence (CEO-only) */}
        {isCEO && <ReviewExecutiveBriefing />}

        {/* UX-7.1 — Executive Review Dashboard (CEO-only, read-only visibility) */}
        {isCEO && <ReviewExecutiveDashboard />}

        {/* UX-7.2 — Intelligent Prioritisation: recommended work queue (CEO-only) */}
        {isCEO && <ReviewPriorityPanel />}

        {/* UX-7.5 — Review Recommendations: distribution + guidance (CEO-only) */}
        {isCEO && <RecommendationDistributionPanel />}

        {/* UX-7.6 — Review Operations Analytics (CEO-only, read-only) */}
        {isCEO && <ReviewAnalyticsDashboard />}

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
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No jobs currently require review.
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