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
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Notifications</h1>
        <p className="text-slate-500 mt-1">Updates on your projects, documents and invoices.</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-slate-500" /> Recent Updates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {activity.length === 0 ? (
            <p className="text-sm text-slate-500 italic" data-testid="portal-notifications-empty">
              You're all caught up — no new notifications.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {activity.map((item) => {
                const Icon = ICON[item.category];
                return (
                  <li key={item.id} className="flex items-start gap-3 py-3" data-testid={`portal-notification-${item.id}`}>
                    <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800">{item.title}</div>
                      <div className="text-xs text-slate-500">{item.description}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{new Date(item.date).toLocaleDateString()}</div>
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
