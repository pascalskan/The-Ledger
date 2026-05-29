import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const SYNC_EVENT_STORAGE_KEY = "ledger-sync-events";
const MAX_EVENTS = 500;

export interface SyncEvent {
  id: string;
  timestamp: string;
  type: 
    | "queued"
    | "replay_started"
    | "upload_started"
    | "upload_progress"
    | "upload_failed"
    | "upload_conflict"
    | "queue_conflict"
    | "retry_triggered"
    | "replay_completed"
    | "hydration_restored";
  entityId: string;
  entityType: "queueItem" | "upload" | "system";
  metadata?: any;
}

interface SyncEventStore {
  events: SyncEvent[];
  addEvent: (event: Omit<SyncEvent, "id" | "timestamp">) => void;
  clearEvents: () => void;
}

export const useSyncEventStore = create<SyncEventStore>()(
  persist(
    (set) => ({
      events: [],
      addEvent: (eventPayload) =>
        set((state) => {
          const newEvent: SyncEvent = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            ...eventPayload,
          };
          
          const newEvents = [newEvent, ...state.events].slice(0, MAX_EVENTS);
          return { events: newEvents };
        }),
      clearEvents: () => set({ events: [] }),
    }),
    {
      name: SYNC_EVENT_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const logSyncEvent = (event: Omit<SyncEvent, "id" | "timestamp">) => {
  useSyncEventStore.getState().addEvent(event);
};