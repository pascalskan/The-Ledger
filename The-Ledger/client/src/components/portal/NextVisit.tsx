import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { CalendarClock, AlertCircle } from "lucide-react";

export function NextVisit({ date, timeWindow, crewSize, notes }: { date?: string, timeWindow?: string, crewSize?: number, notes?: string }) {
  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3 border-b border-border bg-muted/50">
        <CardTitle className="text-lg flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-muted-foreground" /> Next Scheduled Visit
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {!date ? (
          <p className="text-sm text-muted-foreground italic">No upcoming visits scheduled.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border shadow-sm">
              <div className="flex flex-col items-center justify-center bg-slate-800 text-white rounded-md h-12 w-12 shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-widest">{new Date(date).toLocaleString('default', { month: 'short' })}</span>
                <span className="text-lg font-bold leading-none mt-0.5">{new Date(date).getDate()}</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{timeWindow}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Crew Size: {crewSize} {crewSize === 1 ? 'Person' : 'People'}</div>
              </div>
            </div>
            
            {notes && (
              <div className="flex items-start gap-2 text-xs text-foreground bg-muted p-3 rounded-md border border-border">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="leading-relaxed">{notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
