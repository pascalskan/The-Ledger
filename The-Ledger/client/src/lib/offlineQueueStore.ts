import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addReviewItemDirect } from "@/lib/mockData";
import { logSyncEvent } from "@/lib/syncEventStore";

const OFFLINE_QUEUE_STORAGE_KEY = "ledger-offline-queue";
const MAX_CONCURRENT_UPLOADS = 3;
const MAX_CONCURRENT_QUEUE_ITEMS = 2;

export interface OfflineQueueItem {
  id: string;
  type: "worker-report";
  payload: any;
  createdAt: string;
  syncStatus:
    | "pending"
    | "syncing"
    | "synced"
    | "failed"
    | "conflict"
    | "needs_correction"
    | "under_review"
    | "resubmitted";
  retryCount: number;
  lastAttemptAt?: string;
  errorMessage?: string;
  conflictReason?: string;
  conflictDetectedAt?: string;
  requiresManualReview?: boolean;
  correctionNotes?: string;
  reviewedBy?: string;
  resubmittedAt?: string;
  originalQueueItemId?: string;
}

interface OfflineQueueStore {
  isOffline: boolean;
  setOfflineMode: (offline: boolean) => void;
  queue: OfflineQueueItem[];

  // Metrics
  activeBatchCount: number;
  pendingBatchCount: number;

  addToQueue: (item: OfflineQueueItem) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItem: (id: string, updates: Partial<OfflineQueueItem>) => void;
  updateUploadState: (queueItemId: string, uploadId: string, updates: any) => void;
  retryUpload: (queueItemId: string, uploadId: string) => Promise<void>;
  clearSyncedItems: () => void;

  syncQueue: () => Promise<void>;
  processQueueBatch: (items: OfflineQueueItem[]) => Promise<void>;
  processUploadBatch: (queueItemId: string, uploads: any[]) => Promise<void>;

  removeUpload: (queueItemId: string, uploadId: string) => void;
  markQueueItemUnderReview: (queueItemId: string, correctionNotes: string) => void;
  markQueueItemResubmitted: (queueItemId: string) => void;

  // Debug Helpers
  forceSync: () => Promise<void>;
  clearQueue: () => void;
  injectFailure: boolean;
  injectConflict: boolean;
  injectUploadFailure: boolean;
  setDebugFlags: (flags: { injectFailure?: boolean, injectConflict?: boolean, injectUploadFailure?: boolean }) => void;
}

export const useOfflineQueueStore = create<OfflineQueueStore>()(
  persist(
    (set, get) => ({
      isOffline: false,
      queue: [],
      activeBatchCount: 0,
      pendingBatchCount: 0,

      injectFailure: false,
      injectConflict: false,
      injectUploadFailure: false,

      setDebugFlags: (flags) => set((state) => ({ ...state, ...flags })),

      setOfflineMode: (offline) => {
        set({ isOffline: offline });
        if (!offline) {
          setTimeout(() => {
            useOfflineQueueStore.getState().syncQueue();
          }, 500);
        }
      },

      addToQueue: (item) => {
        set((state) => ({ queue: [...state.queue, item] }));
        logSyncEvent({ type: "queued", entityId: item.id, entityType: "queueItem" });
      },

      removeFromQueue: (id) =>
        set((state) => ({
          queue: state.queue.filter((item) => item.id !== id),
        })),

      updateQueueItem: (id, updates) =>
        set((state) => ({
          queue: state.queue.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        })),

      updateUploadState: (queueItemId, uploadId, updates) =>
        set((state) => ({
          queue: state.queue.map((item) => {
            if (item.id !== queueItemId) return item;
            return {
              ...item,
              payload: {
                ...item.payload,
                uploads:
                  item.payload.uploads?.map((upload: any) => {
                    if (upload.uploadId !== uploadId) return upload;
                    return { ...upload, ...updates };
                  }) || [],
              },
            };
          }),
        })),

      retryUpload: async (queueItemId, uploadId) => {
        const state = get();
        const queueItem = state.queue.find((item) => item.id === queueItemId);
        if (!queueItem) return;
        const upload = queueItem.payload.uploads?.find((u: any) => u.uploadId === uploadId);
        if (!upload) return;

        logSyncEvent({ type: "retry_triggered", entityId: uploadId, entityType: "upload" });

        state.updateUploadState(queueItemId, uploadId, {
          syncStatus: "uploading",
          uploadProgress: 0,
          lastAttemptAt: new Date().toISOString(),
        });

        for (let progress = 0; progress <= 100; progress += 20) {
          state.updateUploadState(queueItemId, uploadId, { uploadProgress: progress });
          await new Promise((resolve) => setTimeout(resolve, 250));
        }

        // Fault injection: only trigger when the debug flag is explicitly set.
        // Random simulation is intentionally removed from the non-injected path
        // so that retryUpload is deterministically successful when flags are off.
        const didConflict = state.injectConflict;
        const didFail = state.injectUploadFailure;

        if (didConflict) {
          state.updateUploadState(queueItemId, uploadId, {
            syncStatus: "conflict",
            conflictReason: "Potential duplicate upload detected.",
            requiresManualReview: true,
            retryCount: (upload.retryCount || 0) + 1,
          });
          logSyncEvent({ type: "upload_conflict", entityId: uploadId, entityType: "upload" });
          return;
        }

        if (didFail) {
          state.updateUploadState(queueItemId, uploadId, {
            syncStatus: "failed",
            retryCount: (upload.retryCount || 0) + 1,
          });
          logSyncEvent({ type: "upload_failed", entityId: uploadId, entityType: "upload" });
          return;
        }

        state.updateUploadState(queueItemId, uploadId, {
          syncStatus: "uploaded",
          uploadProgress: 100,
        });
      },

      clearSyncedItems: () =>
        set((state) => ({
          queue: state.queue.filter((item) => item.syncStatus !== "synced"),
        })),

      processUploadBatch: async (queueItemId, uploads) => {
         const state = get();

         for (let i = 0; i < uploads.length; i += MAX_CONCURRENT_UPLOADS) {
             const batch = uploads.slice(i, i + MAX_CONCURRENT_UPLOADS);

             await Promise.all(batch.map(async (upload) => {
                 logSyncEvent({ type: "upload_started", entityId: upload.uploadId, entityType: "upload" });

                 state.updateUploadState(queueItemId, upload.uploadId, {
                    syncStatus: "uploading",
                    lastAttemptAt: new Date().toISOString(),
                  });

                  // Simulate realistic delay (500-2500ms)
                  const delay = Math.floor(Math.random() * 2000) + 500;
                  const steps = 5;
                  const stepDelay = delay / steps;

                  for (let step = 1; step <= steps; step++) {
                    const progress = (step / steps) * 100;
                    state.updateUploadState(queueItemId, upload.uploadId, { uploadProgress: progress });
                    logSyncEvent({ type: "upload_progress", entityId: upload.uploadId, entityType: "upload", metadata: { progress } });
                    await new Promise(r => setTimeout(r, stepDelay));
                  }

                  // Fault injection: only trigger when the debug flag is explicitly set.
                  // Random simulation is intentionally removed so that uploads succeed
                  // deterministically when injectUploadFailure is false.
                  const uploadShouldFail = state.injectUploadFailure;

                  if (uploadShouldFail) {
                      state.updateUploadState(queueItemId, upload.uploadId, {
                        syncStatus: "failed",
                        retryCount: (upload.retryCount || 0) + 1,
                      });
                      logSyncEvent({ type: "upload_failed", entityId: upload.uploadId, entityType: "upload" });
                  } else {
                     state.updateUploadState(queueItemId, upload.uploadId, {
                        syncStatus: "uploaded",
                        uploadProgress: 100,
                      });
                  }
             }));
         }
      },

      processQueueBatch: async (items) => {
        const state = get();

        await Promise.all(items.map(async (item) => {
            try {
                logSyncEvent({ type: "replay_started", entityId: item.id, entityType: "queueItem" });
                state.updateQueueItem(item.id, {
                  syncStatus: "syncing",
                  lastAttemptAt: new Date().toISOString(),
                });

                // Simulate realistic delay (500-2500ms)
                const delay = Math.floor(Math.random() * 2000) + 500;
                await new Promise((resolve) => setTimeout(resolve, delay));

                // Fault injection: only trigger when the debug flag is explicitly set.
                // Random simulation is intentionally removed so that queue replay
                // succeeds deterministically when both flags are false.  This
                // prevents the ~30% flake rate that existed when randomOutcome
                // thresholds were applied unconditionally.
                const didConflict = state.injectConflict;
                const shouldFail = state.injectFailure;

                if (didConflict) {
                  state.updateQueueItem(item.id, {
                    syncStatus: "conflict",
                    conflictReason: "Replay conflict detected during synchronization.",
                    conflictDetectedAt: new Date().toISOString(),
                    requiresManualReview: true,
                  });
                  logSyncEvent({ type: "queue_conflict", entityId: item.id, entityType: "queueItem" });
                  return; // continue to next item in batch
                }

                if (shouldFail) {
                  throw new Error("Network interruption during sync.");
                }

                if (item.payload.uploads && Array.isArray(item.payload.uploads)) {
                    await state.processUploadBatch(item.id, item.payload.uploads);
                }

                state.updateQueueItem(item.id, {
                  syncStatus: "synced",
                  errorMessage: undefined,
                });

                // ── Doctrine bridge ──────────────────────────────────────
                // Hand the replayed payload to the Review Center store.
                // This fulfils the Queue → Replay → Review Center chain.
                // sourceQueueId is stamped on the payload so addReviewItemDirect
                // can detect and reject duplicate replay attempts (idempotent).
                if (item.type === "worker-report" && item.payload) {
                  addReviewItemDirect({
                    ...item.payload,
                    sourceQueueId: item.id,
                  });
                }
                // ─────────────────────────────────────────────────────────

                logSyncEvent({ type: "replay_completed", entityId: item.id, entityType: "queueItem" });

            } catch (error: any) {
                state.updateQueueItem(item.id, {
                  syncStatus: "failed",
                  retryCount: item.retryCount + 1,
                  errorMessage: error?.message || "Failed to sync submission.",
                  lastAttemptAt: new Date().toISOString(),
                });
                // Failed item does not block the rest of the batch
            }
        }));
      },

      syncQueue: async () => {
        const state = get();
        if (state.isOffline) return;

        const pendingItems = state.queue.filter(
          (item) => item.syncStatus === "pending" || item.syncStatus === "failed"
        );

        if (pendingItems.length === 0) return;

        const totalBatches = Math.ceil(pendingItems.length / MAX_CONCURRENT_QUEUE_ITEMS);
        set({ pendingBatchCount: totalBatches });

        for (let i = 0; i < pendingItems.length; i += MAX_CONCURRENT_QUEUE_ITEMS) {
            set((s) => ({ activeBatchCount: s.activeBatchCount + 1 }));

            const batch = pendingItems.slice(i, i + MAX_CONCURRENT_QUEUE_ITEMS);
            await state.processQueueBatch(batch);

            set((s) => ({
                activeBatchCount: Math.max(0, s.activeBatchCount - 1),
                pendingBatchCount: Math.max(0, s.pendingBatchCount - 1)
            }));
        }
      },

      forceSync: async () => {
          await get().syncQueue();
      },

      clearQueue: () => {
          set({ queue: [] });
      },

      removeUpload: (queueItemId, uploadId) =>
        set((state) => ({
          queue: state.queue.map((item) => {
            if (item.id !== queueItemId) return item;
            return {
              ...item,
              payload: {
                ...item.payload,
                uploads: item.payload.uploads?.filter((upload: any) => upload.uploadId !== uploadId) || [],
              },
            };
          }),
        })),

      markQueueItemUnderReview: (queueItemId, correctionNotes) =>
        set((state) => ({
          queue: state.queue.map((item) => {
            if (item.id !== queueItemId) return item;
            return {
              ...item,
              syncStatus: "under_review",
              correctionNotes,
              reviewedAt: new Date().toISOString(),
              requiresManualReview: false,
            };
          }),
        })),

      markQueueItemResubmitted: (queueItemId) =>
        set((state) => ({
          queue: state.queue.map((item) => {
            if (item.id !== queueItemId) return item;
            return {
              ...item,
              syncStatus: "resubmitted",
              resubmittedAt: new Date().toISOString(),
            };
          }),
        })),
    }),
    {
      name: OFFLINE_QUEUE_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ queue: state.queue, isOffline: state.isOffline }),
      migrate: (persistedState: any) => {
        if (!persistedState?.queue) return persistedState;
        persistedState.queue = persistedState.queue.map((item: any) => {
          if (item.syncStatus === "syncing") {
            return { ...item, syncStatus: "pending" };
          }
          return item;
        });
        return persistedState;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        logSyncEvent({ type: "hydration_restored", entityId: "queue", entityType: "system" });
        const hasPending = state.queue.some(
          (item) => item.syncStatus === "pending" || item.syncStatus === "failed"
        );
        if (hasPending && !state.isOffline) {
          setTimeout(() => state.syncQueue(), 1500);
        }
      },
    }
  )
);
