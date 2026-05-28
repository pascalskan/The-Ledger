import { useState } from "react";

// Mock implementation of a local first worker store
export interface Shift {
  jobId: string;
  startTime: string;
  endTime?: string;
  status: "Active" | "Completed";
}

export interface SyncItem {
  id: string;
  type: "TimeLog" | "PhotoUpload";
  data: any;
  timestamp: string;
}

// Global state for mockup
let isOnline = true;
let pendingSyncItems: SyncItem[] = [];
let activeShifts: Shift[] = [];

export const useWorkerStore = () => {
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  const toggleOnline = () => {
    isOnline = !isOnline;
    refresh();
  };

  const addPendingSync = (type: "TimeLog" | "PhotoUpload", data: any) => {
    pendingSyncItems.push({
      id: Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: new Date().toISOString(),
    });
    refresh();
  };

  const clearSyncQueue = () => {
    pendingSyncItems = [];
    refresh();
  };

  const startShift = (jobId: string) => {
    activeShifts.push({
      jobId,
      startTime: new Date().toISOString(),
      status: "Active",
    });
    refresh();
  };

  const endShift = (jobId: string) => {
    const shift = activeShifts.find((s) => s.jobId === jobId && s.status === "Active");
    if (shift) {
      shift.endTime = new Date().toISOString();
      shift.status = "Completed";
      if (!isOnline) {
        addPendingSync("TimeLog", { ...shift });
      }
      refresh();
    }
  };

  const getActiveShift = (jobId: string) => {
    return activeShifts.find((s) => s.jobId === jobId && s.status === "Active");
  };

  return {
    isOnline,
    toggleOnline,
    pendingSyncCount: pendingSyncItems.length,
    addPendingSync,
    clearSyncQueue,
    startShift,
    endShift,
    getActiveShift,
  };
};