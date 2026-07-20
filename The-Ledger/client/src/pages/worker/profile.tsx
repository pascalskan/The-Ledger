import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useAuth, DEMO_COMPANY_ID, useStore } from "@/lib/mockData";
import { useOfflineQueueStore } from "@/lib/offlineQueueStore";
import { getWorkerActivity, summariseActivity } from "@/lib/workerActivity";
import { LogOut, Briefcase, Building2, Shield, FileText, AlertTriangle, UploadCloud, Clock, History } from "lucide-react";
import { useLocation } from "wouter";

export default function WorkerProfilePage() {
  const { user, logout } = useAuth();
  const { jobs, reviewItems } = useStore();
  const { queue } = useOfflineQueueStore();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/auth");
  };

  const myJobs = jobs.filter((j) => j.assignedWorkerIds.includes(user?.id ?? ""));
  const activeJobCount = myJobs.filter((j) => j.status === "Active").length;

  // Worker-scoped, operational activity metrics. No financial figures.
  const activity = getWorkerActivity(user?.id, reviewItems as any, queue, jobs);
  const summary = summariseActivity(activity);

  const companyName =
    user?.companyId === DEMO_COMPANY_ID ? "Demo Operations Ltd" : (user?.companyId ?? "—");

  const roleName = user?.roleIds?.some((r) => r.includes("worker"))
    ? "Field Worker"
    : "Worker";

  return (
    <WorkerMobileLayout title="Profile">
      <div className="p-4 space-y-4">

        {/* Identity Card */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
              {user?.name.charAt(0) ?? "W"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{user?.name}</h2>
              <p className="text-muted-foreground text-sm truncate">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3 pt-1 border-t border-border">
            <div className="flex items-center gap-3 text-sm pt-3">
              <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Role</span>
              <span className="ml-auto font-semibold text-foreground">{roleName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Company</span>
              <span className="ml-auto font-semibold text-foreground truncate max-w-[160px]">
                {companyName}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Jobs</span>
              <span className="ml-auto font-semibold text-foreground">
                {activeJobCount} active · {myJobs.length} total
              </span>
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div
          data-testid="worker-profile-activity-summary"
          className="bg-card rounded-2xl p-5 border border-border shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Activity Summary
            </h3>
            <button
              data-testid="worker-profile-view-activity"
              onClick={() => setLocation("/worker/history")}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <History className="w-3.5 h-3.5" /> View all
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { Icon: Briefcase, label: "Active Jobs", value: activeJobCount },
              { Icon: FileText, label: "Reports Submitted", value: summary.reports },
              { Icon: AlertTriangle, label: "Issues Logged", value: summary.issues },
              { Icon: UploadCloud, label: "Uploads Submitted", value: summary.uploads },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-muted p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-card text-muted-foreground flex items-center justify-center shrink-0 border border-border">
                  <m.Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold leading-none">{m.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 leading-tight">{m.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Snapshot */}
        <div
          data-testid="worker-profile-performance"
          className="bg-slate-900 text-white rounded-2xl p-5 shadow-md"
        >
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Performance Snapshot
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-400">{summary.totalShifts}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Total Shifts</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400 flex items-center justify-center gap-1">
                <Clock className="w-4 h-4" />
                {summary.totalHours}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">Total Hours</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{summary.reportsThisMonth}</div>
              <div className="text-[11px] text-muted-foreground mt-1">Reports / Month</div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <button
          data-testid="btn-sign-out"
          onClick={handleLogout}
          className="w-full bg-red-50 text-red-600 hover:bg-red-100 rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </WorkerMobileLayout>
  );
}
