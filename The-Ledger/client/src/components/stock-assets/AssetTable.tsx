import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { activatable } from "@/lib/a11y";

export function AssetTable({ data, onDelete }: { data: any[], onDelete?: (id: string) => void }) {
  const [, setLocation] = useLocation();
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal hover:bg-emerald-100">Active</Badge>;
      case 'In Service': return <Badge className="bg-sky-50 text-sky-800 border-sky-200 font-normal hover:bg-sky-100">In Service</Badge>;
      case 'Needs Service': return <Badge className="bg-amber-50 text-amber-800 border-amber-200 font-normal hover:bg-amber-100">Needs Service</Badge>;
      case 'Under Repair': return <Badge className="bg-amber-50 text-amber-800 border-amber-200 font-normal hover:bg-amber-100">Under Repair</Badge>;
      case 'Broken': return <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-normal hover:bg-rose-100">Broken</Badge>;
      case 'Maintenance': return <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-normal hover:bg-amber-100">Maintenance</Badge>;
      case 'Overdue': return <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-normal hover:bg-rose-100">Overdue</Badge>;
      case 'Retired': return <Badge className="bg-muted text-muted-foreground border-border font-normal hover:bg-slate-200">Retired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="border border-border rounded-md bg-card overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>Asset Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Last Service</TableHead>
            <TableHead>Next Service</TableHead>
            <TableHead>Assigned Job</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, idx) => (
            <TableRow key={idx} className="cursor-pointer" {...activatable(() => setLocation(`/assets/${item.id}`), `Open asset ${item.name}`, "row")}>
              <TableCell className="font-medium text-foreground">{item.name}</TableCell>
              <TableCell className="text-muted-foreground">{item.type}</TableCell>
              <TableCell>{getStatusBadge(item.status)}</TableCell>
              <TableCell><Badge variant="outline" className="font-normal text-muted-foreground bg-muted">{item.location}</Badge></TableCell>
              <TableCell className="text-muted-foreground">{formatDate(item.lastServiceDate ?? item.lastService)}</TableCell>
              <TableCell className="text-foreground font-medium">{formatDate(item.nextServiceDate ?? item.nextService)}</TableCell>
              <TableCell className="text-muted-foreground">{item.assignedJob || '—'}</TableCell>
              <TableCell className="text-right flex justify-end gap-2">
                {onDelete && (
                  <Button variant="ghost" size="icon" aria-label={`Delete ${item.name}`} className="h-8 w-8 text-muted-foreground hover:text-rose-600" onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}