import { Card, CardContent } from "@/components/ui/card";
import { FileText, ReceiptText, MessageSquare } from "lucide-react";

function Placeholder({
  testid,
  title,
  subtitle,
  body,
  icon: Icon,
}: {
  testid: string;
  title: string;
  subtitle: string;
  body: string;
  icon: typeof FileText;
}) {
  return (
    <div className="space-y-6" data-testid={testid}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="text-slate-500 mt-1">{subtitle}</p>
      </div>
      <Card className="border-slate-200">
        <CardContent className="py-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-800">Coming soon</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mt-1" data-testid={`${testid}-body`}>
            {body}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function PortalDocuments() {
  return (
    <Placeholder
      testid="portal-documents"
      title="Documents"
      subtitle="Reports, certificates and drawings shared with you."
      body="Your project documents will appear here once your account manager shares them with you."
      icon={FileText}
    />
  );
}

export function PortalInvoices() {
  return (
    <Placeholder
      testid="portal-invoices"
      title="Invoices"
      subtitle="Your invoices and payment status."
      body="Invoices and payment status will be available here shortly."
      icon={ReceiptText}
    />
  );
}

export function PortalRequests() {
  return (
    <Placeholder
      testid="portal-requests"
      title="Requests"
      subtitle="Submit and track requests to our team."
      body="You'll be able to raise and track requests — additional services, scheduling changes, document requests and more — here soon."
      icon={MessageSquare}
    />
  );
}
