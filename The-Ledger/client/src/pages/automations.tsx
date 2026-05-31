import { Layout } from "@/components/layout";
import { useStore, Automation } from "@/lib/mockData";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Settings, Zap, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AutomationsPage() {
  const { automations, automationLogs, updateAutomation } = useStore();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<"automations" | "activity">("automations");

  const handleToggle = (auto: Automation) => {
    updateAutomation(auto.id, { isActive: !auto.isActive });
    toast({ 
      title: auto.isActive ? "Automation Disabled" : "Automation Enabled", 
      description: `${auto.name} is now ${auto.isActive ? "disabled" : "active"}.` 
    });
  };

  return (
    <Layout>
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Automations</h2>
            <p className="text-muted-foreground mt-1">
              Automatically trigger actions based on operational events.
            </p>
          </div>
        </div>

        {/* Custom Tabs */}
        <div className="flex border-b border-slate-200">
          <button 
            className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === "automations" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab("automations")}
          >
            Automations
          </button>
          <button 
            className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-colors", activeTab === "activity" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}
            onClick={() => setActiveTab("activity")}
          >
            Activity Log
          </button>
        </div>

        {activeTab === "automations" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {automations.map(auto => (
              <Card key={auto.id} className={cn("overflow-hidden transition-all", !auto.isActive && "opacity-75")}>
                <div className={cn("h-1 w-full", auto.isActive ? "bg-green-500" : "bg-slate-300")} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-1">
                    <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider", auto.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500")}>
                      {auto.isActive ? "Active" : "Disabled"}
                    </Badge>
                    <Switch 
                      checked={auto.isActive} 
                      onCheckedChange={() => handleToggle(auto)} 
                      className="scale-75 origin-right"
                    />
                  </div>
                  <CardTitle className="text-lg leading-tight mt-1">{auto.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5" /> Scope: {auto.scope}
                    </div>
                    {auto.lastTriggered && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(auto.lastTriggered).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            {automations.length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                <Zap className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-900">No automations found</h3>
                <p className="text-sm text-slate-500 mt-1">Check back later for available automations.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b pb-4">
              <CardTitle role="heading" className="text-lg">Activity Log</CardTitle>
              <CardDescription>Recent automation triggers and executions.</CardDescription>
            </CardHeader>
            <div className="divide-y divide-slate-100">
              {automationLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center shrink-0", 
                      log.status === "Success" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    )}>
                      {log.status === "Success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{log.automationName}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.entityAffected}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={cn("text-[10px]", log.status === "Success" ? "text-green-700" : "text-red-700")}>
                      {log.status}
                    </Badge>
                    <p className="text-xs text-slate-400 mt-1.5">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {automationLogs.length === 0 && (
                 <div className="p-8 text-center text-slate-500 text-sm">No activity recorded yet.</div>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}