// ======================================================
// PHASE 5.7 — ACCOUNTING SETTINGS PAGE
//
// Route: /accounting-settings  (CEO only)
// Also aliased from: /settings/integrations/accounting
//
// Provides:
//   - Provider Cards: QuickBooks, Xero, FreshBooks, Zoho
//   - Sync Policy Centre
//   - Entity Mapping Configuration
//
// All actions are mock only. No OAuth. No backend.
// ======================================================

import { useState } from "react";
import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Link2,
  Unlink,
  Star,
  StarOff,
  Ban,
  RefreshCw,
  Shield,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  WifiOff,
  Calendar,
  ArrowRight,
} from "lucide-react";
import {
  DEFAULT_ACCOUNTING_SETTINGS,
  type AccountingSettings,
  type ProviderStatus,
  type SyncMode,
  type RetryInterval,
  PROVIDER_STATUS_LABELS,
  RETRY_INTERVAL_LABELS,
  MAPPING_STATUS_LABELS,
  setDefaultProvider,
  setProviderStatus,
  updateSyncPolicy,
  getActiveProviders,
  getDefaultProvider,
} from "@/lib/accountingSettingsEngine";
import { ACCOUNTING_PROVIDERS, ENTITY_TYPE_LABELS } from "@/lib/accountingProviders";
import type { AccountingProvider } from "@/lib/accountingProviders";

// ──────────────────────────────────────────────────────
// STATUS BADGE
// ──────────────────────────────────────────────────────

function ProviderStatusBadge({ status }: { status: ProviderStatus }) {
  const configs: Record<ProviderStatus, { label: string; className: string; icon: React.ReactNode }> = {
    connected: {
      label: "Connected",
      className: "bg-green-100 text-green-800 border border-green-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    disconnected: {
      label: "Disconnected",
      className: "bg-slate-100 text-slate-700 border border-slate-200",
      icon: <WifiOff className="h-3 w-3" />,
    },
    requires_reconnect: {
      label: "Requires Reconnect",
      className: "bg-amber-100 text-amber-800 border border-amber-200",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    disabled: {
      label: "Disabled",
      className: "bg-red-50 text-red-700 border border-red-200",
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  const c = configs[status];
  return (
    <span
      data-testid={`provider-status-badge-${status}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.className}`}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

// ──────────────────────────────────────────────────────
// PROVIDER CARD
// ──────────────────────────────────────────────────────

interface ProviderCardProps {
  providerId: AccountingProvider;
  settings: AccountingSettings;
  onSetDefault: (id: AccountingProvider) => void;
  onConnect: (id: AccountingProvider) => void;
  onDisconnect: (id: AccountingProvider) => void;
  onDisable: (id: AccountingProvider) => void;
  onEnable: (id: AccountingProvider) => void;
}

function ProviderCard({
  providerId,
  settings,
  onSetDefault,
  onConnect,
  onDisconnect,
  onDisable,
  onEnable,
}: ProviderCardProps) {
  const meta = ACCOUNTING_PROVIDERS.find((p) => p.id === providerId)!;
  const config = settings.providers.find((p) => p.id === providerId)!;
  const { status, isDefault, lastSync, supportedEntities } = config;

  const isActive = status === "connected" || status === "requires_reconnect";

  return (
    <div
      data-testid={`provider-card-${providerId}`}
      className={`rounded-xl border bg-white p-5 space-y-4 transition-all ${
        status === "disabled" ? "opacity-60" : ""
      } ${isDefault ? "ring-2 ring-primary/30" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-lg ${meta.bgColor} border ${meta.borderColor} flex items-center justify-center`}
          >
            <span className={`font-bold text-base ${meta.color}`}>{meta.logoInitials}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm" data-testid={`provider-name-${providerId}`}>
                {meta.name}
              </h3>
              {isDefault && (
                <span
                  data-testid={`provider-default-indicator-${providerId}`}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary font-medium"
                >
                  <Star className="h-2.5 w-2.5" /> Default
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
          </div>
        </div>
        <ProviderStatusBadge status={status} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground mb-0.5">Last Sync</div>
          <div
            className="font-medium text-slate-700"
            data-testid={`provider-last-sync-${providerId}`}
          >
            {lastSync ? new Date(lastSync).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }) : "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground mb-0.5">Entity Support</div>
          <div
            className="font-medium text-slate-700"
            data-testid={`provider-entities-${providerId}`}
          >
            {supportedEntities.map((e) => ENTITY_TYPE_LABELS[e]).join(", ")}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t">
        {status === "disconnected" || status === "requires_reconnect" ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            data-testid={`btn-connect-${providerId}`}
            onClick={() => onConnect(providerId)}
          >
            <Link2 className="h-3 w-3 mr-1" /> Connect
          </Button>
        ) : status === "connected" ? (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            data-testid={`btn-disconnect-${providerId}`}
            onClick={() => onDisconnect(providerId)}
          >
            <Unlink className="h-3 w-3 mr-1" /> Disconnect
          </Button>
        ) : null}

        {isActive && !isDefault && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            data-testid={`btn-set-default-${providerId}`}
            onClick={() => onSetDefault(providerId)}
          >
            <Star className="h-3 w-3 mr-1" /> Set Default
          </Button>
        )}

        {status !== "disabled" ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            data-testid={`btn-disable-${providerId}`}
            onClick={() => onDisable(providerId)}
          >
            <Ban className="h-3 w-3 mr-1" /> Disable
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-green-700 hover:bg-green-50"
            data-testid={`btn-enable-${providerId}`}
            onClick={() => onEnable(providerId)}
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Enable
          </Button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────

export function AccountingSettingsContent() {
  const [settings, setSettings] = useState<AccountingSettings>(
    DEFAULT_ACCOUNTING_SETTINGS
  );
  const { toast } = useToast();

  // Provider actions
  const handleSetDefault = (id: AccountingProvider) => {
    setSettings((prev) => setDefaultProvider(prev, id));
    toast({ title: "Default provider updated", description: `${id} is now the default accounting provider.` });
  };

  const handleConnect = (id: AccountingProvider) => {
    setSettings((prev) => setProviderStatus(prev, id, "connected"));
    toast({ title: "Provider connected", description: `${id} connected (mock).` });
  };

  const handleDisconnect = (id: AccountingProvider) => {
    setSettings((prev) => {
      // If disconnecting default, clear default
      let updated = setProviderStatus(prev, id, "disconnected");
      const cfg = updated.providers.find((p) => p.id === id);
      if (cfg?.isDefault) {
        updated = { ...updated, providers: updated.providers.map((p) => ({ ...p, isDefault: false })) };
      }
      return updated;
    });
    toast({ title: "Provider disconnected", description: `${id} disconnected (mock).` });
  };

  const handleDisable = (id: AccountingProvider) => {
    setSettings((prev) => setProviderStatus(prev, id, "disabled"));
    toast({ title: "Provider disabled", description: `${id} has been disabled.` });
  };

  const handleEnable = (id: AccountingProvider) => {
    setSettings((prev) => setProviderStatus(prev, id, "disconnected"));
    toast({ title: "Provider enabled", description: `${id} re-enabled. Connect to activate.` });
  };

  // Sync policy actions
  const handlePolicyChange = (patch: Partial<typeof settings.syncPolicy>) => {
    setSettings((prev) => updateSyncPolicy(prev, patch));
  };

  const activeProviders = getActiveProviders(settings);
  const defaultProvider = getDefaultProvider(settings);

  return (
      <div data-testid="accounting-settings-page" className="space-y-8 max-w-5xl mx-auto">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Accounting Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage provider connections, synchronisation policies, and entity mapping.
          </p>
        </div>

        {/* Summary bar */}
        <div
          data-testid="accounting-settings-summary"
          className="flex flex-wrap gap-4 rounded-xl border bg-slate-50 px-5 py-4 text-sm"
        >
          <div>
            <span className="text-muted-foreground">Active providers: </span>
            <span className="font-semibold" data-testid="summary-active-count">{activeProviders.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Default: </span>
            <span className="font-semibold" data-testid="summary-default-provider">
              {defaultProvider ? defaultProvider.id : "None"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Sync mode: </span>
            <span className="font-semibold" data-testid="summary-sync-mode">
              {settings.syncPolicy.mode === "automatic" ? "Automatic" : "Manual"}
            </span>
          </div>
        </div>

        {/* ── PART 1: PROVIDER CARDS ── */}
        <section data-testid="provider-cards-section">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Link2 className="h-5 w-5 text-muted-foreground" />
            Provider Connections
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(["quickbooks", "xero", "freshbooks", "zoho"] as AccountingProvider[]).map((id) => (
              <ProviderCard
                key={id}
                providerId={id}
                settings={settings}
                onSetDefault={handleSetDefault}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onDisable={handleDisable}
                onEnable={handleEnable}
              />
            ))}
          </div>
        </section>

        {/* ── PART 2: SYNC POLICY CENTRE ── */}
        <section data-testid="sync-policy-section">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            Synchronisation Policies
          </h2>
          <Card>
            <CardContent className="pt-6 space-y-6">
              {/* Sync Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium" data-testid="policy-label-mode">Sync Mode</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatic: syncs when records are approved. Manual: sync on demand only.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    data-testid="policy-sync-mode-manual"
                    className={`text-xs ${settings.syncPolicy.mode === "manual" ? "font-semibold text-slate-800" : "text-muted-foreground"}`}
                  >
                    Manual
                  </span>
                  <Switch
                    data-testid="toggle-sync-mode"
                    checked={settings.syncPolicy.mode === "automatic"}
                    onCheckedChange={(checked) =>
                      handlePolicyChange({ mode: (checked ? "automatic" : "manual") as SyncMode })
                    }
                  />
                  <span
                    data-testid="policy-sync-mode-auto"
                    className={`text-xs ${settings.syncPolicy.mode === "automatic" ? "font-semibold text-slate-800" : "text-muted-foreground"}`}
                  >
                    Automatic
                  </span>
                </div>
              </div>

              {/* Retry Failed Syncs */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium" data-testid="policy-label-retry">Retry Failed Syncs</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automatically retry sync records that failed due to transient errors.
                  </p>
                </div>
                <Switch
                  data-testid="toggle-retry-failed"
                  checked={settings.syncPolicy.retryFailedSyncs}
                  onCheckedChange={(checked) => handlePolicyChange({ retryFailedSyncs: checked })}
                />
              </div>

              {/* Auto Retry Interval */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium" data-testid="policy-label-interval">Auto Retry Interval</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    How often to retry failed sync records.
                  </p>
                </div>
                <Select
                  value={settings.syncPolicy.autoRetryInterval}
                  onValueChange={(v) =>
                    handlePolicyChange({ autoRetryInterval: v as RetryInterval })
                  }
                >
                  <SelectTrigger
                    className="w-44 text-xs"
                    data-testid="select-retry-interval"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(RETRY_INTERVAL_LABELS) as [RetryInterval, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Sync Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-medium" data-testid="policy-label-notifications">
                    Sync Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receive notifications on sync failures and completions.
                  </p>
                </div>
                <Switch
                  data-testid="toggle-sync-notifications"
                  checked={settings.syncPolicy.syncNotifications}
                  onCheckedChange={(checked) => handlePolicyChange({ syncNotifications: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ── PART 3: ENTITY MAPPING ── */}
        <section data-testid="entity-mapping-section">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            Entity Mapping
          </h2>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mapping Configuration</CardTitle>
              <CardDescription>
                Controls which entities are synchronised to accounting providers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {settings.entityMappings.map((mapping) => {
                  const mappingStatusColors: Record<string, string> = {
                    mapped: "text-green-700 bg-green-50 border-green-200",
                    unmapped: "text-slate-600 bg-slate-50 border-slate-200",
                    partial: "text-amber-700 bg-amber-50 border-amber-200",
                  };
                  return (
                    <div
                      key={mapping.entity}
                      data-testid={`entity-mapping-row-${mapping.entity}`}
                      className="flex items-center justify-between py-3 gap-4"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {ENTITY_TYPE_LABELS[mapping.entity]}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {mapping.enabledProviders.length > 0
                            ? `Mapped to: ${mapping.enabledProviders.join(", ")}`
                            : "No provider mapping configured"}
                        </div>
                      </div>
                      <span
                        data-testid={`entity-mapping-status-${mapping.entity}`}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                          mappingStatusColors[mapping.status]
                        }`}
                      >
                        {MAPPING_STATUS_LABELS[mapping.status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
  );
}

export default function AccountingSettingsPage() {
  return <Layout><AccountingSettingsContent /></Layout>;
}
