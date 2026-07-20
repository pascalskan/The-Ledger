import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Mail, Phone, UserCircle } from "lucide-react";

export function ProjectContacts() {
  return (
    <Card className="shadow-sm border-border bg-muted/50">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-muted-foreground" /> Project Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Manager</h4>
          <div>
            <div className="text-sm font-medium text-foreground mb-1">Sarah Jenkins</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> 
                <a href="mailto:sarah@example.com" className="hover:text-foreground hover:underline truncate">sarah@theledger.app</a>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> 
                <a href="tel:07700900123" className="hover:text-foreground hover:underline">07700 900 123</a>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-4 border-t border-border/60">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Operations Contact</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> 
              <a href="tel:01632960456" className="hover:text-foreground hover:underline">01632 960 456</a>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> 
              <a href="mailto:ops@example.com" className="hover:text-foreground hover:underline truncate">ops@theledger.app</a>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-4 border-t border-border/60">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Accounts Contact</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> 
              <a href="mailto:accounts@example.com" className="hover:text-foreground hover:underline truncate">accounts@theledger.app</a>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
