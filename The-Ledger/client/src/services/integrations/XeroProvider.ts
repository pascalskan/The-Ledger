import { FinancialProvider, FinancialClient, FinancialInvoice, FinancialPayment, FinancialEstimate } from "./BaseFinancialProvider";

export class XeroProvider implements FinancialProvider {
  name = "Xero";
  id = "xero" as const;

  async connect(authCode: string): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  async refreshToken(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }

  async fetchClients(): Promise<FinancialClient[]> {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: "xe-c-1", externalId: "XE-CONT-001", name: "Global Industries", sourceSystem: "xero" }
    ]), 800));
  }

  async fetchInvoices(): Promise<FinancialInvoice[]> {
    return new Promise(resolve => setTimeout(() => resolve([
      { id: "xe-i-1", externalId: "XE-INV-2001", clientId: "xe-c-1", totalAmount: 2200, status: "Draft", sourceSystem: "xero" }
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