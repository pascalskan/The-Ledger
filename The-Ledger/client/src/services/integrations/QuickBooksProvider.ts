import { FinancialProvider, FinancialClient, FinancialInvoice, FinancialPayment, FinancialEstimate } from "./BaseFinancialProvider";

export class QuickBooksProvider implements FinancialProvider {
  name = "QuickBooks";
  id = "quickbooks" as const;

  async connect(authCode: string): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  async refreshToken(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  async fetchClients(): Promise<FinancialClient[]> {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: "qb-c-1", externalId: "QB-CUST-001", name: "Acme Corp", sourceSystem: "quickbooks" }
    ]), 800));
  }

  async fetchInvoices(): Promise<FinancialInvoice[]> {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: "qb-i-1", externalId: "QB-INV-1001", clientId: "qb-c-1", totalAmount: 1500, status: "Paid", sourceSystem: "quickbooks" }
    ]), 800));
  }

  async fetchPayments(): Promise<FinancialPayment[]> {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: "qb-p-1", externalId: "QB-PAY-501", invoiceId: "qb-i-1", amount: 1500, date: new Date().toISOString(), sourceSystem: "quickbooks" }
    ]), 800));
  }

  async fetchEstimates(): Promise<FinancialEstimate[]> {
    return new Promise(resolve => setTimeout(() => resolve([]), 800));
  }

  async disconnect(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }
}