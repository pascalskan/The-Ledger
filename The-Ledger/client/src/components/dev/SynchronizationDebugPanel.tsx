import { useState } from "react";
import { useOfflineQueueStore } from "@/lib/offlineQueueStore";
import { useSyncEventStore } from "@/lib/syncEventStore";
import { Settings, X, RefreshCw, AlertTriangle, Database, Zap, Trash2, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SynchronizationDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    isOffline,
    setOfflineMode,
    queue,
    forceSync,
    clearQueue,
    injectFailure,
    injectConflict,
    injectUploadFailure,
    setDebugFlags,
    activeBatchCount,
    pendingBatchCount
  } = useOfflineQueueStore();

  const { events, clearEvents } = useSyncEventStore();

  if (!import.meta.env.DEV) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 p-3 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-slate-800 transition-all flex items-center justify-center"
        title="Enterprise Sync QA Panel"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  const queueStats = {
    total: queue.length,
    pending: queue.filter(q => q.syncStatus === 'pending').length,
    failed: queue.filter(q => q.syncStatus === 'failed').length,
    conflict: queue.filter(q => q.syncStatus === 'conflict').length,
    synced: queue.filter(q => q.syncStatus === 'synced').length,
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[400px] max-h-[80vh] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-sm">
      {/* Header */}
      <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold">Enterprise Sync QA</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:text-slate-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Network & Environment */}
        <section className="space-y-3">
          <h4 className="font-semibold text-slate-500 uppercase text-xs tracking-wider flex items-center gap-1"><Wifi className="w-3 h-3"/> Network State</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button 
                variant={isOffline ? "default" : "outline"} 
                size="sm" 
                onClick={() => setOfflineMode(true)}
                className={isOffline ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" : ""}
            >
                <WifiOff className="w-4 h-4 mr-2" /> Simulate Offline
            </Button>
            <Button 
                variant={!isOffline ? "default" : "outline"} 
                size="sm" 
                onClick={() => setOfflineMode(false)}
                className={!isOffline ? "bg-green-50 text-green-700 hover:bg-green-100 border-green-200" : ""}
            >
                <Wifi className="w-4 h-4 mr-2" /> Reconnect
            </Button>
          </div>
        </section>

        {/* Diagnostics */}
        <section className="space-y-3">
           <h4 className="font-semibold text-slate-500 uppercase text-xs tracking-wider flex items-center gap-1"><Zap className="w-3 h-3"/> Diagnostics</h4>
           <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded border">Queue Total: <b>{queueStats.total}</b></div>
              <div className="p-2 bg-slate-50 rounded border">Pending: <b>{queueStats.pending}</b></div>
              <div className="p-2 bg-red-50 text-red-700 rounded border border-red-100">Failed: <b>{queueStats.failed}</b></div>
              <div className="p-2 bg-yellow-50 text-yellow-700 rounded border border-yellow-100">Conflicts: <b>{queueStats.conflict}</b></div>
              <div className="p-2 bg-blue-50 text-blue-700 rounded border border-blue-100">Active Batches: <b>{activeBatchCount}</b></div>
              <div className="p-2 bg-blue-50 text-blue-700 rounded border border-blue-100">Pending Batches: <b>{pendingBatchCount}</b></div>
           </div>
        </section>

        {/* Sync Controls */}
        <section className="space-y-3">
          <h4 className="font-semibold text-slate-500 uppercase text-xs tracking-wider flex items-center gap-1"><RefreshCw className="w-3 h-3"/> Replay Controls</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="default" size="sm" onClick={forceSync} disabled={isOffline} className="bg-indigo-600 hover:bg-indigo-700">
               Force Replay
            </Button>
            <Button variant="outline" size="sm" onClick={clearQueue} className="text-red-600 hover:bg-red-50">
               <Trash2 className="w-4 h-4 mr-1" /> Clear Queue
            </Button>
          </div>
        </section>

        {/* Injection Testing */}
        <section className="space-y-3">
          <h4 className="font-semibold text-slate-500 uppercase text-xs tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Fault Injection</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer p-2 bg-slate-50 rounded border hover:bg-slate-100">
              <input type="checkbox" checked={injectFailure} onChange={(e) => setDebugFlags({ injectFailure: e.target.checked })} />
              Simulate Network Interruptions (Queue Replay)
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer p-2 bg-slate-50 rounded border hover:bg-slate-100">
              <input type="checkbox" checked={injectConflict} onChange={(e) => setDebugFlags({ injectConflict: e.target.checked })} />
              Inject Replay Conflicts
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer p-2 bg-slate-50 rounded border hover:bg-slate-100">
              <input type="checkbox" checked={injectUploadFailure} onChange={(e) => setDebugFlags({ injectUploadFailure: e.target.checked })} />
              Simulate Upload Failures/Corruption
            </label>
          </div>
        </section>

        {/* Event Logs */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
             <h4 className="font-semibold text-slate-500 uppercase text-xs tracking-wider">Recent Events ({events.length})</h4>
             <button onClick={clearEvents} className="text-xs text-slate-400 hover:text-slate-700">Clear</button>
          </div>
          <div className="bg-slate-900 text-green-400 font-mono text-[10px] p-3 rounded-lg h-48 overflow-y-auto space-y-1">
             {events.length === 0 ? (
                 <div className="text-slate-500 text-center mt-10">No events recorded</div>
             ) : (
                 events.slice(0, 50).map(evt => (
                     <div key={evt.id} className="border-b border-slate-800 pb-1">
                         <span className="text-slate-500">[{new Date(evt.timestamp).toLocaleTimeString()}]</span>{" "}
                         <span className="text-blue-400">{evt.type}</span>{" "}
                         <span className="text-slate-300">{evt.entityId.slice(0,8)}...</span>
                     </div>
                 ))
             )}
          </div>
        </section>
      </div>
    </div>
  );
}