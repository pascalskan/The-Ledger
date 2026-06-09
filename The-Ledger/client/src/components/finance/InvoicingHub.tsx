import { useState } from "react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { InvoicesContent } from "@/pages/invoices";
import { InvoiceBuilderContent } from "@/pages/invoice-builder";

export function InvoicingHub() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const activeFilter = params.get("filter") ?? "all";

  const [sheetOpen, setSheetOpen] = useState(false);

  const filters = [
    { value: "all", label: "All", testId: "invoice-filter-all" },
    { value: "draft", label: "Draft", testId: "invoice-filter-draft" },
    { value: "sent", label: "Sent", testId: "invoice-filter-sent" },
    { value: "overdue", label: "Overdue", testId: "invoice-filter-overdue" },
    { value: "paid", label: "Paid", testId: "invoice-filter-paid" },
  ];

  return (
    <div data-testid="finance-invoicing-panel">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Invoicing</h2>
        <Button data-testid="btn-create-invoice" onClick={() => setSheetOpen(true)}>
          + Create Invoice
        </Button>
      </div>

      <div className="flex gap-2 mb-4">
        {filters.map(({ value, label, testId }) => (
          <Button
            key={value}
            variant={activeFilter === value ? "default" : "outline"}
            data-testid={testId}
            size="sm"
          >
            {label}
          </Button>
        ))}
      </div>

      <div data-testid="invoice-list-container">
        <InvoicesContent statusFilter={activeFilter} />
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-[600px]">
          <SheetHeader>
            <SheetTitle>Create Invoice</SheetTitle>
          </SheetHeader>
          <InvoiceBuilderContent onComplete={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
