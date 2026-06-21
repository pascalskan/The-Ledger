import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitCommitVertical, FilePlus2, CalendarCheck, Hammer, Flag, FileCheck2, PartyPopper } from "lucide-react";
import type { PortalTimelineEvent } from "@/lib/portalProjections";
import type { ClientTimelineEventType } from "@/lib/portalProjectModels";

const TYPE_ICON: Record<ClientTimelineEventType, typeof Flag> = {
  created: FilePlus2,
  scheduled: CalendarCheck,
  work_started: Hammer,
  milestone: Flag,
  deliverable: FileCheck2,
  completed: PartyPopper,
};

export function ProjectTimeline({ events }: { events: PortalTimelineEvent[] }) {
  return (
    <Card className="border-slate-200" data-testid="portal-timeline">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitCommitVertical className="h-5 w-5 text-slate-500" /> Project Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500 italic" data-testid="portal-timeline-empty">No timeline events yet.</p>
        ) : (
          <ol className="relative border-l border-slate-200 ml-3 space-y-6">
            {events.map((e) => {
              const Icon = TYPE_ICON[e.type];
              return (
                <li key={e.id} className="ml-6" data-testid={`portal-timeline-event-${e.id}`}>
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200">
                    <Icon className="h-3.5 w-3.5 text-slate-500" />
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{e.title}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{new Date(e.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
