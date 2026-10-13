import { useAuth, useStore, DEMO_COMPANY_ID } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useLocation } from "wouter";
import { usePortalAuth, getPortalAccounts } from "@/lib/portalAuth";

interface AuthPageProps {
  /** Supplied by the portal page so its own session state updates on sign-in. */
  portalSignIn?: ReturnType<typeof usePortalAuth>["signIn"];
}

export default function AuthPage({ portalSignIn: portalSignInProp }: AuthPageProps = {}) {
  const { login, seedUsers } = useAuth();
  const { allRoles, allClients } = useStore();
  const { signIn: ownPortalSignIn } = usePortalAuth();
  const portalSignIn = portalSignInProp ?? ownPortalSignIn;
  const [, setLocation] = useLocation();
  // `staff:<email>` or `client:<email>` — one selection across both account types.
  const [selected, setSelected] = useState("staff:demo.ceo@example.com");

  // One click on a demo account signs in directly.
  const signInAs = (key: string) => {
    setSelected(key);
    const [kind, ...rest] = key.split(":");
    const email = rest.join(":");
    if (kind === "client") {
      // Demo mode: picking a client signs straight into that client's portal.
      portalSignIn(email);
      setLocation("/portal");
      return;
    }
    login(email);
    let target = "/";
    try {
      const saved = sessionStorage.getItem("ledger-return-to");
      sessionStorage.removeItem("ledger-return-to");
      if (saved && saved.startsWith("/") && !saved.startsWith("//") && !saved.startsWith("/auth")) target = saved;
    } catch { /* storage unavailable */ }
    setLocation(target);
  };

  const demoUsers = seedUsers.filter(u => u.companyId === DEMO_COMPANY_ID);

  const clientAccounts = getPortalAccounts()
    .filter(a => a.status === "Active")
    .map(a => ({ ...a, clientName: allClients.find(c => c.id === a.clientId)?.name ?? "Demo Client" }));

  const getRoleNames = (roleIds: string[]) => {
    return roleIds
      .map(id => allRoles.find(r => r.id === id)?.name)
      .filter(Boolean)
      .join(", ") || "No Role";
  };

  return (
    <main id="main-content" className="min-h-screen w-full flex items-center justify-center bg-muted dark:bg-slate-950 p-4">
      <div className="w-full max-w-md flex flex-col items-center">
      <Card className="w-full shadow-xl border-border dark:border-slate-800" data-testid="staff-login">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <span className="text-2xl font-bold text-primary-foreground">L</span>
          </div>
          <CardTitle role="heading" aria-level={1} className="text-2xl font-bold tracking-tight">The Ledger</CardTitle>
          <CardDescription>
            Operational Intelligence for Field Service Businesses
          </CardDescription>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Transform operational activity into auditable financial records.
            Every timesheet, expense, and report — reviewed, approved, and ready for your accounting system.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-4">
              <Label>Choose a demo account</Label>
              <div className="grid grid-cols-1 gap-2">
                {demoUsers.map(u => {
                  const key = `staff:${u.email}`;
                  return (
                    <Button
                      key={u.id}
                      type="button"
                      variant={selected === key ? "secondary" : "ghost"}
                      className="justify-start h-auto py-2 px-3 border border-dashed border-slate-300 dark:border-slate-700"
                      onClick={() => signInAs(key)}
                    >
                      <div className="text-left w-full">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-blue-600 dark:text-blue-400">{u.name} ({getRoleNames(u.roleIds)})</span>
                          {selected === key && <Badge variant="outline" className="text-[10px] h-4 border-blue-200 text-blue-600">Active</Badge>}
                        </div>
                        <div className="text-[10px] opacity-90">{u.email}</div>
                      </div>
                    </Button>
                  );
                })}
                {clientAccounts.map(a => {
                  const key = `client:${a.email}`;
                  return (
                    <Button
                      key={a.id}
                      type="button"
                      variant={selected === key ? "secondary" : "ghost"}
                      className="justify-start h-auto py-2 px-3 border border-dashed border-slate-300 dark:border-slate-700"
                      onClick={() => signInAs(key)}
                      data-testid={`auth-client-${a.clientId}`}
                    >
                      <div className="text-left w-full">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">{a.clientName} (Client Portal)</span>
                          {selected === key && <Badge variant="outline" className="text-[10px] h-4 border-emerald-200 text-emerald-600">Active</Badge>}
                        </div>
                        <div className="text-[10px] opacity-90">{a.email}</div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-[11px] text-muted-foreground max-w-md" data-testid="demo-banner">
        Demo with sample data. Ongoing project: front end complete, backend not yet implemented.
      </p>
      </div>
    </main>
  );
}