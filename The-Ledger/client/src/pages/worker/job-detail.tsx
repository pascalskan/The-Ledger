import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useStore, useAuth } from "@/lib/mockData";
import { useWorkerStore } from "@/lib/workerStore";
import { useShiftStore } from "@/lib/shiftStore";
import { useLocation, useRoute } from "wouter";
import { MapPin, Users, Truck, Clock, FileText, Camera, Upload, CheckCircle2, AlertTriangle, ArrowLeft, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function WorkerJobDetailPage() {
  const [match, params] = useRoute("/worker/jobs/:id");
  const [, setLocation] = useLocation();
  const { jobs, clients, workers, equipment } = useStore();
  const { user } = useAuth();
  const { isOnline, addPendingSync } = useWorkerStore();
  const { activeShift, elapsedTime, startShift, endShift } = useShiftStore();

  const job = jobs.find((j) => j.id === params?.id);
  const client = clients.find((c) => c.id === job?.clientId);
  
  const [activeTab, setActiveTab] = useState<"overview" | "crew" | "assets" | "docs">("overview");

  if (!job) return <WorkerMobileLayout title="Job Not Found"><div className="p-8 text-center text-slate-500">Job not found or access denied.</div></WorkerMobileLayout>;

  const assignedWorkers = workers.filter(w => job.assignedWorkerIds.includes(w.id));
  const assignedEquipment = equipment.filter(e => job.assignedEquipmentIds.includes(e.id));
  const isShiftActiveForJob = activeShift?.jobId === job.id && activeShift?.isRunning;
  
  const formatDuration = (seconds: number) => {
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / (60 * 60));
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleUploadPhoto = () => {
    // Mock photo upload
    addPendingSync("PhotoUpload", { jobId: job.id, type: "site-photo" });
    alert(isOnline ? "Photo uploaded successfully!" : "Offline mode: Photo queued for sync.");
  };

  const handleToggleShift = () => {
    if (isShiftActiveForJob) {
      endShift();
    } else {
      if (activeShift && activeShift.jobId !== job.id) {
        alert("You already have an active shift for another job. Please end it first.");
        return;
      }
      startShift(job.id, user?.id || "unknown-worker");
    }
  };

  return (
    <WorkerMobileLayout title="Job Details">
      {/* Top sticky action bar for back button */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
        <button onClick={() => setLocation("/worker/jobs")} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-sm font-semibold truncate">{job.jobId}</div>
        <Badge variant={job.status === 'Active' ? 'default' : 'secondary'} className="text-[10px]">{job.status}</Badge>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Header Section */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div>
            <h2 className="text-xl font-bold leading-tight mb-1">{job.title}</h2>
            <p className="text-primary font-medium">{client?.name}</p>
          </div>
          
          <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl text-sm">
            <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <span className="leading-snug text-slate-700">{job.locationAddress}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="text-xs text-slate-500 mb-1">Start</div>
              <div className="font-semibold text-sm">{new Date(job.startAt).toLocaleDateString()}</div>
              <div className="text-xs text-slate-600">{new Date(job.startAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="text-xs text-slate-500 mb-1">End</div>
              <div className="font-semibold text-sm">{new Date(job.endAt).toLocaleDateString()}</div>
              <div className="text-xs text-slate-600">{new Date(job.endAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
          </div>
        </section>

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
            <div className="text-4xl font-mono text-center font-bold tracking-wider mb-6 text-emerald-400">
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
          >
            {isShiftActiveForJob ? "End Shift" : "Start Shift"}
          </Button>
          {!isOnline && (
             <p className="text-center mt-3 text-xs text-slate-400 flex items-center justify-center gap-1">
               <AlertTriangle className="w-3 h-3" /> Offline: Time will sync when connected
             </p>
          )}
        </section>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-slate-100 shadow-sm active:scale-95 transition-transform"
            onClick={handleUploadPhoto}
          >
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
              <Camera className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-center leading-tight">Upload<br/>Photo</span>
          </button>
          
          <button className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-slate-100 shadow-sm active:scale-95 transition-transform">
             <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-center leading-tight">Log<br/>Issue</span>
          </button>

          <button 
            className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center gap-2 border border-slate-100 shadow-sm active:scale-95 transition-transform"
            onClick={() => params?.id && setLocation(`/worker/jobs/${params.id}/report`)}
          >
             <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-1">
              <ClipboardList className="w-5 h-5" />
            </div>
            <span className="font-semibold text-sm text-center leading-tight">Submit<br/>Report</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm overflow-x-auto hide-scrollbar">
          {(['overview', 'crew', 'assets', 'docs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 min-w-[80px] py-2 px-3 text-xs font-semibold capitalize tracking-wide rounded-lg transition-colors whitespace-nowrap",
                activeTab === tab ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm min-h-[300px]">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase text-slate-500 tracking-wider">Job Description</h4>
              <p className="text-slate-700 text-sm leading-relaxed">{job.description}</p>
            </div>
          )}

          {activeTab === 'crew' && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase text-slate-500 tracking-wider mb-2">Assigned Crew ({assignedWorkers.length})</h4>
              <div className="space-y-3">
                {assignedWorkers.map(w => (
                  <div key={w.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
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
               <h4 className="font-semibold text-sm uppercase text-slate-500 tracking-wider mb-2">Assigned Equipment ({assignedEquipment.length})</h4>
               <div className="space-y-3">
                 {assignedEquipment.map(e => (
                   <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                     <Truck className="w-5 h-5 text-slate-400 shrink-0" />
                     <div className="flex-1 min-w-0">
                       <p className="font-semibold text-sm truncate">{e.name}</p>
                       <p className="text-xs text-slate-500 truncate">{e.category}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}

          {activeTab === 'docs' && (
             <div className="space-y-4">
               <h4 className="font-semibold text-sm uppercase text-slate-500 tracking-wider mb-2">Job Documents</h4>
               <div className="space-y-3">
                 {job.documents.map(doc => (
                   <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 cursor-pointer transition-colors group">
                     <div className="flex items-center gap-3 min-w-0">
                       <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                       <p className="font-medium text-sm truncate">{doc.name}</p>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>

      </div>
    </WorkerMobileLayout>
  );
}