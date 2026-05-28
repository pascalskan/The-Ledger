import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useWorkerStore } from "@/lib/workerStore";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";

export default function WorkerUploadsPage() {
  const { isOnline, pendingSyncCount, clearSyncQueue } = useWorkerStore();

  return (
    <WorkerMobileLayout title="Uploads">
      <div className="p-4 space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Sync Status</h2>
              <p className="text-slate-500 text-sm">Manage your offline data</p>
            </div>
          </div>

          {isOnline ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Online & Synced</p>
                <p className="text-xs mt-1 opacity-80">All photos and time logs are backed up.</p>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 text-orange-700 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Offline Mode Active</p>
                <p className="text-xs mt-1 opacity-80">
                  {pendingSyncCount} item(s) waiting to upload. They will sync automatically when you reconnect.
                </p>
              </div>
            </div>
          )}

          {pendingSyncCount > 0 && isOnline && (
             <button 
                onClick={clearSyncQueue}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
             >
               Force Sync Now
             </button>
          )}
        </div>
      </div>
    </WorkerMobileLayout>
  );
}