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
      case 'Retired': return <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-normal hover:bg-slate-200">Retired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="border border-slate-200 rounded-md bg-white overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-50">
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
              <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
              <TableCell className="text-slate-600">{item.type}</TableCell>
              <TableCell>{getStatusBadge(item.status)}</TableCell>
              <TableCell><Badge variant="outline" className="font-normal text-slate-600 bg-slate-50">{item.location}</Badge></TableCell>
              <TableCell className="text-slate-600">{new Date(item.lastService).toLocaleDateString()}</TableCell>
              <TableCell className="text-slate-900 font-medium">{new Date(item.nextService).toLocaleDateString()}</TableCell>
              <TableCell className="text-slate-600">{item.assignedJob || '—'}</TableCell>
              <TableCell className="text-right flex justify-end gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-800">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {onDelete && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => onDelete(item.id)}>
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