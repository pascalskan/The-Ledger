import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Briefcase, Building2 } from "lucide-react";
import type { PortalSite } from "@/lib/portalProjections";

interface PortalSitesProps {
  sites: PortalSite[];
}

export function PortalSites({ sites }: PortalSitesProps) {
  return (
    <div className="space-y-6" data-testid="portal-sites">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Your Sites</h1>
        <p className="text-muted-foreground mt-1">Locations where we are delivering work for you.</p>
      </div>

      {sites.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-border rounded-lg bg-card" data-testid="portal-sites-empty">
          <Building2 className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-lg font-medium text-foreground">No sites yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
            Sites appear here once work is scheduled at your locations.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sites.map((site) => (
            <Card key={site.id} className="border-border" data-testid={`portal-site-card-${site.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg text-foreground">{site.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={site.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"}
                    data-testid={`portal-site-status-${site.id}`}
                  >
                    {site.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <span data-testid={`portal-site-address-${site.id}`}>{site.address}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t border-border">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span data-testid={`portal-site-jobcount-${site.id}`}>
                    {site.activeJobCount} active · {site.jobCount} total
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
