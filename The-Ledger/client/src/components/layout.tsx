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
  UserCog,
  Info,
  Calendar,
  ReceiptText,
  TrendingUp,
  Zap,
  Package, Blocks,
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
  Activity,
  Radio,
  GitBranch,
  Terminal,
} from "lucide-react";
import { useAuth, DEMO_COMPANY_ID, useStore } from "@/lib/mockData";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getAllNotifications,
  markNotificationRead,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_PRIORITY_COLORS,
} from "@/lib/notificationEngine";

// ──────────────────────────────────────────────────────
// NOTIFICATION BELL COMPONENT
// ──────────────────────────────────────────────────────

function NotificationBell({ userId }: { userId: string }) {
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
    setLocation('/notifications');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="notif-bell-btn"
          variant="ghost"
          size="icon"
          className="relative text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              data-testid="notif-bell-badge"
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
// MAIN LAYOUT
// ──────────────────────────────────────────────────────

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout, user } = useAuth();
  const { roles } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar-collapsed") === "true";
  });

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

  const isCEOorPM = hasAnyRole(["CEO", "Project Manager"]);

  const NAV_ITEMS = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["CEO", "Project Manager", "Worker"] },
    { label: "Job Intelligence", href: "/job-intelligence", icon: TrendingUp, roles: ["CEO", "Project Manager"] },
    { label: "Jobs", href: "/jobs", icon: Briefcase, roles: ["CEO", "Project Manager", "Worker"] },
    { label: "Review Center", href: "/review", icon: ClipboardCheck, roles: ["CEO", "Project Manager"] },
    { label: "Clients", href: "/clients", icon: Building2, roles: ["CEO", "Project Manager"] },
    { label: "Workers", href: "/workers", icon: Users, roles: ["CEO", "Project Manager"] },
    { label: "Stock & Assets", href: "/equipment", icon: Package, Blocks, roles: ["CEO", "Project Manager"] },
    { label: "Invoices", href: "/invoices", icon: FileText, roles: ["CEO", "Project Manager"] },
    { label: "Invoice Builder", href: "/invoice-builder", icon: ReceiptText, roles: ["CEO", "Project Manager"] },
    { label: "Financial Insights", href: "/expenses", icon: ReceiptText, roles: ["CEO", "Admin", "Project Manager", "Worker"] },
    { label: "Map", href: "/map", icon: MapIcon, roles: ["CEO", "Project Manager", "Worker"] },
    { label: "Schedule", href: "/schedule", icon: Calendar, roles: ["CEO", "Project Manager", "Worker"] },
    { label: "Manage Roles", href: "/roles", icon: UserCog, roles: ["CEO", "Admin"] },
    { label: "Audit Log", href: "/audit", icon: ShieldAlert, roles: ["CEO"] },
    { label: "Financial Explorer", href: "/financial-explorer", icon: Layers, roles: ["CEO"] },
    { label: "Payroll Staging", href: "/payroll", icon: Wallet, roles: ["CEO"] },
    { label: "Payroll Export", href: "/payroll-export", icon: FileDown, roles: ["CEO"] },
    { label: "Automations", href: "/automations", icon: Zap, roles: ["CEO"] },
    { label: "Automation Governance", href: "/automation-governance", icon: ShieldCheck, roles: ["CEO"], testId: "nav-automation-governance" },
    { label: "Notifications", href: "/notifications", icon: Bell, roles: ["CEO", "Project Manager"], testId: "nav-notifications" },
    { label: "Activity Feed", href: "/activity-feed", icon: Activity, roles: ["CEO"], testId: "nav-activity-feed" },
    { label: "Event Monitor", href: "/event-monitor", icon: Radio, roles: ["CEO"], testId: "nav-event-monitor" },
    { label: "Workflow Centre", href: "/workflows", icon: GitBranch, roles: ["CEO"], testId: "nav-workflow-centre" },
    { label: "Executive Command Centre", href: "/executive-command-centre", icon: Terminal, roles: ["CEO"], testId: "nav-executive-command-centre" },
    { label: "Accounting Settings", href: "/accounting-settings", icon: Link2Icon, roles: ["CEO"] },
    { label: "Reconciliation Centre", href: "/reconciliation-center", icon: GitMerge, roles: ["CEO"], testId: "nav-reconciliation-centre" },
    { label: "Exception Resolution", href: "/exception-resolution-center", icon: TriangleAlert, roles: ["CEO"], testId: "nav-exception-resolution-centre" },
    { label: "Settings", href: "/settings", icon: Settings, roles: ["CEO"] },
  ].filter((item) => hasAnyRole(item.roles));

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

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const content = (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center px-0"
                  )}
                  data-testid={(item as any).testId}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </a>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return content;
          })}
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
        {/* data-testid="btn-sign-out" lets signOut.ts find this button whether
            the sidebar is collapsed (icon-only, no accessible name) or expanded. */}
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
          {isCEOorPM && user?.id && (
            <NotificationBell userId={user.id} />
          )}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild><Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button></SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-sidebar-border bg-sidebar text-sidebar-foreground">
               <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <main className={cn("flex-1 p-6 md:p-8 pt-20 md:pt-8 transition-all duration-300 relative", collapsed ? "md:ml-16" : "md:ml-64")}>
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
