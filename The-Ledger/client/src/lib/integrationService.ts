import { useStore } from "./mockData";

export const useIntegrationService = () => {
  const { updateSettings, companySettings } = useStore();

  const getAccounting = () => companySettings.accountingIntegration || {
    status: "Not Connected",
    syncLogs: []
  };

  const addLog = (action: string, status: "Success" | "Failed", message?: string) => {
    const current = getAccounting();
    return [
      { timestamp: new Date().toISOString(), action, status, message },
      ...(current.syncLogs || [])
    ];
  };

  const connectQuickBooks = async () => {
    updateSettings({
      accountingIntegration: {
        ...getAccounting(),
        status: "Syncing"
      }
    });

    // Simulate OAuth and connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    updateSettings({
      accountingIntegration: {
        status: "Connected",
        accessToken: "mock_qb_access_token_123",
        realmId: "mock_company_192837",
        connectedAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: "Success",
        syncLogs: addLog("Connect to QuickBooks", "Success", "OAuth connection established")
      }
    });
  };

  const disconnectQuickBooks = async () => {
    updateSettings({
      accountingIntegration: {
        status: "Not Connected",
        syncLogs: []
      }
    });
  };

  const syncQuickBooksData = async () => {
    const current = getAccounting();
    if (current.status !== "Connected") return;

    updateSettings({
      accountingIntegration: { ...current, status: "Syncing" }
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const isSuccess = Math.random() > 0.3; // 70% success rate

    updateSettings({
      accountingIntegration: {
        ...current,
        status: isSuccess ? "Connected" : "Error",
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: isSuccess ? "Success" : "Failed",
        errorMessage: isSuccess ? undefined : "Network timeout connecting to Intuit API",
        syncLogs: addLog("Manual Data Sync", isSuccess ? "Success" : "Failed", isSuccess ? "Synced 5 records" : "Network timeout connecting to Intuit API")
      }
    });
  };

  const exportInvoiceToQuickBooks = async (invoiceId: string) => {
    // In a real app this would call an API, then update the invoice via a mutation.
    // For this mockup, we just simulate the delay.
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const current = getAccounting();
    if (current.status === "Connected") {
      updateSettings({
        accountingIntegration: {
          ...current,
          syncLogs: addLog(`Export Invoice ${invoiceId}`, "Success", `Successfully exported to QuickBooks`)
        }
      });
    }
  };

  return { connectQuickBooks, disconnectQuickBooks, syncQuickBooksData, exportInvoiceToQuickBooks };
};
