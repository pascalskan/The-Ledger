import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2 } from "lucide-react";

export function AssetTable({ data, onDelete }: { data: any[], onDelete?: (id: string) => void }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal hover:bg-emerald-100">Active</Badge>;
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
            <TableRow key={idx}>
              <TableCell className="font-medium text-foreground">{item.name}</TableCell>
              <TableCell className="text-muted-foreground">{item.type}</TableCell>
              <TableCell>{getStatusBadge(item.status)}</TableCell>
              <TableCell><Badge variant="outline" className="font-normal text-muted-foreground bg-muted">{item.location}</Badge></TableCell>
              <TableCell className="text-muted-foreground">{new Date(item.lastService).toLocaleDateString()}</TableCell>
              <TableCell className="text-foreground font-medium">{new Date(item.nextService).toLocaleDateString()}</TableCell>
              <TableCell className="text-muted-foreground">{item.assignedJob || '—'}</TableCell>
              <TableCell className="text-right flex justify-end gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {onDelete && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600" onClick={() => onDelete(item.id)}>
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