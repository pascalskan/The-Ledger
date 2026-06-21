import { WorkerMobileLayout } from "@/components/WorkerMobileLayout";
import { useOfflineQueueStore } from "@/lib/offlineQueueStore";
import { useState } from "react";

import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  Trash2,
  X,
  ImageIcon,
  RefreshCw,
  AlertTriangle,
  Clock,
  FileText,
  Receipt,
} from "lucide-react";

// Human label + icon for each worker submission type carried on a queue item.
// All worker submissions ride a single queue (WK-3), so the surface must name
// the real submission rather than the legacy hardcoded "Worker Report".
function describeSubmission(payload: any): { label: string; Icon: any } {
  const type = payload?.type;
  if (type === "issue-log") return { label: payload?.title || "Issue", Icon: AlertTriangle };
  if (type === "timesheet") return { label: payload?.title || "Timesheet", Icon: Clock };
  if (payload?.uploads?.length && !payload?.notes && !payload?.materialsUsed?.length) {
    return { label: payload?.title || "Photo Upload", Icon: ImageIcon };
  }
  if (payload?.expenses?.length) return { label: payload?.title || "Report (with expenses)", Icon: Receipt };
  return { label: payload?.title || "Worker Report", Icon: FileText };
}

export default function WorkerUploadsPage() {
  const {
    isOffline,
    queue,
    clearSyncedItems,
    syncQueue,
    retryUpload,
    retryQueueItem,
    removeUpload,
    markQueueItemUnderReview,
    markQueueItemResubmitted,
  } = useOfflineQueueStore();

  // Aggregate queue health so the worker immediately knows what is waiting,
  // syncing, delivered, or needs action — the WK-4 sync-confidence requirement.
  const counts = {
    pending: queue.filter((i) => i.syncStatus === "pending").length,
    syncing: queue.filter((i) => i.syncStatus === "syncing").length,
    synced: queue.filter((i) => i.syncStatus === "synced").length,
    failed: queue.filter((i) => i.syncStatus === "failed").length,
    attention: queue.filter(
      (i) => i.syncStatus === "failed" || i.syncStatus === "conflict"
    ).length,
  };

  const [previewUpload, setPreviewUpload] =
    useState<any | null>(null);

  const [pendingDelete, setPendingDelete] =
    useState<{
      queueItemId: string;
      uploadId: string;
    } | null>(null);

  const [selectedConflict, setSelectedConflict] =
    useState<any | null>(null);

  const [correctionNotes, setCorrectionNotes] =
    useState("");

  return (
    <WorkerMobileLayout title="Uploads">
      <div className="p-4 space-y-6">

        {/* ============================================ */}
        {/* SYNC STATUS CARD */}
        {/* ============================================ */}

        <div data-testid="worker-sync-status" className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold">
                Sync Status
              </h2>

              <p className="text-slate-500 text-sm">
                Manage your offline data
              </p>
            </div>
          </div>

          {!isOffline ? (
            <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />

              <div>
                <p className="font-semibold text-sm">
                  Online & Synced
                </p>

                <p className="text-xs mt-1 opacity-80">
                  All operational data is backed up.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 text-orange-700 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />

              <div>
                <p className="font-semibold text-sm">
                  Offline Mode Active
                </p>

                <p className="text-xs mt-1 opacity-80">
                  {queue.length} item(s) waiting to upload.
                  They will sync automatically when you reconnect.
                </p>
              </div>
            </div>
          )}

          {/* Queue health summary — pending / syncing / synced / action needed */}
          {queue.length > 0 && (
            <div data-testid="worker-queue-summary" className="grid grid-cols-4 gap-2 mt-4">
              {[
                { key: "pending", label: "Pending", value: counts.pending, cls: "bg-orange-50 text-orange-700" },
                { key: "syncing", label: "Syncing", value: counts.syncing, cls: "bg-blue-50 text-blue-700" },
                { key: "synced", label: "Synced", value: counts.synced, cls: "bg-green-50 text-green-700" },
                { key: "failed", label: "Action", value: counts.attention, cls: "bg-red-50 text-red-700" },
              ].map((c) => (
                <div key={c.key} className={`rounded-xl p-3 text-center ${c.cls}`}>
                  <div className="text-lg font-bold leading-none">{c.value}</div>
                  <div className="text-[10px] font-medium mt-1 uppercase tracking-wide">{c.label}</div>
                </div>
              ))}
            </div>
          )}

          {queue.length > 0 && !isOffline && (
            <button
              data-testid="worker-force-sync-btn"
              onClick={syncQueue}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-semibold text-sm transition-colors"
            >
              Force Sync Now
            </button>
          )}

          {queue.length > 0 && (
            <button
              onClick={clearSyncedItems}
              className="w-full mt-3 border border-slate-200 hover:bg-slate-50 rounded-xl py-3 font-semibold text-sm transition-colors"
            >
              Clear Synced Items
            </button>
          )}
        </div>

        {/* ============================================ */}
        {/* QUEUE ITEMS */}
        {/* ============================================ */}

        {queue.map((item) => {
          const { label, Icon } = describeSubmission(item.payload);
          return (
          <div
            key={item.id}
            data-testid="worker-queue-item"
            data-sync-status={item.syncStatus}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4"
          >

            {/* ============================================ */}
            {/* SUBMISSION STATUS */}
            {/* ============================================ */}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {label}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(
                      item.createdAt
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              <div
                data-testid="worker-queue-item-status"
                className={`
                  px-3 py-1 rounded-full text-xs font-semibold capitalize
                  ${
                    item.syncStatus === "synced"
                      ? "bg-green-100 text-green-700"
                      : item.syncStatus === "syncing"
                      ? "bg-blue-100 text-blue-700"
                      : item.syncStatus === "conflict"
                      ? "bg-yellow-100 text-yellow-700"
                      : item.syncStatus === "under_review"
                      ? "bg-purple-100 text-purple-700"
                      : item.syncStatus === "resubmitted"
                      ? "bg-indigo-100 text-indigo-700"
                      : item.syncStatus === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-orange-100 text-orange-700"
                  }
                `}
              >
                {item.syncStatus}
              </div>

            </div>

            {/* ============================================ */}
            {/* QUEUE-ITEM FAILED STATE — worker resolution */}
            {/* ============================================ */}

            {item.syncStatus === "failed" && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Sync failed — your work is still saved
                    </p>
                    <p className="text-xs text-red-700 mt-1 leading-relaxed">
                      {item.errorMessage ||
                        "The submission could not be delivered to the Review Centre."}{" "}
                      It remains stored on this device. Tap retry to try again.
                    </p>
                  </div>
                </div>
                <button
                  data-testid="worker-queue-retry-btn"
                  onClick={() => retryQueueItem(item.id)}
                  className="w-full rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
                </button>
              </div>
            )}
              {item.syncStatus ===
              "conflict" && (

              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">

                <p className="text-sm font-semibold text-yellow-800">
                  Operational Replay Conflict
                </p>

                <p className="text-xs text-yellow-700 leading-relaxed">
                  {item.conflictReason ||
                    "Replay ambiguity detected during synchronization."}
                </p>

                <div className="flex items-center gap-2 pt-2">

                  <div className="w-2 h-2 rounded-full bg-yellow-500" />

                  <span className="text-xs font-medium text-yellow-700">
                    Manual review required
                  </span>
                </div>
              </div>
            )}
            {/* ============================================ */}
            {/* UPLOADS */}
            {/* ============================================ */}

            {item.payload.uploads &&
              item.payload.uploads.length > 0 && (

              <div className="space-y-4">

                <div>
                  <h3 className="text-sm font-semibold">
                    Upload Attachments
                  </h3>

                  <p className="text-xs text-slate-500 mt-1">
                    Replay-safe operational evidence
                  </p>
                </div>

                {item.payload.uploads.map(
                  (upload: any) => (

                    <div
                      key={
                        upload.uploadId ||
                        upload.id
                      }
                      className="border border-slate-100 rounded-2xl overflow-hidden"
                    >

                      {/* ============================================ */}
                      {/* IMAGE PREVIEW */}
                      {/* ============================================ */}

                      <div className="relative h-44 bg-slate-100 overflow-hidden">

                        {upload.previewUrl ? (
                          <img
                            src={upload.previewUrl}
                            alt={upload.fileName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                            <ImageIcon className="w-10 h-10" />

                            <span className="text-xs font-medium">
                              No Preview Available
                            </span>
                          </div>
                        )}

                        <div className="absolute top-3 right-3 flex items-center gap-2">

                          {/* PREVIEW BUTTON */}

                          <button
                            onClick={() =>
                              setPreviewUpload(upload)
                            }
                            aria-label={`Preview ${upload.fileName || "upload"}`}
                            className="w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-sm"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* DELETE BUTTON */}

                          <button
                            onClick={() =>
                              setPendingDelete({
                                queueItemId: item.id,
                                uploadId:
                                  upload.uploadId,
                              })
                            }
                            aria-label={`Remove ${upload.fileName || "upload"}`}
                            className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">

                        {/* ============================================ */}
                        {/* HEADER */}
                        {/* ============================================ */}

                        <div className="flex items-center justify-between">

                          <div>
                            <p className="font-medium text-sm">
                              {upload.fileName ||
                                "Upload"}
                            </p>

                            <p className="text-xs text-slate-500 mt-1 capitalize">
                              {upload.category ||
                                "general"}
                            </p>
                          </div>

                          <div
                            className={`
                              px-2 py-1 rounded-full text-xs font-semibold capitalize
                              ${
                                upload.syncStatus ===
                                "uploaded"
                                  ? "bg-green-100 text-green-700"
                                  : upload.syncStatus ===
                                    "uploading"
                                  ? "bg-blue-100 text-blue-700"
                                  : upload.syncStatus ===
                                    "conflict"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : upload.syncStatus ===
                                    "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-orange-100 text-orange-700"
                              }
                            `}
                          >
                            {upload.syncStatus ||
                              "pending"}
                          </div>
                        </div>

                        {/* ============================================ */}
                        {/* PROGRESS BAR */}
                        {/* ============================================ */}

                        <div className="space-y-2">

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">
                              Upload Progress
                            </span>

                            <span className="font-medium">
                              {upload.uploadProgress || 0}%
                            </span>
                          </div>

                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">

                            <div
                              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                              style={{
                                width: `${
                                  upload.uploadProgress || 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* ============================================ */}
                        {/* FAILED STATE */}
                        {/* ============================================ */}

                        {upload.syncStatus ===
                          "failed" && (

                          <div className="space-y-3">

                            <div className="bg-red-50 text-red-600 rounded-lg p-3 text-xs">
                              Upload failed during replay.
                              Will retry automatically.
                            </div>

                            <button
                              onClick={() =>
                                retryUpload(
                                  item.id,
                                  upload.uploadId
                                )
                              }
                              className="w-full rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 transition-colors"
                            >
                              Retry Upload
                            </button>
                          </div>
                        )}
                        {upload.syncStatus ===
                          "conflict" && (

                          <div className="space-y-3">

                            <div className="bg-yellow-50 text-yellow-700 rounded-lg p-3 text-xs">

                              <p className="font-semibold mb-1">
                                Synchronization Conflict
                              </p>

                              <p>
                                {upload.conflictReason ||
                                  "Operational replay conflict detected."}
                              </p>
                            </div>

                          <div className="flex gap-2">

                            <button
                              onClick={() =>
                                setSelectedConflict({
                                  queueItemId: item.id,
                                  upload,
                                })
                              }
                              className="flex-1 rounded-lg border border-yellow-300 bg-white hover:bg-yellow-50 text-yellow-700 text-xs font-semibold py-2 transition-colors"
                            >
                              View Conflict
                            </button>

                            <button
                              onClick={() =>
                                retryUpload(
                                  item.id,
                                  upload.uploadId
                                )
                              }
                              className="flex-1 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-semibold py-2 transition-colors"
                            >
                              Retry Resolution
                            </button>
                          </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
          );
        })}

        {queue.length === 0 && (
          <div data-testid="worker-queue-empty" className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm text-center">
            <div className="w-12 h-12 mx-auto bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-800">Everything is synced</p>
            <p className="text-sm text-slate-500 mt-1">
              No submissions are waiting. Anything you log offline will appear here until it syncs.
            </p>
          </div>
        )}

        {/* ============================================ */}
        {/* PREVIEW MODAL */}
        {/* ============================================ */}

        {previewUpload && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">

            <div className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl">

              <button
                onClick={() =>
                  setPreviewUpload(null)
                }
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="bg-slate-100 max-h-[70vh] overflow-hidden">

                {previewUpload.previewUrl ? (
                  <img
                    src={previewUpload.previewUrl}
                    alt={previewUpload.fileName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="h-[400px] flex items-center justify-center text-slate-400">
                    No preview available
                  </div>
                )}
              </div>

              <div className="p-6 space-y-4">

                <div>
                  <h3 className="font-bold text-lg break-all">
                    {previewUpload.fileName}
                  </h3>

                  <p className="text-sm text-slate-500 mt-1 capitalize">
                    {previewUpload.category}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">

                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-slate-500 mb-1">
                      Upload Status
                    </p>

                    <p className="font-semibold capitalize">
                      {previewUpload.syncStatus}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <p className="text-slate-500 mb-1">
                      Upload Progress
                    </p>

                    <p className="font-semibold">
                      {previewUpload.uploadProgress || 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* DELETE CONFIRMATION */}
        {/* ============================================ */}

        {pendingDelete && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">

            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-5">

              <div>
                <h3 className="text-lg font-bold">
                  Remove Upload?
                </h3>

                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  This removes the upload from the replay queue.
                  The operational report itself will remain intact.
                </p>
              </div>

              <div className="flex gap-3">

                <button
                  onClick={() =>
                    setPendingDelete(null)
                  }
                  className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    removeUpload(
                      pendingDelete.queueItemId,
                      pendingDelete.uploadId
                    );

                    setPendingDelete(null);
                  }}
                  className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white py-3 text-sm font-semibold"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* ============================================ */}
{/* CONFLICT REVIEW MODAL */}
{/* ============================================ */}

{selectedConflict && (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">

    <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">

      {/* HEADER */}

      <div className="p-6 border-b border-slate-100">

        <div className="flex items-start justify-between gap-4">

          <div>
            <h3 className="text-xl font-bold text-slate-900">
              Operational Conflict Review
            </h3>

            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              This upload requires manual operational review before replay synchronization can continue.
            </p>
          </div>

          <button
            onClick={() =>
              setSelectedConflict(null)
            }
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* BODY */}

      <div className="p-6 space-y-5">

        <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 space-y-3">

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">
              Conflict Reason
            </p>

            <p className="text-sm text-yellow-800 mt-2 leading-relaxed">
              {selectedConflict.upload
                ?.conflictReason ||
                "Replay ambiguity detected during synchronization."}
            </p>
          </div>
        </div>

        <div className="space-y-2">

          <label className="text-sm font-semibold text-slate-700">
            Worker Correction Notes
          </label>

          <textarea
            value={correctionNotes}
            onChange={(e) =>
              setCorrectionNotes(
                e.target.value
              )
            }
            placeholder="Add operational clarification or correction notes..."
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">

          <div className="flex items-start gap-3">

            <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2 shrink-0" />

            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-800">
                Replay Governance Active
              </p>

              <p className="text-xs text-slate-500 leading-relaxed">
                Operational evidence and uploads will remain preserved during replay correction and resubmission workflows.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}

      <div className="p-6 border-t border-slate-100 flex gap-3">

        <button
          onClick={() =>
            setSelectedConflict(null)
          }
          className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>

        <button
          onClick={() => {

            markQueueItemUnderReview(
              selectedConflict.queueItemId,
              correctionNotes
            );

            setTimeout(() => {

              markQueueItemResubmitted(
                selectedConflict.queueItemId
              );

            }, 1500);

            setSelectedConflict(null);

            setCorrectionNotes("");
          }}
          className="flex-1 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white py-3 text-sm font-semibold transition-colors"
        >
          Save Correction
        </button>
      </div>
    </div>
  </div>
)}
    </WorkerMobileLayout>
  );
}