import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, CheckCircle2, MapPin, MessageSquare, ReceiptText, Calendar, FileText } from "lucide-react";
import type { PortalJob, PortalSite, PortalInvoice, PortalClient } from "@/lib/portalProjections";
import type { PortalActivityItem } from "@/lib/portalActivity";

interface PortalDashboardProps {
  client?: PortalClient;
  jobs: PortalJob[];
  sites: PortalSite[];
  invoices: PortalInvoice[];
  activity: PortalActivityItem[];
  onOpenJob: (job: PortalJob) => void;
}

const ACTIVITY_ICON = {
  project: Briefcase,
  document: FileText,
  invoice: ReceiptText,
  request: MessageSquare,
} as const;

export function PortalDashboard({ client, jobs, sites, invoices, activity, onOpenJob }: PortalDashboardProps) {
  const activeProjects = jobs.filter((j) => j.status !== "Completed").length;
  const completedProjects = jobs.filter((j) => j.status === "Completed").length;
  const openRequests = 0; // Client Requests arrive in CL-7 — genuinely zero for now.
  // Invoices with an outstanding balance (Draft invoices are never projected).
  const outstandingInvoices = invoices.filter((i) => i.amountOutstanding > 0).length;

  const kpis = [
    { key: "active", label: "Active Projects", value: activeProjects, icon: Briefcase },
    { key: "completed", label: "Completed Projects", value: completedProjects, icon: CheckCircle2 },
    { key: "sites", label: "Sites", value: sites.length, icon: MapPin },
    { key: "requests", label: "Open Requests", value: openRequests, icon: MessageSquare },
    { key: "invoices", label: "Outstanding Invoices", value: outstandingInvoices, icon: ReceiptText },
  ];

  const recentProjects = jobs.slice(0, 4);

  return (
    <div className="space-y-6" data-testid="portal-dashboard">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Welcome{client?.name ? `, ${client.name}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">Here's an overview of work being performed at your sites.</p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3" data-testid="portal-kpi-strip">
        {kpis.map((kpi) => (
          <Card key={kpi.key} className="border-border" data-testid={`portal-kpi-${kpi.key}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium uppercase tracking-wider">
                <kpi.icon className="h-4 w-4" />
                <span className="truncate">{kpi.label}</span>
              </div>
              <div className="mt-2 text-3xl font-bold text-foreground" data-testid={`portal-kpi-value-${kpi.key}`}>
                {kpi.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <Card className="lg:col-span-2 border-border" data-testid="portal-recent-activity">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground italic" data-testid="portal-activity-empty">No recent activity.</p>
            ) : (
              <ul className="space-y-3">
                {activity.slice(0, 8).map((item) => {
                  const Icon = ACTIVITY_ICON[item.category];
                  return (
                    <li key={item.id} className="flex items-start gap-3" data-testid={`portal-activity-item-${item.id}`}>
                      <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent projects shortcut */}
        <Card className="border-border" data-testid="portal-dashboard-projects">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-lg">Your Projects</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {recentProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No projects yet.</p>
            ) : (
              recentProjects.map((job) => (
                <button
                  key={job.id}
                  onClick={() => onOpenJob(job)}
                  className="w-full text-left rounded-lg border border-border px-3 py-2.5 hover:border-slate-400 hover:bg-muted transition-colors"
                  data-testid={`portal-dashboard-job-${job.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{job.title}</span>
                    <Badge variant="outline" className={job.status === "Completed" ? "bg-muted text-muted-foreground" : "bg-blue-50 text-blue-700 border-blue-200"}>
                      {job.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(job.startAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
