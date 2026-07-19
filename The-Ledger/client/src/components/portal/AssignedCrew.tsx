import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AssignedCrew({ crew }: { crew: any[] }) {
  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" /> Assigned Crew
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {crew.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No crew assigned yet.</p>
        ) : (
          crew.map((w, i) => (
            <div key={i} className="flex items-center gap-3" data-testid="portal-crew-member">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium text-sm border border-border shrink-0">
                {w.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground flex items-center justify-between">
                  <span className="truncate" data-testid="portal-crew-name">{w.name}</span>
                  <Badge variant="outline" className="text-[10px] bg-muted text-foreground border-border font-normal shrink-0 ml-2">Confirmed</Badge>
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className="text-xs text-muted-foreground truncate" data-testid="portal-crew-role">{w.role}</span>
                  {w.scheduledDate && <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{w.scheduledDate}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
