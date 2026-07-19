import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Mail, Phone, UserCircle } from "lucide-react";

export function ProjectContacts() {
  return (
    <Card className="shadow-sm border-slate-200 bg-slate-50/50">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserCircle className="h-5 w-5 text-slate-500" /> Project Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Manager</h4>
          <div>
            <div className="text-sm font-medium text-slate-800 mb-1">Sarah Jenkins</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" /> 
                <a href="mailto:sarah@example.com" className="hover:text-slate-900 hover:underline truncate">sarah@theledger.app</a>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" /> 
                <a href="tel:07700900123" className="hover:text-slate-900 hover:underline">07700 900 123</a>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-4 border-t border-slate-200/60">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Operations Contact</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" /> 
              <a href="tel:01632960456" className="hover:text-slate-900 hover:underline">01632 960 456</a>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" /> 
              <a href="mailto:ops@example.com" className="hover:text-slate-900 hover:underline truncate">ops@theledger.app</a>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 pt-4 border-t border-slate-200/60">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Accounts Contact</h4>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" /> 
              <a href="mailto:accounts@example.com" className="hover:text-slate-900 hover:underline truncate">accounts@theledger.app</a>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
