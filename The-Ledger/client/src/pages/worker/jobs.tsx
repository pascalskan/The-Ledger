import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useStore, useAuth } from "@/lib/mockData";
import { MapPin, Clock, ArrowRight, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

export default function WorkerJobsPage() {
  const { jobs, clients } = useStore();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const myJobs = jobs
    .filter((j) => j.assignedWorkerIds.includes(user?.id || ""))
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const activeJobs = myJobs.filter(j => j.status === "Active" || j.status === "Planned");
  const completedJobs = myJobs.filter(j => j.status === "Completed");

  return (
    <WorkerMobileLayout title="My Jobs">
      <div className="p-4 space-y-6">
        
        {/* Active Jobs */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Today / Upcoming</h2>
          <div className="space-y-4">
            {activeJobs.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">No assigned jobs right now.</p>
            )}
            {activeJobs.map(job => {
              const client = clients.find(c => c.id === job.clientId);
              return (
                <div 
                  key={job.id} 
                  className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer"
                  onClick={() => setLocation(`/worker/jobs/${job.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={job.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                      {job.status}
                    </Badge>
                    <span className="text-xs text-slate-400 font-mono">{job.jobId}</span>
                  </div>
                  
                  <h3 className="text-lg font-bold leading-tight mb-1">{job.title}</h3>
                  <p className="text-sm text-primary font-medium mb-4">{client?.name || "Unknown Client"}</p>
                  
                  <div className="space-y-2 mb-5">
                    <div className="flex items-start gap-2 text-sm text-slate-600">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-snug line-clamp-2">{job.locationAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>{new Date(job.startAt).toLocaleDateString()} at {new Date(job.startAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>

                  <button className="w-full bg-slate-900 text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2">
                    Open Job <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* Completed Jobs */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Recent History</h2>
          <div className="space-y-3">
            {completedJobs.slice(0, 3).map(job => (
              <div 
                key={job.id} 
                className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center justify-between"
                onClick={() => setLocation(`/worker/jobs/${job.id}`)}
              >
                <div>
                  <h4 className="font-semibold text-sm truncate max-w-[200px]">{job.title}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(job.startAt).toLocaleDateString()}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">Completed</Badge>
              </div>
            ))}
          </div>
        </section>

      </div>
    </WorkerMobileLayout>
  );
}