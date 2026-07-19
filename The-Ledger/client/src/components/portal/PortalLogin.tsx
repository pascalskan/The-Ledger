import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, AlertCircle } from "lucide-react";
import type { PortalBrandingConfig } from "@/lib/portalBranding";
import type { PortalSignInResult } from "@/lib/portalAuth";

interface PortalLoginProps {
  branding: PortalBrandingConfig;
  signIn: (email: string, password?: string) => PortalSignInResult;
}

export function PortalLogin({ branding, signIn }: PortalLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = () => {
    setError(null);
    const result = signIn(email, password);
    if (!result.ok) setError(result.message);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" data-testid="portal-login">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8 gap-2 text-2xl font-bold tracking-tight text-slate-900">
          {branding.logo ? (
            <img src={branding.logo} alt={branding.companyName} className="h-8 w-auto" />
          ) : (
            <ShieldCheck className="h-8 w-8 text-slate-800" />
          )}
          <span>{branding.companyName}</span>
        </div>
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1 pb-6 text-center">
            <CardTitle className="text-2xl font-semibold text-slate-900">Client Sign In</CardTitle>
            <CardDescription>
              Welcome to your client portal. Access your projects, sites, and documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div
                className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                data-testid="portal-login-error"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="portal-email">Email</Label>
              <Input
                id="portal-email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                data-testid="portal-login-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-password">Password</Label>
              <Input
                id="portal-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSignIn()}
                data-testid="portal-login-password"
              />
            </div>
            <Button
              className="w-full h-11 text-base font-medium bg-slate-900 hover:bg-slate-800 text-white"
              onClick={handleSignIn}
              data-testid="portal-login-submit"
            >
              Sign In
            </Button>
            <div className="rounded-md bg-slate-50 border border-slate-100 p-3 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Demo:</span> sign in with{" "}
              <button
                type="button"
                className="font-mono text-slate-700 underline hover:text-slate-900"
                onClick={() => setEmail("portal@hsslimited.co.uk")}
                data-testid="portal-login-demo-fill"
              >
                portal@hsslimited.co.uk
              </button>{" "}
              (any password).
            </div>
          </CardContent>
        </Card>
        <div className="text-center mt-6 text-xs text-slate-500">
          Protected by The Ledger Operations Platform
        </div>
      </div>
    </div>
  );
}
