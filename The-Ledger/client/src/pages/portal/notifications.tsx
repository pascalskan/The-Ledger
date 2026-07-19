import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, FileText, ReceiptText, MessageSquare, Bell } from "lucide-react";
import type { PortalActivityItem } from "@/lib/portalActivity";

const ICON = {
  project: Briefcase,
  document: FileText,
  invoice: ReceiptText,
  request: MessageSquare,
} as const;

interface PortalNotificationsProps {
  activity: PortalActivityItem[];
}

export function PortalNotifications({ activity }: PortalNotificationsProps) {
  return (
    <div className="space-y-6" data-testid="portal-notifications">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
        <p className="text-muted-foreground mt-1">Updates on your projects, documents and invoices.</p>
      </div>

      <Card className="border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" /> Recent Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground italic" data-testid="portal-notifications-empty">
              You're all caught up — no new notifications.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((item) => {
                const Icon = ICON[item.category];
                return (
                  <li key={item.id} className="flex items-start gap-3 py-3" data-testid={`portal-notification-${item.id}`}>
                    <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">{new Date(item.date).toLocaleDateString()}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
