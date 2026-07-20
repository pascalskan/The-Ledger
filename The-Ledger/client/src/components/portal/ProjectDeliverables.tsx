import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck2, FileClock, FileText } from "lucide-react";
import type { PortalDeliverable } from "@/lib/portalProjections";
import type { ClientDeliverableStatus } from "@/lib/portalProjectModels";

const STATUS_META: Record<ClientDeliverableStatus, { icon: typeof FileText; cls: string }> = {
  Approved: { icon: FileCheck2, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  Submitted: { icon: FileText, cls: "bg-blue-50 text-blue-700 border-blue-200" },
  Pending: { icon: FileClock, cls: "bg-muted text-muted-foreground border-border" },
};

export function ProjectDeliverables({ deliverables }: { deliverables: PortalDeliverable[] }) {
  return (
    <Card className="border-border" data-testid="portal-deliverables">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-muted-foreground" /> Deliverables
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {deliverables.length === 0 ? (
          <p className="text-sm text-muted-foreground italic" data-testid="portal-deliverables-empty">
            No deliverables issued yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {deliverables.map((d) => {
              const meta = STATUS_META[d.status];
              const Icon = meta.icon;
              return (
                <li
                  key={d.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                  data-testid={`portal-deliverable-${d.id}`}
                >
                  <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{d.title}</span>
                      <Badge variant="outline" className={`shrink-0 ${meta.cls}`} data-testid={`portal-deliverable-status-${d.id}`}>
                        {d.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{d.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Issued {new Date(d.issuedDate).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
