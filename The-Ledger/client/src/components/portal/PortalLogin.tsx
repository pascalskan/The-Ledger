import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import type { PortalSignInResult } from "@/lib/portalAuth";

interface PortalLoginCardProps {
  signIn: (email: string, password?: string) => PortalSignInResult;
  onSuccess?: () => void;
  headingLevel?: number;
}

/** The client sign-in form on its own, so it can sit beside the staff sign-in. */
export function PortalLoginCard({ signIn, onSuccess, headingLevel = 1 }: PortalLoginCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = () => {
    setError(null);
    const result = signIn(email, password);
    if (!result.ok) setError(result.message);
    else onSuccess?.();
  };

  return (
    <Card className="shadow-lg border-0" data-testid="portal-login">
      <CardHeader className="space-y-1 pb-6 text-center">
        <CardTitle role="heading" aria-level={headingLevel} className="text-2xl font-semibold text-foreground">Client Sign In</CardTitle>
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
          <div className="rounded-md bg-muted border border-border p-3 text-xs text-muted-foreground">
            <span className="font-medium text-muted-foreground">Demo:</span> sign in with{" "}
            <button
              type="button"
              className="font-mono text-foreground underline hover:text-foreground"
              onClick={() => setEmail("portal@demo-client-a.example.com")}
              data-testid="portal-login-demo-fill"
            >
              portal@demo-client-a.example.com
            </button>{" "}
            (any password).
          </div>
        </CardContent>
    </Card>
  );
}
