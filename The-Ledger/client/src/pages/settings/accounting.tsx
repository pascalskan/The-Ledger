// ======================================================
// PHASE 5.7 — ACCOUNTING SETTINGS (redirect wrapper)
//
// The full Accounting Settings page now lives at:
//   /accounting-settings  →  pages/accounting-settings.tsx
//
// This file re-exports it so that the existing route
// /settings/integrations/accounting continues to work.
// ======================================================

export { default } from "../accounting-settings";
