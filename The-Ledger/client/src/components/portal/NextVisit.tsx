import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarClock, AlertCircle } from "lucide-react";

export function NextVisit({ date, timeWindow, crewSize, notes }: { date?: string, timeWindow?: string, crewSize?: number, notes?: string }) {
  return (
    <Card className="shadow-sm border-slate-200">
      <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-slate-500" /> Next Scheduled Visit
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {!date ? (
          <p className="text-sm text-slate-500 italic">No upcoming visits scheduled.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex flex-col items-center justify-center bg-slate-800 text-white rounded-md h-12 w-12 shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-widest">{new Date(date).toLocaleString('default', { month: 'short' })}</span>
                <span className="text-lg font-bold leading-none mt-0.5">{new Date(date).getDate()}</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">{timeWindow}</div>
                <div className="text-xs text-slate-500 mt-0.5">Crew Size: {crewSize} {crewSize === 1 ? 'Person' : 'People'}</div>
              </div>
            </div>
            
            {notes && (
              <div className="flex items-start gap-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-md border border-slate-200">
                <AlertCircle className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
