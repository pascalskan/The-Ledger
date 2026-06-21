import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Map as MapIcon,
  ShieldAlert,
  Settings,
  LogOut,
  Menu,
  FileText,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserCog,
  Info,
  Calendar,
  ReceiptText,
  TrendingUp,
  Zap,
  Package,
  ClipboardCheck,
  Layers,
  Wallet,
  FileDown,
  Link2 as Link2Icon,
  GitMerge,
  TriangleAlert,
  ShieldCheck,
  Bell,
  ExternalLink,
  CheckCircle,
  GitBranch,
  DollarSign,
  Brain,
} from "lucide-react";
import { useAuth, DEMO_COMPANY_ID, useStore } from "@/lib/mockData";
import { isCEO, isProjectManager } from "@/lib/roleHelpers";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getAllNotifications,
  markNotificationRead,
  NOTIFICATION_TYPE_LABELS,
} from "@/lib/notificationEngine";
import { getExecutiveSummary } from "@/lib/executiveCommandEngine";

// ──────────────────────────────────────────────────────
// NOTIFICATION BELL COMPONENT
// ──────────────────────────────────────────────────────

// UX-5: "View All" is role-aware — CEO consumes notifications in the hub
// Activity tab; PM keeps the standalone Notification Centre (spec §5.3 S-3).
function NotificationBell({
  userId,
  testId = "notif-bell-btn",
  badgeTestId = "notif-bell-badge",
  viewAllHref = "/notifications",
}: {
  userId: string;
  testId?: string;
  badgeTestId?: string;
  viewAllHref?: string;
}) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => getAllNotifications());

  function refresh() {
    setNotifications(getAllNotifications());
  }

  const unreadCount = notifications.filter((n) => n.status === 'unread').length;

  const preview = [...notifications]
    .sort((a, b) => {
      if (a.status === 'unread' && b.status !== 'unread') return -1;
      if (a.status !== 'unread' && b.status === 'unread') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 5);

  function handleMarkRead(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    markNotificationRead(id, userId);
    refresh();
  }

  function handleViewAll() {
    setOpen(false);
    setLocation(viewAllHref);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid={testId}
          variant="ghost"
          size="icon"
          className="relative text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              data-testid={badgeTestId}
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-testid="notif-bell-dropdown"
        className="w-80 p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <p className="font-semibold text-sm">Notifications</p>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        <div className="divide-y max-h-80 overflow-y-auto">
          {preview.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          )}
          {preview.map((notif) => (
            <div
              key={notif.id}
              data-testid={`notif-bell-item-${notif.id}`}
              className={cn(
                "px-4 py-3 flex items-start gap-3",
                notif.status === 'unread' ? "bg-blue-50/60" : ""
              )}
            >
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm truncate", notif.status === 'unread' ? "font-semibold" : "")}>
                  {notif.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {NOTIFICATION_TYPE_LABELS[notif.type]}
                </p>
              </div>
              {notif.status === 'unread' && (
                <Button
                  data-testid={`notif-bell-mark-read-${notif.id}`}
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => handleMarkRead(notif.id, e)}
                  title="Mark as read"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="border-t p-3">
          <Button
            data-testid="notif-bell-view-all"
            variant="outline"
            size="sm"
            className="w-full gap-1"
            onClick={handleViewAll}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View All Notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ──────────────────────────────────────────────────────
// SYSTEM ALERT INDICATOR
// ──────────────────────────────────────────────────────

function SystemAlertIndicator() {
  const [, setLocation] = useLocation();
  const summary = getExecutiveSummary();
  const count = summary.criticalAlerts ?? 0;
  if (count === 0) return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative text-amber-600 hover:text-amber-700 hover:bg-amber-50"
      onClick={() => setLocation('/intelligence?tab=overview')}
      title={`${count} critical alert${count === 1 ? '' : 's'}`}
      aria-label="System alerts"
    >
      <TriangleAlert className="h-5 w-5" />
      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
        {count > 9 ? '9+' : count}
      </span>
    </Button>
  );
}

// ──────────────────────────────────────────────────────
// NAV SECTION LABEL
// ──────────────────────────────────────────────────────

function NavSectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="h-px bg-sidebar-border mx-2 my-2" />;
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1 mt-3 mb-1 select-none">
      {label}
    </p>
  );
}

// ──────────────────────────────────────────────────────
// NAV ITEM DEFINITION
// ──────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  testId?: string;
  badge?: number;
}

// ──────────────────────────────────────────────────────
// MAIN LAYOUT
// ──────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const { roles, reviewItems } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });
  const [adminExpanded, setAdminExpanded] = useState(false);

  const isDemo = user?.companyId === DEMO_COMPANY_ID;

  useEffect(() => {
    if (!user && location !== "/auth") {
      setLocation("/auth");
    }
  }, [user, location, setLocation]);

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  const handleLogout = () => {
    logout();
    setLocation("/auth");
  };

  const userRoleNames = (user?.roleIds || [])
    .map((rid) => roles.find((r) => r.id === rid)?.name)
    .filter(Boolean) as string[];

  const hasAnyRole = (allowed: string[]) => {
    if (!allowed.length) return true;
    return userRoleNames.some((name) => allowed.includes(name));
  };

  const userIsCEO = isCEO(user, roles);
  const userIsPM = isProjectManager(user, roles);
  const isCEOorPM = userIsCEO || userIsPM;

  const pendingReviewCount = reviewItems.filter(r => r.status === 'pending').length;

  // ── CEO NAV ───────────────────────────────────────────
  const CEO_CORE_ITEMS: NavItem[] = [
    { label: "Command", href: "/", icon: LayoutDashboard, roles: [] },
    { label: "Review", href: "/review", icon: ClipboardCheck, roles: [], testId: "nav-review", badge: pendingReviewCount },
  ];

  const CEO_OPERATIONAL_ITEMS: NavItem[] = [
    { label: "Jobs", href: "/jobs", icon: Briefcase, roles: [] },
    { label: "Schedule", href: "/schedule", icon: Calendar, roles: [] },
    { label: "Workers", href: "/workers", icon: Users, roles: [] },
    { label: "Clients", href: "/clients", icon: Building2, roles: [] },
    { label: "Map", href: "/map", icon: MapIcon, roles: [] },
    { label: "Stock & Assets", href: "/equipment", icon: Package, roles: [] },
    { label: "Job Intelligence", href: "/job-intelligence", icon: TrendingUp, roles: [] },
    { label: "Expenses", href: "/expenses", icon: ReceiptText, roles: [] },
    { label: "Finance", href: "/finance", icon: DollarSign, roles: [], testId: "nav-finance-hub" },
  ];

  const CEO_INTELLIGENCE_ITEMS: NavItem[] = [
    { label: "Intelligence", href: "/intelligence", icon: Brain, roles: [], testId: "nav-intelligence-hub" },
  ];

  const CEO_AUTOMATION_ITEMS: NavItem[] = [
    { label: "Automations", href: "/automations", icon: Zap, roles: [] },
    { label: "Workflows", href: "/workflows", icon: GitBranch, roles: [], testId: "nav-workflow-centre" },
    { label: "Automation Controls", href: "/automation-governance", icon: ShieldCheck, roles: [], testId: "nav-automation-governance" },
  ];

  const CEO_ADMIN_ITEMS: NavItem[] = [
    { label: "Manage Roles", href: "/roles", icon: UserCog, roles: [], testId: "nav-manage-roles" },
    { label: "Audit Log", href: "/audit", icon: ShieldAlert, roles: [], testId: "nav-audit-log" },
    { label: "Accounting Settings", href: "/finance?tab=accounting", icon: Link2Icon, roles: [], testId: "nav-admin-accounting-settings" },
    { label: "Settings", href: "/settings", icon: Settings, roles: [], testId: "nav-settings" },
  ];

  // ── PM NAV — purpose-built, workflow-first ────────────
  const PM_PRIMARY_ITEMS: NavItem[] = [
    { label: "Overview", href: "/", icon: LayoutDashboard, roles: [], testId: "nav-pm-overview" },
    { label: "My Jobs", href: "/jobs", icon: Briefcase, roles: [], testId: "nav-pm-jobs" },
    { label: "Reviews", href: "/review", icon: ClipboardCheck, roles: [], testId: "nav-review", badge: pendingReviewCount },
    { label: "Schedule", href: "/schedule", icon: Calendar, roles: [], testId: "nav-pm-schedule" },
    { label: "Crew", href: "/workers", icon: Users, roles: [], testId: "nav-pm-crew" },
  ];

  const PM_SECONDARY_ITEMS: NavItem[] = [
    { label: "Clients", href: "/clients", icon: Building2, roles: [], testId: "nav-pm-clients" },
    { label: "Map", href: "/map", icon: MapIcon, roles: [], testId: "nav-pm-map" },
    { label: "Stock & Assets", href: "/equipment", icon: Package, roles: [], testId: "nav-pm-stock" },
    { label: "Notifications", href: "/notifications", icon: Bell, roles: [], testId: "nav-notifications" },
    { label: "Expenses", href: "/expenses", icon: ReceiptText, roles: [], testId: "nav-pm-expenses" },
  ];

  // Legacy aliases kept so existing non-PM/CEO code paths still compile
  const CORE_ITEMS = userIsCEO ? CEO_CORE_ITEMS : [];
  const OPERATIONAL_ITEMS = userIsCEO ? CEO_OPERATIONAL_ITEMS : [];
  const INTELLIGENCE_ITEMS = userIsCEO ? CEO_INTELLIGENCE_ITEMS : [];
  const AUTOMATION_ITEMS = userIsCEO ? CEO_AUTOMATION_ITEMS : [];
  const ADMIN_ITEMS = userIsCEO ? CEO_ADMIN_ITEMS : [];

  function NavLink({ item }: { item: NavItem }) {
    const isActive = location === item.href
      || location.startsWith(item.href + "?")
      || location.startsWith(item.href + "/");
    const content = (
      <Link href={item.href}>
        <a
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && "justify-center px-0"
          )}
          data-testid={item.testId}
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="flex-1">{item.label}</span>}
          {!collapsed && item.badge != null && item.badge > 0 && (
            <span className="h-5 min-w-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          )}
          {collapsed && item.badge != null && item.badge > 0 && (
            <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500" />
          )}
        </a>
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <div className="relative">{content}</div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {item.label}{item.badge != null && item.badge > 0 ? ` (${item.badge})` : ''}
          </TooltipContent>
        </Tooltip>
      );
    }
    return content;
  }

  const SidebarContent = () => (
    <div className={cn("flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300", collapsed ? "w-16" : "w-64")}>
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between overflow-hidden">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-primary rounded-sm flex items-center justify-center font-bold text-primary-foreground">L</div>
            <h1 className="font-bold text-lg truncate">The Ledger</h1>
          </div>
        )}
        {collapsed && <div className="mx-auto h-8 w-8 bg-primary rounded-sm flex items-center justify-center font-bold text-primary-foreground">L</div>}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="hidden md:flex">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <TooltipProvider delayDuration={0}>

          {userIsPM ? (
            /* ── PM NAV — workflow-first, purpose-built ── */
            <>
              <NavSectionLabel label="Primary" collapsed={collapsed} />
              <div className="space-y-0.5">
                {PM_PRIMARY_ITEMS.map((item) => <NavLink key={item.href + item.label} item={item} />)}
              </div>
              <NavSectionLabel label="Secondary" collapsed={collapsed} />
              <div className="space-y-0.5">
                {PM_SECONDARY_ITEMS.map((item) => <NavLink key={item.href + item.label} item={item} />)}
              </div>
            </>
          ) : (
            /* ── CEO NAV ── */
            <>
              {CORE_ITEMS.length > 0 && (
                <>
                  <NavSectionLabel label="Core" collapsed={collapsed} />
                  <div className="space-y-0.5">
                    {CORE_ITEMS.map((item) => <NavLink key={item.href} item={item} />)}
                  </div>
                </>
              )}

              {OPERATIONAL_ITEMS.length > 0 && (
                <>
                  <NavSectionLabel label="Operational" collapsed={collapsed} />
                  <div className="space-y-0.5">
                    {OPERATIONAL_ITEMS.map((item) => <NavLink key={item.href} item={item} />)}
                  </div>
                </>
              )}

              {INTELLIGENCE_ITEMS.length > 0 && (
                <>
                  <NavSectionLabel label="Intelligence" collapsed={collapsed} />
                  <div className="space-y-0.5">
                    {INTELLIGENCE_ITEMS.map((item) => <NavLink key={item.href} item={item} />)}
                  </div>
                </>
              )}

              {AUTOMATION_ITEMS.length > 0 && (
                <>
                  <NavSectionLabel label="Automation" collapsed={collapsed} />
                  <div className="space-y-0.5">
                    {AUTOMATION_ITEMS.map((item) => <NavLink key={item.href} item={item} />)}
                  </div>
                </>
              )}

              {ADMIN_ITEMS.length > 0 && (
                <>
                  <NavSectionLabel label="Administration" collapsed={collapsed} />
                  {collapsed ? (
                    <div className="space-y-0.5">
                      {ADMIN_ITEMS.map((item) => <NavLink key={item.href} item={item} />)}
                    </div>
                  ) : (
                    <Collapsible open={adminExpanded} onOpenChange={setAdminExpanded}>
                      <CollapsibleTrigger asChild>
                        <button data-testid="nav-admin-toggle" className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors">
                          <Settings className="h-5 w-5 flex-shrink-0" />
                          <span className="flex-1 text-left">Administration</span>
                          <ChevronDown className={cn("h-4 w-4 transition-transform", adminExpanded && "rotate-180")} />
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-0.5 ml-2 border-l border-sidebar-border pl-2 mt-1">
                          {ADMIN_ITEMS.map((item) => <NavLink key={item.href} item={item} />)}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              )}
            </>
          )}

        </TooltipProvider>
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-sidebar-accent/10">
        <div className={cn("flex items-center gap-3 mb-3", collapsed && "justify-center")}>
          <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold border border-sidebar-border">
            {user?.name?.charAt(0) || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate" data-testid="text-sidebar-user-name">{user?.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate" data-testid="text-sidebar-user-roles">
                {userRoleNames.length ? userRoleNames.join(", ") : "No roles"}
              </p>
            </div>
          )}
        </div>
        <Button
          data-testid="btn-sign-out"
          variant="outline"
          className={cn("w-full justify-start", collapsed && "justify-center p-0")}
          onClick={handleLogout}
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:block fixed inset-y-0 z-50">
        <SidebarContent />
      </aside>
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar z-50 flex items-center px-4 justify-between border-b border-sidebar-border">
        <div className="flex items-center gap-2 text-sidebar-foreground font-bold">
          <div className="h-6 w-6 bg-primary rounded-sm flex items-center justify-center text-primary-foreground text-xs">L</div>
          The Ledger
        </div>
        <div className="flex items-center gap-1">
          {isCEOorPM && <SystemAlertIndicator />}
          {isCEOorPM && user?.id && (
            <NotificationBell
              userId={user.id}
              viewAllHref={hasAnyRole(["CEO"]) ? "/intelligence?tab=activity" : "/notifications"}
            />
          )}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-sidebar-border bg-sidebar text-sidebar-foreground">
               <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop header bar */}
      <div className={cn(
        "hidden md:flex fixed top-0 right-0 h-16 z-40 items-center justify-end px-6 gap-2 border-b bg-background/95 backdrop-blur",
        collapsed ? "left-16" : "left-64"
      )}>
        {isCEOorPM && <SystemAlertIndicator />}
        {isCEOorPM && user?.id && (
          <NotificationBell
            userId={user.id}
            testId="notif-bell-btn-desktop"
            badgeTestId="notif-bell-badge-desktop"
            viewAllHref={hasAnyRole(["CEO"]) ? "/intelligence?tab=activity" : "/notifications"}
          />
        )}
      </div>

      <main className={cn("flex-1 p-6 md:p-8 pt-20 md:pt-24 transition-all duration-300 relative", collapsed ? "md:ml-16" : "md:ml-64")}>
        {isDemo && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6 flex items-center gap-3 text-blue-700 dark:text-blue-300">
            <Info className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold">Example Business — Demo Data</p>
              <p className="text-xs opacity-90">You are viewing a demonstration environment. Changes made here will not affect real business data.</p>
            </div>
          </div>
        )}
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
