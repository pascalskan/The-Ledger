import { ReactNode } from "react";
import { useLocation } from "wouter";
import { Home, Briefcase, CalendarDays, UploadCloud, UserCircle, Wifi, WifiOff, RefreshCw, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOfflineQueueStore } from "@/lib/offlineQueueStore";
import { useAuth } from "@/lib/mockData";

export function WorkerMobileLayout({ children, title }: { children: ReactNode, title: string }) {
  const [location, setLocation] = useLocation();
  // Consolidated onto the canonical offline queue store. The banner now toggles
  // the real offline mode and reflects the real pending-sync queue depth.
  const { isOffline, setOfflineMode, queue } = useOfflineQueueStore();
  const isOnline = !isOffline;
  const pendingSyncCount = queue.filter(
    (item) => item.syncStatus === "pending" || item.syncStatus === "failed"
  ).length;
  const toggleOnline = () => setOfflineMode(!isOffline);
  const { user } = useAuth();

  const navItems = [
    { icon: Home, label: "Home", path: "/worker/home" },
    { icon: Briefcase, label: "Jobs", path: "/worker/jobs" },
    { icon: CalendarDays, label: "Schedule", path: "/worker/schedule" },
    { icon: History, label: "Activity", path: "/worker/history" },
    { icon: UploadCloud, label: "Uploads", path: "/worker/uploads" },
    { icon: UserCircle, label: "Profile", path: "/worker/profile" },
  ];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-muted text-foreground pb-[80px]">
      {/* Offline/Sync Banner */}
      <div
        data-testid="worker-offline-banner"
        className={cn(
          "h-8 px-4 flex items-center justify-between text-xs font-medium cursor-pointer transition-colors",
          isOnline ? "bg-green-600 text-white" : "bg-red-600 text-white"
        )}
        onClick={toggleOnline}
      >
        <div className="flex items-center gap-2">
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {isOnline ? "Online" : "Offline Mode"}
        </div>
        {!isOnline && pendingSyncCount > 0 && (
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 animate-spin-slow opacity-70" />
            <span>{pendingSyncCount} pending sync</span>
          </div>
        )}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-card border-b px-4 py-4 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-bold">{title}</h1>
        {user && <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">{user.name.charAt(0)}</div>}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav
        aria-label="Worker navigation"
        className="fixed bottom-0 w-full bg-card border-t border-border flex justify-between px-1 py-2 pb-safe-area shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50"
      >
        {navItems.map((item) => {
          const isActive = location.startsWith(item.path);
          return (
            <button
              key={item.label}
              data-testid={`worker-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setLocation(item.path)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center w-full py-2 rounded-xl transition-all min-w-0",
                isActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-6 h-6 mb-1", isActive && "stroke-[2.5px]")} />
                {item.label === "Uploads" && !isOnline && pendingSyncCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                    {pendingSyncCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight truncate max-w-full px-0.5">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  );
}