import { ReactNode } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  MapPin,
  Briefcase,
  FileText,
  ReceiptText,
  MessageSquare,
  MessagesSquare,
  Bell,
  ShieldCheck,
  Building2,
  LogOut,
} from "lucide-react";
import type { PortalBrandingConfig } from "@/lib/portalBranding";
import type { PortalClient } from "@/lib/portalProjections";

export type PortalSectionKey =
  | "dashboard"
  | "sites"
  | "jobs"
  | "documents"
  | "messages"
  | "invoices"
  | "requests"
  | "notifications";

interface PortalNavItem {
  key: PortalSectionKey;
  label: string;
  path: string;
  icon: typeof LayoutDashboard;
}

export const PORTAL_NAV: PortalNavItem[] = [
  { key: "dashboard", label: "Dashboard", path: "/portal", icon: LayoutDashboard },
  { key: "sites", label: "Sites", path: "/portal/sites", icon: MapPin },
  { key: "jobs", label: "Jobs", path: "/portal/jobs", icon: Briefcase },
  { key: "documents", label: "Documents", path: "/portal/documents", icon: FileText },
  { key: "invoices", label: "Invoices", path: "/portal/invoices", icon: ReceiptText },
  // CL-8: Requests is the single client-communication destination. It hosts
  // both formal Client Requests and informal Conversations as tabs, which
  // returns the portal to the seven sections defined by
  // CLIENT_PORTAL_DOMAIN.md § Portal Navigation Structure. The `messages`
  // route remains valid for deep links into a specific conversation.
  { key: "requests", label: "Requests", path: "/portal/requests", icon: MessageSquare },
  { key: "notifications", label: "Notifications", path: "/portal/notifications", icon: Bell },
];

interface PortalShellProps {
  active: PortalSectionKey;
  branding: PortalBrandingConfig;
  client?: PortalClient;
  onSignOut: () => void;
  children: ReactNode;
}

export function PortalShell({ active, branding, client, onSignOut, children }: PortalShellProps) {
  const [, setLocation] = useLocation();

  const BrandMark = () => (
    <div className="flex items-center gap-2">
      {branding.logo ? (
        <img src={branding.logo} alt={branding.companyName} className="h-7 w-auto" data-testid="portal-brand-logo" />
      ) : (
        <ShieldCheck className="h-6 w-6 text-foreground" />
      )}
      <span className="font-bold text-base tracking-tight text-foreground" data-testid="portal-brand-name">
        {branding.companyName}
      </span>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-muted text-foreground flex flex-col" data-testid="portal-shell">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 sm:px-6 py-3 shadow-sm flex items-center justify-between">
        <BrandMark />
        <div className="flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-2 text-sm font-medium bg-muted text-foreground px-3 py-1.5 rounded-full border border-border"
            data-testid="portal-client-name"
          >
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {client?.name}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={onSignOut}
            data-testid="portal-signout"
          >
            <LogOut className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Desktop / tablet sidebar */}
        <aside
          className="hidden md:flex md:flex-col w-56 shrink-0 border-r border-border bg-white/60 py-6 px-3 gap-1"
          aria-label="Portal navigation"
          data-testid="portal-sidebar"
        >
          {PORTAL_NAV.map((item) => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setLocation(item.path)}
                aria-current={isActive ? "page" : undefined}
                data-testid={`portal-nav-${item.key}`}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-left",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}

          <div className="mt-auto pt-6 px-3 text-[11px] text-muted-foreground leading-relaxed" data-testid="portal-support">
            <div className="font-medium text-muted-foreground">Need help?</div>
            <div data-testid="portal-support-email">{branding.supportEmail}</div>
            <div data-testid="portal-support-phone">{branding.supportPhone}</div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Portal navigation"
        className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border flex justify-between px-1 py-1.5 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50"
        data-testid="portal-bottom-nav"
      >
        {PORTAL_NAV.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setLocation(item.path)}
              aria-current={isActive ? "page" : undefined}
              aria-label={item.label}
              data-testid={`portal-nav-mobile-${item.key}`}
              className={cn(
                "flex flex-col items-center justify-center flex-1 min-w-0 py-1.5 rounded-lg transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5 mb-0.5", isActive && "stroke-[2.5px]")} />
              <span className="text-[9px] font-medium tracking-tight truncate max-w-full px-0.5">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
