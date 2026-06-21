import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useAuth, DEMO_COMPANY_ID, useStore } from "@/lib/mockData";
import { LogOut, Briefcase, Building2, Shield } from "lucide-react";
import { useLocation } from "wouter";

export default function WorkerProfilePage() {
  const { user, logout } = useAuth();
  const { jobs } = useStore();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/auth");
  };

  const myJobs = jobs.filter((j) => j.assignedWorkerIds.includes(user?.id ?? ""));
  const activeJobCount = myJobs.filter((j) => j.status === "Active").length;

  const companyName =
    user?.companyId === DEMO_COMPANY_ID ? "Demo Operations Ltd" : (user?.companyId ?? "—");

  const roleName = user?.roleIds?.some((r) => r.includes("worker"))
    ? "Field Worker"
    : "Worker";

  return (
    <WorkerMobileLayout title="Profile">
      <div className="p-4 space-y-4">

        {/* Identity Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-2xl font-bold shrink-0">
              {user?.name.charAt(0) ?? "W"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{user?.name}</h2>
              <p className="text-slate-500 text-sm truncate">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div className="flex items-center gap-3 text-sm pt-3">
              <Shield className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500">Role</span>
              <span className="ml-auto font-semibold text-slate-800">{roleName}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500">Company</span>
              <span className="ml-auto font-semibold text-slate-800 truncate max-w-[160px]">
                {companyName}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-slate-500">Jobs</span>
              <span className="ml-auto font-semibold text-slate-800">
                {activeJobCount} active · {myJobs.length} total
              </span>
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
