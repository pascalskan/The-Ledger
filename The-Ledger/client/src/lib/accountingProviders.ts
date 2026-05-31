// ======================================================
// PHASE 5.6 — ACCOUNTING PROVIDERS
//
// Provider abstraction layer.
// No live integrations. Mock architecture only.
//
// Doctrine:
//   The Ledger is the source of operational truth.
//   Accounting systems are downstream consumers.
//   Providers define connection shape, not behaviour.
//
// Supported providers:
//   QuickBooks | Xero | FreshBooks | Zoho Books
// ======================================================

// ──────────────────────────────────────────────────────
// PROVIDER TYPES
// ──────────────────────────────────────────────────────

export type AccountingProvider =
  | "quickbooks"
  | "xero"
  | "freshbooks"
  | "zoho";

export type EntityType =
  | "invoice"
  | "payroll"
  | "customer"
  | "job";

// ──────────────────────────────────────────────────────
// PROVIDER METADATA
// ──────────────────────────────────────────────────────

export interface AccountingProviderMeta {
  id: AccountingProvider;
  name: string;
  logoInitials: string;
  color: string;         // Tailwind text colour class
  bgColor: string;       // Tailwind background colour class
  borderColor: string;   // Tailwind border colour class
  connected: boolean;    // Mock connection state
}

export const ACCOUNTING_PROVIDERS: AccountingProviderMeta[] = [
  {
    id: "quickbooks",
    name: "QuickBooks",
    logoInitials: "QB",
    color: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    connected: true,
  },
  {
    id: "xero",
    name: "Xero",
    logoInitials: "XE",
    color: "text-sky-700",
    bgColor: "bg-sky-50",
    borderColor: "border-sky-200",
    connected: true,
  },
  {
    id: "freshbooks",
    name: "FreshBooks",
    logoInitials: "FB",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    connected: false,
  },
  {
    id: "zoho",
    name: "Zoho Books",
    logoInitials: "ZB",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    connected: false,
  },
];

export const PROVIDER_LABELS: Record<AccountingProvider, string> = {
  quickbooks: "QuickBooks",
  xero: "Xero",
  freshbooks: "FreshBooks",
  zoho: "Zoho Books",
};

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  invoice: "Invoice",
  payroll: "Payroll",
  customer: "Customer",
  job: "Job",
};

// ──────────────────────────────────────────────────────
// HELPER: get provider meta by id
// ──────────────────────────────────────────────────────
export function getProviderMeta(
  provider: AccountingProvider
): AccountingProviderMeta {
  return (
    ACCOUNTING_PROVIDERS.find((p) => p.id === provider) ??
    ACCOUNTING_PROVIDERS[0]
  );
}
