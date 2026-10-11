import { Layout } from "@/components/layout";
import { PageHeader } from "@/components/page-shell";
import { useStore } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { isEmail, isUkSortCode, isAccountNumber } from "@/lib/validate";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const { companySettings, updateSettings } = useStore();
  const { toast } = useToast();
  const [formData, setFormData] = useState(companySettings);
  const [, setLocation] = useLocation();

  const handleSave = () => {
    const problems: string[] = [];
    if (!formData.companyLegalName?.trim()) problems.push("Legal company name is required.");
    if (formData.email && !isEmail(formData.email)) problems.push("Email address is not valid.");
    if (formData.sortCode && !isUkSortCode(formData.sortCode)) problems.push("Sort code must look like 20-11-99.");
    if (formData.accountNumber && !isAccountNumber(formData.accountNumber)) problems.push("Account number must be 6–8 digits.");
    if (problems.length > 0) {
      toast({ title: "Check the highlighted details", description: problems.join(" "), variant: "destructive" });
      return;
    }
    updateSettings(formData);
    toast({ title: "Settings Saved", description: "Company details updated successfully." });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader
          title="Company Settings"
          description="Manage legal entity and payment details."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Legal Information</CardTitle>
              <CardDescription>Details used for official documents and invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Legal Company Name</Label>
                <Input aria-label="Legal company name" value={formData.companyLegalName} onChange={e => setFormData({...formData, companyLegalName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Registration Number</Label>
                    <Input aria-label="Registration number" value={formData.registrationNumber || ""} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="e.g. 12345678" />
                </div>
                <div className="space-y-2">
                    <Label>Tax / VAT ID</Label>
                    <Input aria-label="Tax or VAT ID" value={formData.taxId || ""} onChange={e => setFormData({...formData, taxId: e.target.value})} placeholder="e.g. GB 123 4567 89" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Registered Address</Label>
                <Input aria-label="Registered address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input aria-label="Email" value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} type="email" />
                </div>
                <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input aria-label="Phone" value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} type="tel" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Banking & Payments</CardTitle>
              <CardDescription>Bank details displayed on client invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input aria-label="Bank name" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input aria-label="Account name" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input aria-label="Account number" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Sort Code (UK)</Label>
                  <Input aria-label="Sort code" value={formData.sortCode} onChange={e => setFormData({...formData, sortCode: e.target.value})} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect to external services and accounting software.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-medium">Accounting Integration</h2>
                    <p className="text-xs text-muted-foreground mt-1">Connect to QuickBooks, Xero, FreshBooks, or Zoho.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setLocation("/settings/integrations")}>
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg">Save All Changes</Button>
        </div>
      </div>
    </Layout>
  );
}
