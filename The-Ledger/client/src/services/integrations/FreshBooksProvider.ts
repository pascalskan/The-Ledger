import { FinancialProvider, FinancialClient, FinancialInvoice, FinancialPayment, FinancialEstimate } from "./BaseFinancialProvider";

export class FreshBooksProvider implements FinancialProvider {
  name = "FreshBooks";
  id = "freshbooks" as const;

  async connect(authCode: string): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  async refreshToken(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  async fetchClients(): Promise<FinancialClient[]> {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: "fb-c-1", externalId: "FB-CL-001", name: "Startup Inc", sourceSystem: "freshbooks" }
    ]), 800));
  }

  async fetchInvoices(): Promise<FinancialInvoice[]> {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: "fb-i-1", externalId: "FB-INV-3001", clientId: "fb-c-1", totalAmount: 850, status: "Sent", sourceSystem: "freshbooks" }
    ]), 800));
  }

  async fetchPayments(): Promise<FinancialPayment[]> {
    return new Promise(resolve => setTimeout(() => resolve([]), 800));
  }

  async fetchEstimates(): Promise<FinancialEstimate[]> {
    return new Promise(resolve => setTimeout(() => resolve([]), 800));
  }

  async disconnect(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }
}