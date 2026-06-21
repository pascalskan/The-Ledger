import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flag, CheckCircle2, Loader2, Clock, AlertTriangle } from "lucide-react";
import type { PortalMilestone } from "@/lib/portalProjections";
import type { ClientMilestoneStatus } from "@/lib/portalProjectModels";

const STATUS_META: Record<ClientMilestoneStatus, { icon: typeof Flag; cls: string }> = {
  Completed: { icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  "In Progress": { icon: Loader2, cls: "bg-blue-50 text-blue-700 border-blue-200" },
  Upcoming: { icon: Clock, cls: "bg-slate-100 text-slate-600 border-slate-200" },
  Delayed: { icon: AlertTriangle, cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

export function ProjectMilestones({ milestones }: { milestones: PortalMilestone[] }) {
  return (
    <Card className="border-slate-200" data-testid="portal-milestones">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <Flag className="h-5 w-5 text-slate-500" /> Milestones
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {milestones.length === 0 ? (
          <p className="text-sm text-slate-500 italic" data-testid="portal-milestones-empty">No milestones yet.</p>
        ) : (
          <ol className="space-y-3">
            {milestones.map((m) => {
              const meta = STATUS_META[m.status];
              const Icon = meta.icon;
              const dateLabel =
                m.status === "Completed" && m.completedDate
                  ? `Completed ${new Date(m.completedDate).toLocaleDateString()}`
                  : `Target ${new Date(m.targetDate).toLocaleDateString()}`;
              return (
                <li
                  key={m.id}
                  className="flex items-start gap-3 rounded-lg border border-slate-100 p-3"
                  data-testid={`portal-milestone-${m.id}`}
                >
                  <div className="h-8 w-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                    <Icon className={`h-4 w-4 ${m.status === "In Progress" ? "animate-spin-slow" : ""} text-slate-500`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{m.title}</span>
                      <Badge variant="outline" className={`shrink-0 ${meta.cls}`} data-testid={`portal-milestone-status-${m.id}`}>
                        {m.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{dateLabel}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
