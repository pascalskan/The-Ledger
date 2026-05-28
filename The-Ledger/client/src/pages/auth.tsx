import { useAuth, DEMO_COMPANY_ID } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { login, seedUsers } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("ceo@ledger.com");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      login(email);
      setIsLoading(false);
      setLocation("/");
    }, 800);
  };

  const realUsers = seedUsers.filter(u => u.companyId !== DEMO_COMPANY_ID);
  const demoUsers = seedUsers.filter(u => u.companyId === DEMO_COMPANY_ID);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <span className="text-2xl font-bold text-primary-foreground">L</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">The Ledger</CardTitle>
          <CardDescription>
            Omnisoftware Operations Management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <Label>Real Business Accounts</Label>
              <div className="grid grid-cols-1 gap-2">
                {realUsers.map(u => (
                  <Button 
                    key={u.id} 
                    type="button" 
                    variant={email === u.email ? "default" : "outline"}
                    className="justify-start h-auto py-2 px-3"
                    onClick={() => setEmail(u.email)}
                  >
                    <div className="text-left w-full">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs">{u.role}</span>
                        {email === u.email && <Badge variant="secondary" className="text-[10px] h-4">Selected</Badge>}
                      </div>
                      <div className="text-[10px] opacity-70">{u.email}</div>
                    </div>
                  </Button>
                ))}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or Demo Environment</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {demoUsers.map(u => (
                  <Button 
                    key={u.id} 
                    type="button" 
                    variant={email === u.email ? "secondary" : "ghost"}
                    className="justify-start h-auto py-2 px-3 border border-dashed border-slate-300 dark:border-slate-700"
                    onClick={() => setEmail(u.email)}
                  >
                    <div className="text-left w-full">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-blue-600 dark:text-blue-400">{u.name}</span>
                        {email === u.email && <Badge variant="outline" className="text-[10px] h-4 border-blue-200 text-blue-600">Active</Badge>}
                      </div>
                      <div className="text-[10px] opacity-70">{u.email}</div>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
            
            <Button type="submit" className="w-full font-semibold mt-6" size="lg" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
