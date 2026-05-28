import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";

export function ActivityTimeline({ activities }: { activities: any[] }) {
  if (!activities || activities.length === 0) return null;
  
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-slate-500" /> Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
          {activities.map((item, i) => {
            const Icon = item.icon || Activity;
            return (
              <div key={i} className="relative pl-6">
                <span className="absolute -left-[11px] top-0 h-5 w-5 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center">
                  <Icon className="h-2.5 w-2.5 text-slate-500" />
                </span>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between mb-1">
                  <div className="text-sm font-medium text-slate-800">{item.title}</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1 sm:mt-0">{item.date}</div>
                </div>
                {item.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
