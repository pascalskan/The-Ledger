// ======================================================
// PHASE 5.7 — ACCOUNTING SETTINGS ENGINE
//
// Centralised settings store for provider management,
// sync policies, and entity mapping preferences.
//
// Architecture: Mock only. No backend. In-memory state
// managed via React useState at the page level; this
// module provides types, defaults, and pure helpers.
//
// Doctrine:
//   The Ledger controls synchronisation behaviour.
//   Providers are downstream consumers.
//   Settings must never bypass approval workflows.
// ======================================================

import type { AccountingProvider, EntityType } from "./accountingProviders";

// ──────────────────────────────────────────────────────
// PROVIDER CONFIGURATION
// ──────────────────────────────────────────────────────

export type ProviderStatus =
  | "connected"
  | "disconnected"
  | "requires_reconnect"
  | "disabled";

export interface ProviderConfig {
  id: AccountingProvider;
  status: ProviderStatus;
  isDefault: boolean;
  lastSync: string | null;         // ISO datetime string or null
  supportedEntities: EntityType[];
  connectedSince: string | null;   // ISO datetime string or null
}

// ──────────────────────────────────────────────────────
// SYNC POLICIES
// ──────────────────────────────────────────────────────

export type SyncMode = "automatic" | "manual";
export type RetryInterval = "15min" | "30min" | "1hr" | "4hr" | "24hr";

export interface SyncPolicy {
  mode: SyncMode;
  retryFailedSyncs: boolean;
  autoRetryInterval: RetryInterval;
  syncNotifications: boolean;
}

// ──────────────────────────────────────────────────────
// ENTITY MAPPING
// ──────────────────────────────────────────────────────

export type MappingStatus = "mapped" | "unmapped" | "partial";

export interface EntityMapping {
  entity: EntityType;
  status: MappingStatus;
  enabledProviders: AccountingProvider[];
}

// ──────────────────────────────────────────────────────
// ACCOUNTING SETTINGS ROOT
// ──────────────────────────────────────────────────────

export interface AccountingSettings {
  providers: ProviderConfig[];
  syncPolicy: SyncPolicy;
  entityMappings: EntityMapping[];
}

// ──────────────────────────────────────────────────────
// DEFAULT SETTINGS (MOCK SEED)
// ──────────────────────────────────────────────────────

export const DEFAULT_ACCOUNTING_SETTINGS: AccountingSettings = {
  providers: [
    {
      id: "quickbooks",
      status: "connected",
      isDefault: true,
      lastSync: "2026-05-31T09:14:00Z",
      supportedEntities: ["invoice", "customer", "job", "payroll"],
      connectedSince: "2026-03-01T00:00:00Z",
    },
    {
      id: "xero",
      status: "connected",
      isDefault: false,
      lastSync: "2026-05-30T22:05:00Z",
      supportedEntities: ["invoice", "customer", "payroll"],
      connectedSince: "2026-04-15T00:00:00Z",
    },
    {
      id: "freshbooks",
      status: "disconnected",
      isDefault: false,
      lastSync: null,
      supportedEntities: ["invoice", "customer"],
      connectedSince: null,
    },
    {
      id: "zoho",
      status: "disabled",
      isDefault: false,
      lastSync: null,
      supportedEntities: ["invoice", "customer", "job"],
      connectedSince: null,
    },
  ],
  syncPolicy: {
    mode: "automatic",
    retryFailedSyncs: true,
    autoRetryInterval: "1hr",
    syncNotifications: true,
  },
  entityMappings: [
    {
      entity: "customer",
      status: "mapped",
      enabledProviders: ["quickbooks", "xero"],
    },
    {
      entity: "invoice",
      status: "mapped",
      enabledProviders: ["quickbooks", "xero"],
    },
    {
      entity: "payroll",
      status: "partial",
      enabledProviders: ["quickbooks"],
    },
    {
      entity: "job",
      status: "unmapped",
      enabledProviders: [],
    },
  ],
};

// ──────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────

export function getDefaultProvider(
  settings: AccountingSettings
): ProviderConfig | undefined {
  return settings.providers.find((p) => p.isDefault);
}

export function getActiveProviders(
  settings: AccountingSettings
): ProviderConfig[] {
  return settings.providers.filter(
    (p) => p.status === "connected" || p.status === "requires_reconnect"
  );
}

export function setDefaultProvider(
  settings: AccountingSettings,
  providerId: AccountingProvider
): AccountingSettings {
  return {
    ...settings,
    providers: settings.providers.map((p) => ({
      ...p,
      isDefault: p.id === providerId,
    })),
  };
}

export function setProviderStatus(
  settings: AccountingSettings,
  providerId: AccountingProvider,
  status: ProviderStatus
): AccountingSettings {
  return {
    ...settings,
    providers: settings.providers.map((p) =>
      p.id === providerId ? { ...p, status } : p
    ),
  };
}

export function updateSyncPolicy(
  settings: AccountingSettings,
  patch: Partial<SyncPolicy>
): AccountingSettings {
  return {
    ...settings,
    syncPolicy: { ...settings.syncPolicy, ...patch },
  };
}

export const PROVIDER_STATUS_LABELS: Record<ProviderStatus, string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  requires_reconnect: "Requires Reconnect",
  disabled: "Disabled",
};

export const RETRY_INTERVAL_LABELS: Record<RetryInterval, string> = {
  "15min": "Every 15 minutes",
  "30min": "Every 30 minutes",
  "1hr": "Every hour",
  "4hr": "Every 4 hours",
  "24hr": "Every 24 hours",
};

export const MAPPING_STATUS_LABELS: Record<MappingStatus, string> = {
  mapped: "Mapped",
  unmapped: "Not Mapped",
  partial: "Partial",
};
