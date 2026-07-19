// ---------------------------------------------------------------------------
// CLIENT PORTAL — ACCOUNT MODEL & AUTHENTICATION (CL-2)
//
// Doctrine: CLIENT_PORTAL_DOMAIN.md
//
// Portal authentication is SEPARATE from internal platform auth (useAuth in
// mockData.ts). A portal user is never an internal CEO/PM/Worker user and can
// never reach an internal view. This module owns:
//
//   - The PortalAccount model + seed data (multi-tenant by clientId → company)
//   - Provisioning mutators (CEO-only at the call site — gated in the UI)
//   - The portal session (localStorage, distinct key from internal auth)
//   - usePortalAuth(): sign-in / sign-out with Disabled + Pending protection
//
// Frontend-only mock. No backend, no real credentials.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { recordPortalAudit } from "@/lib/portalAudit";

export type PortalAccountStatus = "Active" | "Disabled" | "Pending";

export type PortalPermission =
  | "view_projects"
  | "view_documents"
  | "view_invoices"
  | "submit_requests";

export interface PortalAccount {
  id: string;
  clientId: string;
  email: string;
  status: PortalAccountStatus;
  createdAt: string;
  lastLoginAt?: string;
  permissions: PortalPermission[];
}

const DEFAULT_PERMISSIONS: PortalPermission[] = [
  "view_projects",
  "view_documents",
  "view_invoices",
  "submit_requests",
];

// ── Seed accounts ───────────────────────────────────────────────────────────
// A client may have MULTIPLE portal users (e.g. dc1 has two). Includes one
// Disabled and one Pending account to exercise the access-protection paths.
const portalAccounts: PortalAccount[] = [
  {
    id: "pacc-dc1-1",
    clientId: "dc1",
    email: "portal@hsslimited.co.uk",
    status: "Active",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastLoginAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    permissions: [...DEFAULT_PERMISSIONS],
  },
  {
    id: "pacc-dc1-2",
    clientId: "dc1",
    email: "sitemanager@hsslimited.co.uk",
    status: "Pending",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    permissions: [...DEFAULT_PERMISSIONS],
  },
  {
    id: "pacc-dc2-1",
    clientId: "dc2",
    email: "portal@showcasesystems.co.uk",
    status: "Active",
    createdAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    lastLoginAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    permissions: [...DEFAULT_PERMISSIONS],
  },
  {
    id: "pacc-dc2-2",
    clientId: "dc2",
    email: "former@showcasesystems.co.uk",
    status: "Disabled",
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    permissions: [...DEFAULT_PERMISSIONS],
  },
];

// ── Store accessors ─────────────────────────────────────────────────────────

export function getPortalAccounts(): PortalAccount[] {
  return [...portalAccounts];
}

export function getPortalAccountsByClient(clientId: string): PortalAccount[] {
  return portalAccounts.filter((a) => a.clientId === clientId);
}

export function findPortalAccountByEmail(email: string): PortalAccount | undefined {
  const normalised = email.trim().toLowerCase();
  return portalAccounts.find((a) => a.email.toLowerCase() === normalised);
}

export function getPortalAccountById(id: string): PortalAccount | undefined {
  return portalAccounts.find((a) => a.id === id);
}

// ── Provisioning mutators (CEO-only — gated at the UI call site) ─────────────

export interface CreatePortalAccountInput {
  clientId: string;
  email: string;
  /** Email of the CEO performing the provisioning, for the audit trail. */
  provisionedBy: string;
  status?: PortalAccountStatus;
}

export function createPortalAccount(input: CreatePortalAccountInput): PortalAccount {
  const account: PortalAccount = {
    id: `pacc-${Math.random().toString(36).slice(2, 9)}`,
    clientId: input.clientId,
    email: input.email.trim(),
    status: input.status ?? "Pending",
    createdAt: new Date().toISOString(),
    permissions: [...DEFAULT_PERMISSIONS],
  };
  portalAccounts.push(account);
  recordPortalAudit({
    type: "client_portal_provisioned",
    who: input.provisionedBy,
    what: `Provisioned portal account ${account.email}`,
    clientId: account.clientId,
    sourceObjectId: account.id,
    externalReference: account.clientId,
  });
  return account;
}

export function setPortalAccountStatus(
  id: string,
  status: PortalAccountStatus
): PortalAccount | undefined {
  const idx = portalAccounts.findIndex((a) => a.id === id);
  if (idx === -1) return undefined;
  portalAccounts[idx] = { ...portalAccounts[idx], status };
  return portalAccounts[idx];
}

export function disablePortalAccount(id: string): PortalAccount | undefined {
  return setPortalAccountStatus(id, "Disabled");
}

export function reactivatePortalAccount(id: string): PortalAccount | undefined {
  return setPortalAccountStatus(id, "Active");
}

// ── Portal session (separate from internal ledger-auth-email) ────────────────
const PORTAL_SESSION_KEY = "ledger-portal-session";

function restorePortalSession(): PortalAccount | null {
  try {
    const id = typeof localStorage !== "undefined" ? localStorage.getItem(PORTAL_SESSION_KEY) : null;
    if (!id) return null;
    const account = getPortalAccountById(id);
    // Only restore Active accounts — a session must never resurrect a
    // disabled/pending account.
    return account && account.status === "Active" ? account : null;
  } catch {
    return null;
  }
}

let currentPortalAccount: PortalAccount | null = restorePortalSession();

export type PortalSignInResult =
  | { ok: true; account: PortalAccount }
  | { ok: false; reason: "not_found" | "disabled" | "pending"; message: string };

// ── Hook ─────────────────────────────────────────────────────────────────────

export const usePortalAuth = () => {
  const [account, setAccount] = useState<PortalAccount | null>(currentPortalAccount);

  const signIn = (email: string, _password?: string): PortalSignInResult => {
    const found = findPortalAccountByEmail(email);

    if (!found) {
      return {
        ok: false,
        reason: "not_found",
        message: "No portal account found for that email address.",
      };
    }
    if (found.status === "Disabled") {
      return {
        ok: false,
        reason: "disabled",
        message: "This portal account has been disabled. Please contact your account manager.",
      };
    }
    if (found.status === "Pending") {
      return {
        ok: false,
        reason: "pending",
        message: "This portal account is pending activation. Please contact your account manager.",
      };
    }

    // Active — establish session.
    const idx = portalAccounts.findIndex((a) => a.id === found.id);
    const loggedIn: PortalAccount = { ...found, lastLoginAt: new Date().toISOString() };
    if (idx !== -1) portalAccounts[idx] = loggedIn;

    currentPortalAccount = loggedIn;
    try {
      localStorage.setItem(PORTAL_SESSION_KEY, loggedIn.id);
    } catch {
      /* ignore */
    }
    recordPortalAudit({
      type: "client_portal_login",
      who: loggedIn.email,
      what: "Client signed in to the portal",
      clientId: loggedIn.clientId,
      sourceObjectId: loggedIn.id,
      externalReference: loggedIn.clientId,
    });
    setAccount(loggedIn);
    return { ok: true, account: loggedIn };
  };

  const signOut = () => {
    if (currentPortalAccount) {
      recordPortalAudit({
        type: "client_portal_logout",
        who: currentPortalAccount.email,
        what: "Client signed out of the portal",
        clientId: currentPortalAccount.clientId,
        sourceObjectId: currentPortalAccount.id,
        externalReference: currentPortalAccount.clientId,
      });
    }
    currentPortalAccount = null;
    try {
      localStorage.removeItem(PORTAL_SESSION_KEY);
    } catch {
      /* ignore */
    }
    setAccount(null);
  };

  return { account, signIn, signOut };
};
