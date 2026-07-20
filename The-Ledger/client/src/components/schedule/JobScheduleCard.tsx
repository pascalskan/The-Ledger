import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle } from "lucide-react";

interface JobScheduleCardProps {
  job: {
    id: string;
    title: string;
    scheduledHours: number;
    crewCount: number;
    marginStatus: 'Green' | 'Yellow' | 'Red';
    hasConflict: boolean;
  };
  onClick: () => void;
  isSelected: boolean;
  /** Supplied by the CEO week grid to enable drag-to-reschedule. */
  onDragStart?: (jobId: string) => void;
  onDragEnd?: () => void;
}

export function JobScheduleCard({ job, onClick, isSelected, onDragStart, onDragEnd }: JobScheduleCardProps) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  // Status styling logic
  let borderClass = "border-border";
  let bgClass = "bg-card";
  let statusDotClass = "bg-slate-300";
  
  if (job.marginStatus === 'Green') {
    borderClass = "border-emerald-200";
    statusDotClass = "bg-emerald-500";
  } else if (job.marginStatus === 'Yellow') {
    borderClass = "border-amber-200";
    bgClass = "bg-amber-50/10";
    statusDotClass = "bg-amber-500";
  } else if (job.marginStatus === 'Red') {
    borderClass = "border-rose-200";
    bgClass = "bg-rose-50/30";
    statusDotClass = "bg-rose-500";
  }

  if (isSelected) {
    borderClass = "border-blue-500 ring-1 ring-blue-500";
  }

  return (
    <div
      onClick={onClick}
      // Drag-to-reschedule. Native HTML5 DnD rather than a library — this is a
      // single interaction on one grid, and a drag-and-drop dependency would be
      // a large addition to the bundle E-7 just cut by 80%.
      draggable={Boolean(onDragStart)}
      onDragStart={(e) => {
        if (!onDragStart) return;
        e.dataTransfer.effectAllowed = 'move';
        // Some browsers require data to be set for a drag to begin at all.
        e.dataTransfer.setData('text/plain', job.id);
        onDragStart(job.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      data-testid={`sched-job-card-${job.id}`}
      className={`p-2.5 rounded-md border shadow-sm cursor-pointer transition-all hover:shadow-md relative ${borderClass} ${bgClass} ${onDragStart ? 'active:cursor-grabbing' : ''}`}
    >
      <div className="absolute top-3 right-2.5 flex gap-1">
        {job.hasConflict && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
        <div className={`h-2.5 w-2.5 rounded-full ${statusDotClass} shadow-sm`} />
      </div>

      <div className="pr-6">
        <h4 className="font-semibold text-xs text-foreground truncate leading-tight">{job.title}</h4>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0 h-4 bg-muted text-muted-foreground border-border">
          {job.scheduledHours} hrs
        </Badge>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
          <Users className="h-3 w-3" /> {job.crewCount}
        </div>
      </div>
    </div>
  );
}