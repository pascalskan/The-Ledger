import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ListTodo, Gauge } from "lucide-react";
import type { PortalProjectProgress } from "@/lib/portalProjections";

export function ProjectProgressSummary({ progress }: { progress: PortalProjectProgress }) {
  const pct = progress.completionPercent;
  return (
    <Card className="border-slate-200" data-testid="portal-project-progress">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
            <Gauge className="h-4 w-4 text-slate-400" /> Project Progress
          </div>
          <span className="text-2xl font-bold text-slate-900" data-testid="portal-progress-percent">{pct}%</span>
        </div>

        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full bg-slate-800 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
            data-testid="portal-progress-bar"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-2 text-sm" data-testid="portal-progress-completed">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-slate-700"><span className="font-semibold">{progress.completed}</span> completed</span>
          </div>
          <div className="flex items-center gap-2 text-sm" data-testid="portal-progress-remaining">
            <ListTodo className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-slate-700"><span className="font-semibold">{progress.remaining}</span> remaining</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
