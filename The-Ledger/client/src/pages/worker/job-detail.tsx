import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useStore, useAuth } from "@/lib/mockData";
import { useShiftStore } from "@/lib/shiftStore";
import { useOfflineQueueStore } from "@/lib/offlineQueueStore";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useRoute } from "wouter";
import { MapPin, Users, Truck, Clock, FileText, Camera, Upload, CheckCircle2, AlertTriangle, ArrowLeft, ClipboardList, X, Navigation, KeyRound, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type IssuePriority = "Low" | "Medium" | "High" | "Emergency";

export default function WorkerJobDetailPage() {
  const [match, params] = useRoute("/worker/jobs/:id");
  const [, setLocation] = useLocation();
  const { jobs, clients, workers, equipment } = useStore();
  const { user } = useAuth();
  // Single submission pipeline: everything routes through the offline queue
  // store (offline → queued + replayed; online → straight to Review Centre).
  const { isOffline, submitWorkerItem } = useOfflineQueueStore();
  const isOnline = !isOffline;
  const { activeShift, elapsedTime, startShift, endShift } = useShiftStore();
  const { toast } = useToast();

  const job = jobs.find((j) => j.id === params?.id);
  const client = clients.find((c) => c.id === job?.clientId);

  const [activeTab, setActiveTab] = useState<"overview" | "crew" | "assets" | "docs">("overview");
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueText, setIssueText] = useState("");
  const [issuePriority, setIssuePriority] = useState<IssuePriority>("Medium");

  if (!job) return <WorkerMobileLayout title="Job Not Found"><div className="p-8 text-center text-muted-foreground">Job not found or access denied.</div></WorkerMobileLayout>;

  const assignedWorkers = workers.filter(w => job.assignedWorkerIds.includes(w.id));
  const assignedEquipment = equipment.filter(e => job.assignedEquipmentIds.includes(e.id));
  const isShiftActiveForJob = activeShift?.jobId === job.id && activeShift?.isRunning;

  const formatDuration = (seconds: number) => {
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / (60 * 60));
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const notifySubmitted = (label: string, queued: boolean) => {
    toast({
      title: queued ? `${label} Queued` : `${label} Submitted`,
      description: queued
        ? "Saved locally — will sync to the Review Centre once connection is restored."
        : "Sent to the Review Centre for approval.",
    });
  };

  const handleUploadPhoto = () => {
    // Doctrine-compliant photo upload: a worker-report review item carrying a
    // single site-photo upload, submitted through the consolidated queue.
    const nowISO = new Date().toISOString();
    const reviewItem = {
      id: crypto.randomUUID(),
      type: "worker-report",
      title: "Site Photo",
      status: "pending",
      workerId: user?.id || "",
      submittedBy: user?.name || "Unknown Worker",
      submittedAt: nowISO,
      jobId: job.id,
      uploads: [
        {
          id: crypto.randomUUID(),
          uploadId: crypto.randomUUID(),
          type: "general",
          fileName: `Site Photo ${new Date().toLocaleDateString()}.jpg`,
          uploadedAt: nowISO,
          url: "mock-upload-url",
          syncStatus: isOffline ? "pending" : "uploaded",
          uploadProgress: isOffline ? 0 : 100,
          retryCount: 0,
          lastAttemptAt: nowISO,
        },
      ],
    };
    const { queued } = submitWorkerItem(reviewItem);
    notifySubmitted("Photo", queued);
  };

  const handleSubmitIssue = () => {
    if (!issueText.trim()) return;
    const reviewItem = {
      id: crypto.randomUUID(),
      type: "issue-log",
      title: `Issue Reported — ${issuePriority}`,
      status: "pending",
      workerId: user?.id || "",
      submittedBy: user?.name || "Unknown Worker",
      submittedAt: new Date().toISOString(),
      jobId: job.id,
      priority: issuePriority,
      notes: issueText.trim(),
    };
    const { queued } = submitWorkerItem(reviewItem);
    setIssueOpen(false);
    setIssueText("");
    setIssuePriority("Medium");
    notifySubmitted("Issue", queued);
  };

  const handleToggleShift = () => {
    if (isShiftActiveForJob) {
      // Capture the shift, then submit the hours as a timesheet. Hours are
      // computed from the live timer — never zero, never silently dropped.
      const ended = endShift();
      if (ended) {
        const hours = Math.round((ended.totalDurationSeconds / 3600) * 100) / 100;
        const reviewItem = {
          id: crypto.randomUUID(),
          type: "timesheet",
          title: "Shift Timesheet",
          status: "pending",
          workerId: ended.workerId || user?.id || "",
          submittedBy: user?.name || "Unknown Worker",
          submittedAt: new Date().toISOString(),
          jobId: ended.jobId,
          laborEntries: [
            {
              workerId: ended.workerId || user?.id || "",
              workerName: user?.name || "Unknown Worker",
              hours,
              shiftStart: ended.startedAt,
              shiftEnd: ended.endedAt,
            },
          ],
        };
        const { queued } = submitWorkerItem(reviewItem);
        notifySubmitted("Timesheet", queued);
      }
    } else {
      if (activeShift && activeShift.jobId !== job.id) {
        toast({
          title: "Shift Already Active",
          description: "You already have an active shift for another job. End it first.",
          variant: "destructive",
        });
        return;
      }
      startShift(job.id, user?.id || "unknown-worker");
    }
  };

  return (
    <WorkerMobileLayout title="Job Details">
      {/* Top sticky action bar for back button */}
      <div className="bg-card border-b px-4 py-2 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button onClick={() => setLocation("/worker/jobs")} aria-label="Back to my jobs" className="p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-sm font-semibold truncate">{job.jobId}</div>
        <Badge variant={job.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">{job.status}</Badge>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Header Section */}
        <section className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <div>
            <h2 className="text-xl font-bold leading-tight mb-1">{job.title}</h2>
            <p className="text-primary font-medium">{client?.name}</p>
          </div>
          
          {/* Site address — tappable, opens the device's map app for directions.
              Uses lat/lng when the job carries them (more reliable than a text
              lookup), otherwise falls back to the address string. A worker
              standing outside a site needs one tap to navigate, not an address
              to retype. */}
          <a
            href={
              job.latitude != null && job.longitude != null
                ? `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`
                : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.locationAddress)}`
            }
            target="_blank"
            rel="noopener noreferrer"
            data-testid="worker-job-directions"
            className="flex items-start gap-3 bg-muted p-3 rounded-xl text-sm active:bg-muted/70 transition-colors"
          >
            <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <span className="flex-1 leading-snug text-foreground">{job.locationAddress}</span>
            <span className="flex items-center gap-1 text-xs font-medium text-primary shrink-0 mt-0.5">
              <Navigation className="w-3.5 h-3.5" /> Directions
            </span>
          </a>

          {/* Access instructions — gate codes, parking, permit requirements.
              Present in the data model and seed but never surfaced before. */}
          {job.accessInstructions && (
            <div
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"
              data-testid="worker-job-access"
            >
              <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">Site access</p>
                <p className="mt-0.5 leading-snug text-amber-800">{job.accessInstructions}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-muted p-3 rounded-xl">
              <div className="text-xs text-muted-foreground mb-1">Start</div>
              <div className="font-semibold text-sm">{new Date(job.startAt).toLocaleDateString()}</div>
              <div className="text-xs text-muted-foreground">{new Date(job.startAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
            <div className="bg-muted p-3 rounded-xl">
              <div className="text-xs text-muted-foreground mb-1">End</div>
              <div className="font-semibold text-sm">{new Date(job.endAt).toLocaleDateString()}</div>
              <div className="text-xs text-muted-foreground">{new Date(job.endAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
          </div>
        </section>

        {/* Site & emergency contacts.
            Both lists exist in the Job model and in seed data but were never
            rendered on the worker surface — a worker on site had no way to
            reach anyone. Numbers are tel: links so one tap dials; emergency
            contacts are visually separated because they are what someone
            reaches for under pressure. */}
        {((job.siteContacts?.length ?? 0) > 0 ||
          (job.emergencyContacts?.length ?? 0) > 0) && (
          <section
            className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
            data-testid="worker-job-contacts"
          >
            {(job.siteContacts?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Phone className="h-4 w-4" /> Site contacts
                </h3>
                <div className="space-y-2">
                  {job.siteContacts!.map((c, i) => (
                    <a
                      key={`site-${i}`}
                      href={`tel:${c.phone.replace(/\s/g, "")}`}
                      data-testid={`worker-job-site-contact-${i}`}
                      className="flex items-center gap-3 rounded-xl bg-muted p-3 active:bg-muted/70 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.role}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-primary">{c.phone}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {(job.emergencyContacts?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-600">
                  <AlertTriangle className="h-4 w-4" /> Emergency
                </h3>
                <div className="space-y-2">
                  {job.emergencyContacts!.map((c, i) => (
                    <a
                      key={`emg-${i}`}
                      href={`tel:${c.phone.replace(/\s/g, "")}`}
                      data-testid={`worker-job-emergency-contact-${i}`}
                      className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 active:bg-red-100 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-red-900">{c.name}</p>
                        <p className="truncate text-xs text-red-700">{c.role}</p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-red-700">{c.phone}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Time Logging Action */}
        <section className="bg-slate-900 rounded-2xl p-5 text-white shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-300" />
              <h3 className="font-semibold text-sm tracking-wide uppercase">Time Logging</h3>
            </div>
            {isShiftActiveForJob && (
              <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/20 border-none animate-pulse">Shift Active</Badge>
            )}
          </div>
          
          {isShiftActiveForJob && (
            <div
              data-testid="worker-shift-timer"
              role="timer"
              aria-live="polite"
              aria-label={`Shift elapsed time ${formatDuration(elapsedTime)}`}
              className="text-4xl font-mono text-center font-bold tracking-wider mb-6 text-emerald-400"
            >
              {formatDuration(elapsedTime)}
            </div>
          )}

          <Button 
            size="lg" 
            className={cn(
              "w-full font-bold text-lg rounded-xl h-14", 
              isShiftActiveForJob ? "bg-red-500 hover:bg-red-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white"
            )}
            onClick={handleToggleShift}
            data-testid={isShiftActiveForJob ? "worker-end-shift-btn" : "worker-start-shift-btn"}
          >
            {isShiftActiveForJob ? "End Shift" : "Start Shift"}
          </Button>
          {!isOnline && (
             <p className="text-center mt-3 text-xs text-muted-foreground flex items-center justify-center gap-1">
               <AlertTriangle className="w-3 h-3" /> Offline: Time will sync when connected
             </p>
          )}
        </section>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-3">
          <button
            data-testid="worker-upload-photo-btn"
            className="bg-card rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-border shadow-sm active:scale-95 transition-transform"
            onClick={handleUploadPhoto}
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
              <Camera className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-center leading-tight">Upload<br/>Photo</span>
          </button>
          
          <button
            data-testid="worker-log-issue-btn"
            className="bg-card rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-border shadow-sm active:scale-95 transition-transform"
            onClick={() => setIssueOpen(true)}
          >
             <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-center leading-tight">Log<br/>Issue</span>
          </button>

          <button 
            className="bg-card rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-border shadow-sm active:scale-95 transition-transform"
            onClick={() => params?.id && setLocation(`/worker/jobs/${params.id}/report`)}
          >
             <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-1">
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-center leading-tight">Submit<br/>Report</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-card rounded-xl p-1 border border-border shadow-sm overflow-x-auto hide-scrollbar">
          {(['overview', 'crew', 'assets', 'docs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 min-w-[80px] py-2 px-3 text-xs font-semibold capitalize tracking-wide rounded-lg transition-colors whitespace-nowrap",
                activeTab === tab ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm min-h-[300px]">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">Job Description</h4>
              <p className="text-foreground text-sm leading-relaxed">{job.description}</p>
            </div>
          )}

          {activeTab === 'crew' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-2">Assigned Crew ({assignedWorkers.length})</h4>
              <div className="space-y-3">
                {assignedWorkers.map(w => (
                  <div key={w.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-muted-foreground shrink-0">
                      {w.firstName.charAt(0)}{w.lastName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{w.firstName} {w.lastName}</p>
                      {w.id === user?.id && <Badge variant="outline" className="text-[9px] mt-0.5 bg-blue-50 text-blue-600 border-blue-200">YOU</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
             <div className="space-y-4">
               <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-2">Assigned Equipment ({assignedEquipment.length})</h4>
               <div className="space-y-3">
                 {assignedEquipment.map(e => (
                   <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                     <Truck className="w-5 h-5 text-muted-foreground shrink-0" />
                     <div className="flex-1 min-w-0">
                       <p className="font-semibold text-sm truncate">{e.name}</p>
                       <p className="text-xs text-muted-foreground truncate">{e.category}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {activeTab === 'docs' && (
             <div className="space-y-4">
               <h4 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider mb-2">Job Documents</h4>
               <div className="space-y-3">
                 {job.documents.map(doc => (
                   <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-colors group">
                     <div className="flex items-center gap-3 min-w-0">
                       <FileText className="w-5 h-5 text-muted-foreground group-hover:text-blue-500 shrink-0" />
                       <p className="font-medium text-sm truncate">{doc.name}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>

      </div>

      {/* Log Issue Bottom Sheet */}
      {issueOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40" onClick={() => setIssueOpen(false)}>
          <div
            data-testid="worker-log-issue-sheet"
            className="w-full max-w-md bg-card rounded-t-3xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" /> Log Issue
              </h3>
              <button onClick={() => setIssueOpen(false)} className="p-2 -mr-2 text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</label>
              <div className="grid grid-cols-4 gap-2">
                {(["Low", "Medium", "High", "Emergency"] as IssuePriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setIssuePriority(p)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-semibold border transition-colors",
                      issuePriority === p
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-card text-muted-foreground border-border hover:border-slate-400"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
              <Textarea
                data-testid="worker-issue-text"
                placeholder="Describe the hazard, incident, or blocker..."
                className="min-h-[120px] rounded-xl resize-none"
                value={issueText}
                onChange={(e) => setIssueText(e.target.value)}
              />
            </div>

            {!isOnline && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Offline: issue will sync when reconnected.
              </p>
            )}

            <Button
              data-testid="worker-issue-submit-btn"
              size="lg"
              className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold"
              disabled={!issueText.trim()}
              onClick={handleSubmitIssue}
            >
              Submit Issue
            </Button>
          </div>
        </div>
      )}
    </WorkerMobileLayout>
  );
}