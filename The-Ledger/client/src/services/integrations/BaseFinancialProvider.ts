export interface FinancialClient {
  id: string;
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  sourceSystem: "quickbooks" | "xero" | "freshbooks" | "zoho";
}

export interface FinancialInvoice {
  id: string;
  externalId: string;
  clientId: string;
  totalAmount: number;
  status: string;
  dueDate?: string;
  sourceSystem: "quickbooks" | "xero" | "freshbooks" | "zoho";
}

export interface FinancialPayment {
  id: string;
  externalId: string;
  invoiceId: string;
  amount: number;
  date: string;
  sourceSystem: "quickbooks" | "xero" | "freshbooks" | "zoho";
}

export interface FinancialEstimate {
  id: string;
  externalId: string;
  clientId: string;
  totalAmount: number;
  status: string;
  sourceSystem: "quickbooks" | "xero" | "freshbooks" | "zoho";
}

export interface FinancialProvider {
  name: string;
  id: "quickbooks" | "xero" | "freshbooks" | "zoho";
  connect(authCode: string): Promise<void>;
  refreshToken(): Promise<void>;
  fetchClients(): Promise<FinancialClient[]>;
  fetchInvoices(): Promise<FinancialInvoice[]>;
  fetchPayments(): Promise<FinancialPayment[]>;
  fetchEstimates(): Promise<FinancialEstimate[]>;
  disconnect(): Promise<void>;
}