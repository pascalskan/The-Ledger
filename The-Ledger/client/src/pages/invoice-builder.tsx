import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "wouter";
import {
  FileText,
  Plus,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Send,
  CreditCard,
} from "lucide-react";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_NEXT_LABEL,
  isValidStatusTransition,
  nextStatus,
} from "@/lib/invoiceBuilder";
import type { InvoiceStatus, InvoiceDraft } from "@/types/finance";
import { getJobInvoiceReadiness } from "@/lib/profitabilityEngine";
import { mockInvoiceLineItems, generateInvoiceNumber } from "@/lib/mockData";

function fmt(n: number) {
  return `£${n.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const LINE_TYPE_COLORS: Record<string, string> = {
  labor: "text-blue-600 border-blue-200 bg-blue-50",
  material: "text-emerald-600 border-emerald-200 bg-emerald-50",
  equipment: "text-violet-600 border-violet-200 bg-violet-50",
  expense: "text-amber-600 border-amber-200 bg-amber-50",
};

const STATUS_ICON: Record<InvoiceStatus, React.ReactNode> = {
  draft: <FileText className="h-4 w-4" />,
  ready: <CheckCircle2 className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  paid: <CreditCard className="h-4 w-4" />,
};

function InvoiceDraftCard({
  draft,
  onAdvance,
}: {
  draft: InvoiceDraft;
  onAdvance: (id: string, to: InvoiceStatus) => void;
}) {
  const { jobs, clients } = useStore();
  const job = jobs.find((j) => j.id === draft.jobId);
  const client = clients.find((c) => c.id === draft.clientId);
  const [, setLocation] = useLocation();
  const next = nextStatus(draft.status);

  return (
    <Card data-testid={`invoice-draft-card-${draft.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold" data-testid={`draft-number-${draft.id}`}>
                {draft.invoiceNumber}
              </span>
              <Badge
                variant="outline"
                className={INVOICE_STATUS_COLORS[draft.status]}
                data-testid={`draft-status-${draft.id}`}
              >
                {STATUS_ICON[draft.status]}
                <span className="ml-1">{INVOICE_STATUS_LABELS[draft.status]}</span>
              </Badge>
            </div>
            <p
              className="text-sm text-muted-foreground mt-1 hover:underline cursor-pointer"
              onClick={() => job && setLocation(`/jobs/${job.id}`)}
            >
              {job?.title ?? draft.jobId}
            </p>
            {client && (
              <p className="text-xs text-muted-foreground">{client.name}</p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-xl font-bold" data-testid={`draft-total-${draft.id}`}>
              {fmt(draft.total)}
            </p>
            {draft.taxAmount > 0 && (
              <p className="text-xs text-muted-foreground">
                incl. {fmt(draft.taxAmount)} VAT
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Created {fmtDate(draft.createdAt)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Line items */}
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draft.lineItems.map((li) => (
                <TableRow key={li.id}>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={LINE_TYPE_COLORS[li.type] ?? ""}
                    >
                      {li.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[240px] truncate">
                    {li.description}
                  </TableCell>
                  <TableCell className="text-right">{li.quantity}</TableCell>
                  <TableCell className="text-right">{fmt(li.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {fmt(li.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Totals */}
        <div className="space-y-1 text-sm border-t pt-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span data-testid={`draft-subtotal-${draft.id}`}>{fmt(draft.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Tax ({(draft.taxRate * 100).toFixed(0)}%)
            </span>
            <span>{fmt(draft.taxAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base pt-1 border-t">
            <span>Total</span>
            <span>{fmt(draft.total)}</span>
          </div>
        </div>

        {/* Workflow controls */}
        {next && (
          <div className="flex justify-end pt-1">
            <Button
              size="sm"
              onClick={() => onAdvance(draft.id, next)}
              data-testid={`btn-advance-${draft.id}`}
            >
              {INVOICE_STATUS_NEXT_LABEL[draft.status]}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
        {!next && (
          <p className="text-xs text-emerald-600 text-right font-medium">
            ✓ Invoice paid — no further actions required.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ──────────────────────────────────────────────────────
// STATUS PIPELINE STRIP
// Shows counts and totals per status bucket — Financial
// Explorer integration as required by doctrine.
// ──────────────────────────────────────────────────────
function PipelineStrip({ drafts }: { drafts: InvoiceDraft[] }) {
  const statuses: InvoiceStatus[] = ["draft", "ready", "sent", "paid"];
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      data-testid="invoice-pipeline-strip"
    >
      {statuses.map((status) => {
        const bucket = drafts.filter((d) => d.status === status);
        const total = bucket.reduce((s, d) => s + d.total, 0);
        return (
          <Card key={status}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {INVOICE_STATUS_LABELS[status]}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-end justify-between">
                <span
                  className="text-2xl font-bold"
                  data-testid={`pipeline-count-${status}`}
                >
                  {bucket.length}
                </span>
                <span
                  className="text-sm font-medium text-muted-foreground"
                  data-testid={`pipeline-total-${status}`}
                >
                  {fmt(total)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function InvoiceBuilderContent({ onComplete }: { onComplete?: () => void }) {
  const {
    invoiceDrafts,
    jobs,
    clients,
    addInvoiceDraft,
    updateInvoiceDraftStatus,
  } = useStore();

  const [, setLocation] = useLocation();

  // Find jobs that have approved InvoiceLineItems but no existing draft
  const jobsWithReadiness = jobs
    .map((job) => {
      const readiness = getJobInvoiceReadiness(job.id, mockInvoiceLineItems);
      const existingDraft = invoiceDrafts.find((d) => d.jobId === job.id);
      return { job, readiness, existingDraft };
    })
    .filter((r) => r.readiness.hasLines);

  const jobsNeedingDraft = jobsWithReadiness.filter((r) => !r.existingDraft);

  const handleGenerate = (jobId: string, clientId: string) => {
    const readiness = getJobInvoiceReadiness(jobId, mockInvoiceLineItems);
    if (!readiness.hasLines) return;

    const id = `draft-${Date.now()}`;
    const invoiceNumber = generateInvoiceNumber();
    const now = new Date().toISOString();

    const draftLines = readiness.lines.map((li) => ({
      id: li.id,
      type: li.type,
      description: li.description,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      amount: li.amount,
    }));

    const subtotal = draftLines.reduce((s, l) => s + l.amount, 0);
    const taxRate = 0; // placeholder — 0% until VAT config is implemented
    const taxAmount = parseFloat((subtotal * taxRate).toFixed(2));
    const total = parseFloat((subtotal + taxAmount).toFixed(2));

    addInvoiceDraft({
      id,
      invoiceNumber,
      jobId,
      clientId,
      lineItems: draftLines,
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleAdvance = (draftId: string, to: InvoiceStatus) => {
    updateInvoiceDraftStatus(draftId, to);
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2
            className="text-3xl font-bold tracking-tight"
            data-testid="page-title-invoice-builder"
          >
            Invoice Builder
          </h2>
          <p className="text-muted-foreground mt-1">
            Generate invoice drafts from approved operational activity. Drafts
            are created exclusively from normalized financial records — never
            directly from jobs.
          </p>
        </div>

        {/* Pipeline Strip */}
        <PipelineStrip drafts={invoiceDrafts} />

        {/* Jobs ready for invoicing (no draft yet) */}
        {jobsNeedingDraft.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Ready to Invoice
            </h3>
            <div className="space-y-2">
              {jobsNeedingDraft.map(({ job, readiness }) => {
                const client = clients.find((c) => c.id === job.clientId);
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between border rounded-md px-4 py-3 bg-blue-50/40 dark:bg-blue-950/20"
                    data-testid={`ready-to-invoice-${job.id}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {client?.name ?? "—"} · {readiness.lines.length} line
                        item{readiness.lines.length !== 1 ? "s" : ""} ·{" "}
                        {fmt(readiness.totalBillable)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerate(job.id, job.clientId)}
                      data-testid={`btn-generate-draft-${job.id}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Generate Draft
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Invoice Drafts */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Invoice Pipeline ({invoiceDrafts.length})
          </h3>

          {invoiceDrafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-md">
              <AlertCircle className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm text-center max-w-sm">
                No invoice drafts yet. Approve a worker report to generate
                InvoiceLineItems, then generate a draft from the "Ready to
                Invoice" section above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...invoiceDrafts].reverse().map((draft) => (
                <InvoiceDraftCard
                  key={draft.id}
                  draft={draft}
                  onAdvance={handleAdvance}
                />
              ))}
            </div>
          )}
        </div>
      </div>
  );
}

export default function InvoiceBuilderPage() {
  return <Layout><InvoiceBuilderContent /></Layout>;
}
