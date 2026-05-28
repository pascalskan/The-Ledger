import { FinancialProvider, FinancialClient, FinancialInvoice, FinancialPayment, FinancialEstimate } from "./BaseFinancialProvider";

export class ZohoProvider implements FinancialProvider {
  name = "Zoho Books";
  id = "zoho" as const;

  async connect(authCode: string): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  async refreshToken(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  async fetchClients(): Promise<FinancialClient[]> {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: "zh-c-1", externalId: "ZH-CONT-001", name: "Tech Solutions", sourceSystem: "zoho" }
    ]), 800));
  }

  async fetchInvoices(): Promise<FinancialInvoice[]> {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: "zh-i-1", externalId: "ZH-INV-4001", clientId: "zh-c-1", totalAmount: 3100, status: "Overdue", sourceSystem: "zoho" }
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