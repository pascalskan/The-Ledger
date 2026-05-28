import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AlertsPanel({ lowStock, serviceAlerts }: { lowStock: any[], serviceAlerts: any[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
          <AlertTriangle className="h-5 w-5 text-rose-500" /> Low Stock Alerts
        </h3>
        <div className="border border-slate-200 rounded-md bg-white">
          <Table>
            <TableHeader className="bg-rose-50/50">
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Reorder Lvl</TableHead>
                <TableHead>Location</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStock.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                  <TableCell className="text-right font-bold text-rose-600">{item.quantity}</TableCell>
                  <TableCell className="text-right text-slate-600">{item.reorderLevel}</TableCell>
                  <TableCell><Badge variant="outline" className="font-normal text-slate-600">{item.location}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-900">
          <Clock className="h-5 w-5 text-amber-500" /> Asset Service Alerts
        </h3>
        <div className="border border-slate-200 rounded-md bg-white">
          <Table>
            <TableHeader className="bg-amber-50/50">
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Next Service</TableHead>
                <TableHead className="text-right">Days Left</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {serviceAlerts.map((item, idx) => {
                const daysLeft = Math.ceil((new Date(item.nextService).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                const isOverdue = daysLeft < 0;
                
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                    <TableCell className="text-slate-600">{new Date(item.nextService).toLocaleDateString()}</TableCell>
                    <TableCell className={`text-right font-bold ${isOverdue ? 'text-rose-600' : 'text-amber-600'}`}>
                      {isOverdue ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days`}
                    </TableCell>
                    <TableCell>
                       {isOverdue ? 
                         <Badge className="bg-rose-50 text-rose-700 border-rose-200 font-normal hover:bg-rose-100">Overdue</Badge> : 
                         <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-normal hover:bg-amber-100">Due Soon</Badge>
                       }
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}