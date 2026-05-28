import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle } from "lucide-react";

interface JobScheduleCardProps {
  job: {
    title: string;
    scheduledHours: number;
    crewCount: number;
    marginStatus: 'Green' | 'Yellow' | 'Red';
    hasConflict: boolean;
  };
  onClick: () => void;
  isSelected: boolean;
}

export function JobScheduleCard({ job, onClick, isSelected }: JobScheduleCardProps) {
  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  // Status styling logic
  let borderClass = "border-slate-200";
  let bgClass = "bg-white";
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
      className={`p-2.5 rounded-md border shadow-sm cursor-pointer transition-all hover:shadow-md relative ${borderClass} ${bgClass}`}
    >
      <div className="absolute top-3 right-2.5 flex gap-1">
        {job.hasConflict && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
        <div className={`h-2.5 w-2.5 rounded-full ${statusDotClass} shadow-sm`} />
      </div>

      <div className="pr-6">
        <h4 className="font-semibold text-xs text-slate-900 truncate leading-tight">{job.title}</h4>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0 h-4 bg-slate-50 text-slate-600 border-slate-200">
          {job.scheduledHours} hrs
        </Badge>
        <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
          <Users className="h-3 w-3" /> {job.crewCount}
        </div>
      </div>
    </div>
  );
}