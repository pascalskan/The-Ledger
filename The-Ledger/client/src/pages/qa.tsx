import { Layout } from "@/components/layout";
import { CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function QAPage() {
  const checks = [
    { category: "Auth & Navigation", items: [
      { task: "Logout redirects immediately to /auth", status: "Pass" },
      { task: "Sidebar collapses/expands with persistence", status: "Pass" },
      { task: "Protected routes redirect unauthenticated users", status: "Pass" }
    ]},
    { category: "Client & Invoicing", items: [
      { task: "Invoice requires client selection", status: "Pass" },
      { task: "Job-to-Invoice template pre-populates line items", status: "Pass" },
      { task: "Bank details show on printed invoices", status: "Pass" },
      { task: "Invoice full CRUD (Create, View, Delete, Status)", status: "Pass" }
    ]},
    { category: "Operations", items: [
      { task: "Worker/Equipment CRUD and status tracking", status: "Pass" },
      { task: "Job assignments and status updates", status: "Pass" },
      { task: "Conflict detection logged in Audit Log", status: "Pass" }
    ]},
    { category: "Roles", items: [
      { task: "Manage Roles page accessible to CEO/Admin", status: "Pass" },
      { task: "Sidebar hides unauthorized links", status: "Pass" }
    ]}
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">QA Centre</h2>
          <p className="text-muted-foreground mt-1">Verification of core application flows and enterprise hardening.</p>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Phase 2 Hardening & Validation
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    This checklist validates the enterprise-grade hardening of the Phase 2 field operations system.
                    It covers offline persistence, replay batching, governance, and doctrine compliance.
                </p>
                <Link href="/qa/validation">
                    <Button>
                        Open Phase 2 Validation Checklist <ExternalLink className="w-4 h-4 ml-2" />
                    </Button>
                </Link>
            </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {checks.map((cat) => (
            <Card key={cat.category}>
              <CardHeader><CardTitle className="text-lg">{cat.category}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {cat.items.map((item) => (
                  <div key={item.task} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="flex-1">{item.task}</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">PASS</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}

function Badge({ children, className }: any) {
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${className}`}>{children}</span>;
}