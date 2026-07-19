// ---------------------------------------------------------------------------
// CLIENT PORTAL — BRANDING CONFIG (CL-3, white-label preparation)
//
// The portal shell consumes this config so the customer-facing surface can be
// re-skinned per platform company in a future phase. Mock data only for now —
// a single default config. CL-7+ may resolve this per company/tenant.
// ---------------------------------------------------------------------------

export interface PortalBrandingConfig {
  companyName: string;
  /** Logo URL (optional — shell falls back to the shield mark + name). */
  logo?: string;
  supportEmail: string;
  supportPhone: string;
  // CL-6 — financial pages surface a dedicated accounts/payments contact.
  accountsEmail: string;
  paymentsPhone: string;
  paymentContactName: string;
}

const DEFAULT_BRANDING: PortalBrandingConfig = {
  companyName: "The Ledger Portal",
  logo: undefined,
  supportEmail: "support@theledger.app",
  supportPhone: "0800 123 4567",
  accountsEmail: "accounts@theledger.app",
  paymentsPhone: "0800 123 4568",
  paymentContactName: "Accounts Team",
};

/**
 * Resolve the branding config for the portal shell. `clientId` is accepted for
 * forward-compatibility (per-tenant branding) but currently returns the
 * default mock config.
 */
export function getPortalBranding(_clientId?: string): PortalBrandingConfig {
  return { ...DEFAULT_BRANDING };
}
