import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useStore, useAuth } from "@/lib/mockData";
import { Calendar } from "lucide-react";

export default function WorkerSchedulePage() {
  const { jobs } = useStore();
  const { user } = useAuth();

  const myJobs = jobs
    .filter((j) => j.assignedWorkerIds.includes(user?.id || ""))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  return (
    <WorkerMobileLayout title="Schedule">
      <div className="p-4 space-y-6">
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold mb-2">Upcoming Shifts</h2>
          <p className="text-slate-500 text-sm mb-6">You have {myJobs.length} scheduled jobs coming up.</p>
          <p className="text-xs text-slate-400">Full calendar view coming in the next update.</p>
        </div>
      </div>
    </WorkerMobileLayout>
  );
}