import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase, Users, Calendar, MapPin, ArrowLeft, UserCog, MessagesSquare, Building2, CalendarClock, Activity,
} from "lucide-react";
import {
  projectMilestones,
  projectDeliverables,
  projectTimeline,
  computeProjectProgress,
  type PortalJob,
  type PortalThread,
} from "@/lib/portalProjections";

import { ProjectProgress } from "@/components/portal/ProjectProgress";
import { ProjectContacts } from "@/components/portal/ProjectContacts";
import { AssignedCrew } from "@/components/portal/AssignedCrew";
import { NextVisit } from "@/components/portal/NextVisit";
import { ProjectProgressSummary } from "@/components/portal/ProjectProgressSummary";
import { ProjectMilestones } from "@/components/portal/ProjectMilestones";
import { ProjectDeliverables } from "@/components/portal/ProjectDeliverables";
import { ProjectTimeline } from "@/components/portal/ProjectTimeline";

type StatusFilter = "all" | "active" | "completed";

interface PortalJobsProps {
  jobs: PortalJob[];
  selectedJob: PortalJob | null;
  threads: PortalThread[];
  onOpenJob: (job: PortalJob) => void;
  onBack: () => void;
  onOpenMessages: () => void;
}

export function PortalJobs({ jobs, selectedJob, threads, onOpenJob, onBack, onOpenMessages }: PortalJobsProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");

  if (selectedJob) {
    return (
      <PortalJobDetail
        job={selectedJob}
        threads={threads.filter((t) => t.projectId === selectedJob.id)}
        onBack={onBack}
        onOpenMessages={onOpenMessages}
      />
    );
  }

  const filtered = jobs.filter((j) => {
    if (filter === "active") return j.status !== "Completed";
    if (filter === "completed") return j.status === "Completed";
    return true;
  });

  return (
    <div className="space-y-6" data-testid="portal-jobs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Your Projects</h1>
          <p className="text-muted-foreground mt-1">Track progress and crew across your jobs.</p>
        </div>
        <div className="inline-flex rounded-md border border-border bg-card p-1" data-testid="portal-jobs-filter">
          {(["all", "active", "completed"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-sm capitalize transition ${filter === f ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-muted"}`}
              data-testid={`portal-jobs-filter-${f}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((job) => (
          <Card
            key={job.id}
            className="cursor-pointer border-border hover:border-slate-400 hover:shadow-md transition-all group"
            onClick={() => onOpenJob(job)}
            data-testid={`portal-job-card-${job.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="outline" className={`mb-2 font-normal ${job.status === "Completed" ? "bg-muted text-muted-foreground" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                    {job.status}
                  </Badge>
                  <CardTitle className="text-lg text-foreground">{job.title}</CardTitle>
                </div>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded border border-border">{job.jobId}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{job.locationAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{new Date(job.startAt).toLocaleDateString()}</span>
                </div>
                {job.managerName && (
                  <div className="flex items-center gap-2 text-muted-foreground" data-testid={`portal-job-pm-${job.id}`}>
                    <UserCog className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">PM: {job.managerName}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 mt-1 border-t border-border">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{job.crewCount} Crew</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-foreground">View Details</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-border rounded-lg bg-card" data-testid="portal-jobs-empty">
            <Briefcase className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium text-foreground">No projects found</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">There are no projects matching this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PortalJobDetail({
  job,
  threads,
  onBack,
  onOpenMessages,
}: {
  job: PortalJob;
  threads: PortalThread[];
  onBack: () => void;
  onOpenMessages: () => void;
}) {
  const mappedCrew = job.crew.map((c) => ({
    initials: c.initial,
    name: c.firstName,
    role: c.role,
    scheduledDate: c.scheduledDate,
  }));

  // Client-safe project data via the projection layer.
  const milestones = projectMilestones(job.id);
  const deliverables = projectDeliverables(job.id);
  const timeline = projectTimeline(job);
  const progress = computeProjectProgress(milestones, job.status);

  return (
    <div className="space-y-6 pb-12" data-testid="portal-job-detail">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 text-muted-foreground hover:text-foreground" data-testid="portal-back-to-projects">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="outline" className={`font-normal ${job.status === "Completed" ? "bg-muted text-muted-foreground" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
            {job.status}
          </Badge>
          <span className="text-sm font-mono text-muted-foreground">{job.jobId}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{job.title}</h1>
      </div>

      <ProjectProgress status={job.status} />

      {/* Project Summary */}
      <Card className="shadow-sm border-border" data-testid="portal-project-summary">
        <CardHeader className="pb-3 border-b border-border bg-muted/50">
          <CardTitle className="text-lg">Project Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4 text-sm">
          <p className="text-foreground leading-relaxed text-base">{job.description}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4 border-t border-border">
            <SummaryField icon={Building2} label="Site" value={job.locationAddress} testid="portal-summary-site" />
            <SummaryField icon={Activity} label="Status" value={job.status} testid="portal-summary-status" />
            <SummaryField icon={UserCog} label="Assigned PM" value={job.managerName || "—"} testid="portal-detail-pm" />
            <SummaryField icon={Calendar} label="Start date" value={new Date(job.startAt).toLocaleDateString()} testid="portal-summary-start" />
            <SummaryField icon={CalendarClock} label="Target completion" value={new Date(job.endAt).toLocaleDateString()} testid="portal-summary-target" />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-2">
        <div className="lg:col-span-2 space-y-8">
          <ProjectProgressSummary progress={progress} />

          <ProjectMilestones milestones={milestones} />

          <ProjectDeliverables deliverables={deliverables} />

          <ProjectTimeline events={timeline} />

          {/* Project conversations — the Communication Centre is the primary
              workflow (CL-5). The former free-text comment box is retired. */}
          <Card className="shadow-sm border-border" data-testid="portal-project-conversations">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessagesSquare className="h-5 w-5 text-muted-foreground" /> Conversations
              </CardTitle>
              <CardDescription>Project discussions with your delivery team.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {threads.length === 0 ? (
                <p className="text-sm text-muted-foreground italic" data-testid="portal-project-conversations-empty">
                  No conversations for this project yet.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {threads.map((t) => (
                    <li key={t.id} className="py-2.5 flex items-start justify-between gap-3" data-testid={`portal-project-thread-${t.id}`}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{t.subject}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {t.topic} · {t.messageCount} message{t.messageCount === 1 ? "" : "s"}
                        </div>
                      </div>
                      <Badge variant="outline" className="shrink-0 bg-muted text-muted-foreground border-border">
                        {t.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={onOpenMessages}
                data-testid="portal-project-open-messages"
              >
                <MessagesSquare className="h-4 w-4 mr-2" /> Open Messages
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <ProjectContacts />
          <AssignedCrew crew={mappedCrew} />
          <NextVisit
            date={job.status !== "Completed" ? job.startAt : undefined}
            timeWindow="08:00 - 16:00"
            crewSize={job.crewCount}
            notes="Please ensure site access is clear before arrival."
          />
        </div>
      </div>
    </div>
  );
}

function SummaryField({
  icon: Icon,
  label,
  value,
  testid,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  testid: string;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{label}</span>
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <span className="text-foreground font-medium" data-testid={testid}>{value}</span>
      </div>
    </div>
  );
}
