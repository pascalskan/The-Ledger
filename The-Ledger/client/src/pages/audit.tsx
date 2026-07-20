import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-shell";
import { useStore } from "@/lib/mockData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AuditPage() {
  const { logs } = useStore();

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Audit Log"
          description="Complete history of system actions for compliance and tracking."
        />

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-medium">{log.actorName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`
                      ${log.action === 'CREATE' ? 'text-green-600 border-green-200 bg-green-50' : ''}
                      ${log.action === 'DELETE' ? 'text-red-600 border-red-200 bg-red-50' : ''}
                      ${log.action === 'UPDATE' ? 'text-blue-600 border-blue-200 bg-blue-50' : ''}
                    `}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{log.entity}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Layout>
  );
}
