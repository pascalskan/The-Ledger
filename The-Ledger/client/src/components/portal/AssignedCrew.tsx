import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AssignedCrew({ crew }: { crew: any[] }) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-500" /> Assigned Crew
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {crew.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No crew assigned yet.</p>
        ) : (
          crew.map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-sm border border-slate-200 shrink-0">
                {w.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 flex items-center justify-between">
                  <span className="truncate">{w.name}</span>
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200 font-normal shrink-0 ml-2">Confirmed</Badge>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs text-slate-500 truncate">{w.role}</span>
                  {w.scheduledDate && <span className="text-[10px] text-slate-400 shrink-0 ml-2">{w.scheduledDate}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
