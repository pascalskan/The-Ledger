import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useStore, useAuth } from "@/lib/mockData";
import { 
  Briefcase, 
  Users, 
  Truck, 
  AlertCircle, 
  TrendingUp,
  Clock,
  CheckCircle2,
  CalendarDays,
  FileWarning
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Dashboard() {
  const { jobs, workers, equipment, invoices, roles } = useStore();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const activeJobs = jobs.filter(j => j.status === "Active");
  const upcomingJobs = jobs.filter(j => j.status === "Planned").sort((a,b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  const overdueInvoices = invoices.filter(i => {
    const isOverdue = i.status !== "Paid" && i.status !== "Void" && new Date(i.dueDate) < new Date();
    return isOverdue || i.status === "Overdue";
  });
  const availableWorkers = workers.filter(w => w.status === "Active").length;

  const stats = [
    { title: "Active Jobs", value: activeJobs.length, icon: Briefcase, color: "text-blue-500" },
    { title: "Staff Utility", value: workers.length > 0 ? `${Math.round(((workers.length - availableWorkers) / workers.length) * 100)}%` : "0%", icon: Users, color: "text-green-500" },
    { title: "Assets Deploy", value: equipment.filter(e => e.status !== "Available").length, icon: Truck, color: "text-orange-500" },
    { title: "Overdue Rev", value: `$${overdueInvoices.reduce((a, b) => a + b.lineItems.reduce((s, l) => s + (l.qty * l.unitPrice), 0), 0).toLocaleString()}`, icon: FileWarning, color: "text-red-500" }
  ];

  const isWorker = (user?.roleIds || []).some((rid) => roles.find((r) => r.id === rid)?.name === "Worker");

  const userJobs = isWorker
    ? jobs.filter((j) => j.assignedWorkerIds.includes(user?.id || ""))
    : jobs;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}</h2>
            <p className="text-muted-foreground mt-1">Here is what is happening at The Ledger today.</p>
          </div>
          <Badge variant="outline" className="px-3 py-1 text-xs font-mono uppercase tracking-wider border-primary/20 bg-primary/5">
            System Status: Operational
          </Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-slate-200/60 shadow-sm overflow-hidden group">
              <div className={cn("h-1 w-full", stat.color.replace('text-', 'bg-'))} />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 border-slate-200/60 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{isWorker ? "My Active Assignments" : "Recent Job Activity"}</CardTitle>
                <CardDescription>Track project progress and site locations.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setLocation("/jobs")}>View All</Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userJobs.slice(0, 6).map((job) => (
                  <div 
                    key={job.id} 
                    className="flex items-center gap-4 p-3 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all group cursor-pointer"
                    onClick={() => setLocation(`/jobs/${job.id}`)}
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm text-primary group-hover:underline">{job.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{job.locationAddress}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={job.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] h-5">{job.status}</Badge>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono">{job.jobId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card className="col-span-3 border-slate-200/60 shadow-sm">
            <CardHeader>
              <CardTitle>Schedule Priority</CardTitle>
              <CardDescription>Upcoming critical milestones.</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="space-y-4">
                {upcomingJobs.slice(0, 6).map(job => (
                  <div 
                    key={job.id} 
                    className="flex gap-4 items-start p-2 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/jobs/${job.id}`)}
                  >
                    <div className={cn(
                      "w-1 h-10 rounded-full flex-shrink-0",
                      job.priority === 'Critical' ? "bg-red-500" : job.priority === 'High' ? "bg-orange-500" : "bg-blue-500"
                    )} />
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium text-sm truncate text-primary hover:underline">{job.title}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(job.startAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{job.priority}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
