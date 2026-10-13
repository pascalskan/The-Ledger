// Warms every lazy route chunk in the background so the first visit to a page
// doesn't flash the loading placeholder. The page chunks are ~2.5 MB in total,
// small enough to fetch during idle time while the visitor is on /auth.
// Vite dedupes these with the lazy() imports in App.tsx, so nothing loads twice.
// Keep in sync with the lazy() list in App.tsx.
const loaders: Array<() => Promise<unknown>> = [
  () => import("@/pages/dashboard"),
  () => import("@/pages/worker/home"),
  () => import("@/pages/portal"),
  () => import("@/pages/jobs"),
  () => import("@/pages/clients"),
  () => import("@/pages/finance-hub"),
  () => import("@/pages/intelligence-hub"),
  () => import("@/pages/operations-hub"),
  () => import("@/pages/job-detail"),
  () => import("@/pages/client-detail"),
  () => import("@/pages/client-requests"),
  () => import("@/pages/invoice-detail"),
  () => import("@/pages/expenses"),
  () => import("@/pages/schedule"),
  () => import("@/pages/workers"),
  () => import("@/pages/worker-detail"),
  () => import("@/pages/equipment"),
  () => import("@/pages/equipment-detail"),
  () => import("@/pages/map"),
  () => import("@/pages/audit"),
  () => import("@/pages/settings"),
  () => import("@/pages/settings/accounting"),
  () => import("@/pages/integrations"),
  () => import("@/pages/roles"),
  () => import("@/pages/qa"),
  () => import("@/pages/review"),
  () => import("@/pages/review-detail"),
  () => import("@/pages/stock-detail"),
  () => import("@/pages/asset-detail"),
  () => import("@/pages/location-detail"),
  () => import("@/pages/worker/jobs"),
  () => import("@/pages/worker/job-detail"),
  () => import("@/pages/worker/report"),
  () => import("@/pages/worker/schedule"),
  () => import("@/pages/worker/uploads"),
  () => import("@/pages/worker/profile"),
  () => import("@/pages/worker/history"),
  () => import("@/pages/job-intelligence"),
  () => import("@/pages/automations"),
  () => import("@/pages/automation-governance"),
  () => import("@/pages/notification-center"),
  () => import("@/pages/event-monitor"),
  () => import("@/pages/workflows"),
];

export function preloadRoutes(): void {
  const idle: (cb: () => void) => void =
    typeof window !== "undefined" && "requestIdleCallback" in window
      ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 2000 })
      : (cb) => setTimeout(cb, 200);

  let i = 0;
  const next = () => {
    // A few at a time so we never compete with what the visitor is doing.
    const batch = loaders.slice(i, i + 3);
    i += 3;
    Promise.allSettled(batch.map((load) => load())).then(() => {
      if (i < loaders.length) idle(next);
    });
  };
  idle(next);
}
