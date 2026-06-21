import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/mockData";
import { usePortalAuth } from "@/lib/portalAuth";
import {
  toPortalClient,
  projectClientJobs,
  type PortalJob,
} from "@/lib/portalProjections";
import { recordPortalAudit } from "@/lib/portalAudit";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, MessageSquare, Briefcase, Users, Calendar, MapPin, Send, ArrowLeft, ShieldCheck, UserCircle, CheckCircle2, Package, Wrench, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { ProjectProgress } from "@/components/portal/ProjectProgress";
import { FinancialOverview } from "@/components/portal/FinancialOverview";
import { ProjectDocuments } from "@/components/portal/ProjectDocuments";
import { ProjectContacts } from "@/components/portal/ProjectContacts";
import { AssignedCrew } from "@/components/portal/AssignedCrew";
import { NextVisit } from "@/components/portal/NextVisit";
import { ActivityTimeline } from "@/components/portal/ActivityTimeline";

export default function PortalPage() {
  // Portal consumes UNFILTERED source arrays; all client-facing data is built
  // through the projection layer and scoped to the signed-in account's client.
  const { allClients: clients, allJobs: jobs, allWorkers: workers, allRoles: roles } = useStore();
  const { account, signIn, signOut } = usePortalAuth();
  const { toast } = useToast();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  // Mock comments state local to the portal session (placeholder until CL-7
  // replaces it with the structured Client Request surface).
  const [comments, setComments] = useState<Record<string, { author: string; text: string; date: string }[]>>({});
  const [newComment, setNewComment] = useState("");

  // ── Client-safe projections (RBAC: scoped to account.clientId) ────────────
  const portalClient = useMemo(
    () => (account ? clients.filter((c) => c.id === account.clientId).map(toPortalClient)[0] : undefined),
    [account, clients]
  );
  const portalJobs: PortalJob[] = useMemo(
    () => (account ? projectClientJobs(account.clientId, jobs, workers, roles) : []),
    [account, jobs, workers, roles]
  );
  const selectedJob = portalJobs.find((j) => j.id === selectedJobId) ?? null;

  // ── Audit: dashboard view ─────────────────────────────────────────────────
  useEffect(() => {
    if (account && !selectedJobId) {
      recordPortalAudit({
        type: "client_viewed_dashboard",
        who: account.email,
        what: "Viewed portal dashboard",
        clientId: account.clientId,
        externalReference: account.clientId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account?.id, selectedJobId]);

  const handleSignIn = () => {
    setLoginError(null);
    const result = signIn(email, password);
    if (!result.ok) {
      setLoginError(result.message);
    }
  };

  const handleOpenJob = (job: PortalJob) => {
    if (account) {
      recordPortalAudit({
        type: "client_viewed_job",
        who: account.email,
        what: `Viewed job ${job.jobId}`,
        clientId: account.clientId,
        sourceObjectId: job.id,
        externalReference: account.clientId,
      });
    }
    setSelectedJobId(job.id);
  };

  // ── Sign-in screen ─────────────────────────────────────────────────────────
  if (!account) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" data-testid="portal-login">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8 gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <ShieldCheck className="h-8 w-8 text-slate-800" />
            <span>The Ledger Portal</span>
          </div>
          <Card className="shadow-lg border-0">
            <CardHeader className="space-y-1 pb-6 text-center">
              <CardTitle className="text-2xl font-semibold text-slate-900">Client Sign In</CardTitle>
              <CardDescription>
                Welcome to your client portal. Access your jobs, crew, and project details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loginError && (
                <div
                  className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  data-testid="portal-login-error"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="portal-email">Email</Label>
                <Input
                  id="portal-email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  data-testid="portal-login-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal-password">Password</Label>
                <Input
                  id="portal-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                  data-testid="portal-login-password"
                />
              </div>
              <Button
                className="w-full h-11 text-base font-medium bg-slate-900 hover:bg-slate-800 text-white"
                onClick={handleSignIn}
                data-testid="portal-login-submit"
              >
                Sign In
              </Button>
              <div className="rounded-md bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500">
                <span className="font-medium text-slate-600">Demo:</span> sign in with{" "}
                <button
                  type="button"
                  className="font-mono text-slate-700 underline hover:text-slate-900"
                  onClick={() => setEmail("portal@hsslimited.co.uk")}
                  data-testid="portal-login-demo-fill"
                >
                  portal@hsslimited.co.uk
                </button>{" "}
                (any password).
              </div>
            </CardContent>
          </Card>
          <div className="text-center mt-6 text-xs text-slate-400">
            Protected by The Ledger Operations Platform
          </div>
        </div>
      </div>
    );
  }

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedJobId) return;
    setComments((prev) => ({
      ...prev,
      [selectedJobId]: [
        ...(prev[selectedJobId] || []),
        { author: portalClient?.name || "Client", text: newComment, date: new Date().toISOString() },
      ],
    }));
    setNewComment("");
    toast({ title: "Request sent", description: "Your comment has been added to the project." });
  };

  // Presentational mock data (documents/financials/timeline are replaced with
  // real projected data in CL-5 / CL-6 — kept as placeholders for CL-2 scope).
  const mockDocuments = [
    { name: "Signed Quote (PDF)", date: "12 Oct 2023" },
    { name: "RAMS (PDF)", date: "14 Oct 2023" },
    { name: "Insurance Certificate (PDF)", date: "01 Nov 2023" },
    ...(selectedJob?.status === "Completed" ? [{ name: "Completion Certificate", date: "28 Nov 2023" }] : []),
  ];

  const mockActivities = [
    { title: "Job Created", date: "10 Oct 2023", description: "Project brief received and created in system.", icon: CheckCircle2 },
    { title: "Scheduled", date: "12 Oct 2023", description: "Crew and dates confirmed.", icon: Calendar },
    { title: "Materials Ordered", date: "15 Oct 2023", description: "Supplies requested from wholesaler.", icon: Package },
    { title: "Work Started", date: "20 Oct 2023", description: "Crew on site.", icon: Wrench },
  ];

  // Crew is already a client-safe projection (first name + role only).
  const mappedCrew =
    selectedJob?.crew.map((c) => ({
      initials: c.initial,
      name: c.firstName,
      role: c.role,
      scheduledDate: c.scheduledDate,
    })) || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" data-testid="portal-app">
      {/* Portal Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-slate-800" />
          <span className="font-bold text-lg tracking-tight hidden sm:inline-block text-slate-900">The Ledger Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2 text-sm font-medium bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200"
            data-testid="portal-client-name"
          >
            <Building2 className="h-4 w-4 text-slate-500" />
            {portalClient?.name}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-600 hover:text-slate-900"
            onClick={() => {
              signOut();
              setSelectedJobId(null);
              setEmail("");
              setPassword("");
            }}
            data-testid="portal-signout"
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!selectedJobId ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" data-testid="portal-dashboard">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Projects</h1>
              <p className="text-slate-500 mt-1">Track progress, view crew, and manage requests.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {portalJobs.map((job) => (
                <Card
                  key={job.id}
                  className="cursor-pointer border-slate-200 hover:border-slate-400 hover:shadow-md transition-all group"
                  onClick={() => handleOpenJob(job)}
                  data-testid={`portal-job-card-${job.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge variant="outline" className={`mb-2 font-normal ${job.status === "Completed" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                          {job.status}
                        </Badge>
                        <CardTitle className="text-lg group-hover:text-slate-900 text-slate-800 transition-colors">{job.title}</CardTitle>
                      </div>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">{job.jobId}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{job.locationAddress}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{new Date(job.startAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>{job.crewCount} Crew</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 text-slate-700">View Details</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {portalJobs.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-lg bg-white" data-testid="portal-no-projects">
                  <Briefcase className="h-8 w-8 mx-auto text-slate-400 mb-3" />
                  <h3 className="text-lg font-medium text-slate-800">No projects found</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">There are currently no active or historical projects assigned to your account.</p>
                </div>
              )}
            </div>
          </div>
        ) : selectedJob && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-12" data-testid="portal-job-detail">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedJobId(null)} className="-ml-3 text-slate-500 hover:text-slate-900" data-testid="portal-back-to-projects">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
              </Button>
              <div className="text-xs text-slate-400 font-medium tracking-wide">Last Updated: Today at {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="outline" className={`font-normal ${selectedJob.status === "Completed" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                    {selectedJob.status}
                  </Badge>
                  <span className="text-sm font-mono text-slate-500">{selectedJob.jobId}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{selectedJob.title}</h1>
              </div>
            </div>

            {/* Project Progress Tracker */}
            <ProjectProgress status={selectedJob.status} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
              {/* Main Content - Left Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Project Overview */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-lg">Project Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm pt-5">
                    <p className="text-slate-700 leading-relaxed text-base">{selectedJob.description}</p>

                    <div className="grid sm:grid-cols-2 gap-6 pt-5 border-t border-slate-100">
                      <div className="space-y-1.5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Location</span>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                          <span className="text-slate-800 font-medium">{selectedJob.locationAddress}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Schedule</span>
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                          <div>
                            <div className="text-slate-800 font-medium">{new Date(selectedJob.startAt).toLocaleDateString()}</div>
                            <div className="text-slate-500 text-xs mt-0.5">{new Date(selectedJob.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Overview — placeholder values; CL-6 wires real invoice data */}
                <FinancialOverview quote={8500} variations={1200} invoiced={4000} paid={4000} />

                {/* Documents Section — placeholder; CL-5 wires shared documents */}
                <ProjectDocuments documents={mockDocuments} />

                {/* Activity Timeline */}
                <ActivityTimeline activities={mockActivities} />

                {/* Comment Thread — placeholder; CL-7 replaces with Client Requests */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-slate-500" />
                      Comments & Requests
                    </CardTitle>
                    <CardDescription>Leave a message for the project manager or operations team.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2">
                      <div className="flex gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                          <UserCircle className="h-5 w-5" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none p-4 text-sm flex-1 shadow-sm">
                          <div className="font-medium mb-1.5 flex items-center justify-between">
                            <span className="text-slate-800">Project Manager</span>
                            <span className="text-xs text-slate-400 font-normal">Yesterday</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">Hi team, please let us know if you have any questions about the upcoming works. We're looking forward to getting started.</p>
                        </div>
                      </div>

                      {(comments[selectedJob.id] || []).map((comment, i) => (
                        <div key={i} className="flex gap-3 flex-row-reverse">
                          <div className="h-9 w-9 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-sm">
                            YOU
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl rounded-tr-none p-4 text-sm flex-1 shadow-sm">
                            <div className="font-medium mb-1.5 flex items-center justify-between">
                              <span className="text-xs text-slate-400 font-normal">{new Date(comment.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              <span className="text-slate-800">{comment.author}</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-5 border-t border-slate-100 mt-2">
                      <Input
                        placeholder="Type a message or request..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                        className="bg-slate-50 border-slate-200 focus-visible:ring-slate-400"
                      />
                      <Button onClick={handleAddComment} size="icon" className="shrink-0 bg-slate-800 hover:bg-slate-700 text-white">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Content - Right Column */}
              <div className="space-y-8">
                <ProjectContacts />

                <AssignedCrew crew={mappedCrew} />

                <NextVisit
                  date={selectedJob.status !== "Completed" ? selectedJob.startAt : undefined}
                  timeWindow="08:00 - 16:00"
                  crewSize={selectedJob.crewCount}
                  notes="Please ensure site access is clear and induction documentation is signed before arrival."
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
