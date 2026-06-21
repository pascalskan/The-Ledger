import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase, Users, Calendar, MapPin, ArrowLeft, UserCog, MessageSquare, Send, UserCircle, Building2, CalendarClock, Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  projectMilestones,
  projectDeliverables,
  projectTimeline,
  computeProjectProgress,
  type PortalJob,
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
  onOpenJob: (job: PortalJob) => void;
  onBack: () => void;
}

export function PortalJobs({ jobs, selectedJob, onOpenJob, onBack }: PortalJobsProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [newComment, setNewComment] = useState("");

  if (selectedJob) {
    return <PortalJobDetail job={selectedJob} onBack={onBack} newComment={newComment} setNewComment={setNewComment} toast={toast} />;
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Your Projects</h1>
          <p className="text-slate-500 mt-1">Track progress and crew across your jobs.</p>
        </div>
        <div className="inline-flex rounded-md border border-slate-200 bg-white p-1" data-testid="portal-jobs-filter">
          {(["all", "active", "completed"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-sm capitalize transition ${filter === f ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
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
            className="cursor-pointer border-slate-200 hover:border-slate-400 hover:shadow-md transition-all group"
            onClick={() => onOpenJob(job)}
            data-testid={`portal-job-card-${job.id}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Badge variant="outline" className={`mb-2 font-normal ${job.status === "Completed" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                    {job.status}
                  </Badge>
                  <CardTitle className="text-lg text-slate-800">{job.title}</CardTitle>
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
                {job.managerName && (
                  <div className="flex items-center gap-2 text-slate-600" data-testid={`portal-job-pm-${job.id}`}>
                    <UserCog className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="truncate">PM: {job.managerName}</span>
                  </div>
                )}
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

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-lg bg-white" data-testid="portal-jobs-empty">
            <Briefcase className="h-8 w-8 mx-auto text-slate-400 mb-3" />
            <h3 className="text-lg font-medium text-slate-800">No projects found</h3>
            <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">There are no projects matching this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PortalJobDetail({
  job,
  onBack,
  newComment,
  setNewComment,
  toast,
}: {
  job: PortalJob;
  onBack: () => void;
  newComment: string;
  setNewComment: (v: string) => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [comments, setComments] = useState<{ author: string; text: string; date: string }[]>([]);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setComments((prev) => [...prev, { author: "You", text: newComment, date: new Date().toISOString() }]);
    setNewComment("");
    toast({ title: "Message sent", description: "Your message has been shared with the project team." });
  };

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
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 text-slate-500 hover:text-slate-900" data-testid="portal-back-to-projects">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="outline" className={`font-normal ${job.status === "Completed" ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
            {job.status}
          </Badge>
          <span className="text-sm font-mono text-slate-500">{job.jobId}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{job.title}</h1>
      </div>

      <ProjectProgress status={job.status} />

      {/* Project Summary */}
      <Card className="shadow-sm border-slate-200" data-testid="portal-project-summary">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg">Project Summary</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-4 text-sm">
          <p className="text-slate-700 leading-relaxed text-base">{job.description}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4 border-t border-slate-100">
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

          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-500" /> Messages
              </CardTitle>
              <CardDescription>Leave a message for the project team. (Structured requests arrive soon.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-5 max-h-[320px] overflow-y-auto pr-2">
                <div className="flex gap-3">
                  <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                    <UserCircle className="h-5 w-5" />
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none p-4 text-sm flex-1">
                    <div className="font-medium mb-1.5 text-slate-800">Project Manager</div>
                    <p className="text-slate-700 leading-relaxed">Hi, let us know if you have any questions about the works.</p>
                  </div>
                </div>
                {comments.map((c, i) => (
                  <div key={i} className="flex gap-3 flex-row-reverse">
                    <div className="h-9 w-9 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 font-bold text-xs">YOU</div>
                    <div className="bg-white border border-slate-200 rounded-xl rounded-tr-none p-4 text-sm flex-1">
                      <p className="text-slate-700 leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-5 border-t border-slate-100">
                <Input
                  placeholder="Type a message..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
                  className="bg-slate-50 border-slate-200"
                />
                <Button onClick={handleAddComment} size="icon" className="shrink-0 bg-slate-800 hover:bg-slate-700 text-white">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
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
      <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</span>
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
        <span className="text-slate-800 font-medium" data-testid={testid}>{value}</span>
      </div>
    </div>
  );
}
