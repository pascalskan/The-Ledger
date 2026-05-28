import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const { companySettings, updateSettings } = useStore();
  const { toast } = useToast();
  const [formData, setFormData] = useState(companySettings);
  const [, setLocation] = useLocation();

  const handleSave = () => {
    updateSettings(formData);
    toast({ title: "Settings Saved", description: "Company details updated successfully." });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Company Settings</h2>
          <p className="text-muted-foreground mt-1">Manage legal entity and payment details.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Legal Information</CardTitle>
              <CardDescription>Details used for official documents and invoices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Legal Company Name</Label>
                <Input value={formData.companyLegalName} onChange={e => setFormData({...formData, companyLegalName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Registration Number</Label>
                    <Input value={formData.registrationNumber || ""} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} placeholder="e.g. 12345678" />
                </div>
                <div className="space-y-2">
                    <Label>Tax / VAT ID</Label>
                    <Input value={formData.taxId || ""} onChange={e => setFormData({...formData, taxId: e.target.value})} placeholder="e.g. GB 123 4567 89" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Registered Address</Label>
                <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={formData.email || ""} onChange={e => setFormData({...formData, email: e.target.value})} type="email" />
                </div>
                <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={formData.phone || ""} onChange={e => setFormData({...formData, phone: e.target.value})} type="tel" />
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
                  <Input value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Sort Code (UK)</Label>
                  <Input value={formData.sortCode} onChange={e => setFormData({...formData, sortCode: e.target.value})} />
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
                    <h4 className="text-sm font-medium">Accounting Integration</h4>
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
