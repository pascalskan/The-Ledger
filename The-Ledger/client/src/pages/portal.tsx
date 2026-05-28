import { useState } from "react";
import { useStore } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2, MessageSquare, Briefcase, Users, Calendar, MapPin, Send, ArrowLeft, ShieldCheck, UserCircle, CheckCircle2, Package, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { ProjectProgress } from "@/components/portal/ProjectProgress";
import { FinancialOverview } from "@/components/portal/FinancialOverview";
import { ProjectDocuments } from "@/components/portal/ProjectDocuments";
import { ProjectContacts } from "@/components/portal/ProjectContacts";
import { AssignedCrew } from "@/components/portal/AssignedCrew";
import { NextVisit } from "@/components/portal/NextVisit";
import { ActivityTimeline } from "@/components/portal/ActivityTimeline";

export default function PortalPage() {
  const { allClients: clients, allJobs: jobs, allWorkers: workers, allRoles: roles } = useStore();
  const { toast } = useToast();
  
  const [loggedClientId, setLoggedClientId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  
  // Mock comments state local to the portal session
  const [comments, setComments] = useState<Record<string, {author: string, text: string, date: string}[]>>({});
  const [newComment, setNewComment] = useState("");

  if (!loggedClientId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center mb-8 gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <ShieldCheck className="h-8 w-8 text-slate-800" />
            <span>The Ledger Portal</span>
          </div>
          <Card className="shadow-lg border-0">
            <CardHeader className="space-y-1 pb-6 text-center">
              <CardTitle className="text-2xl font-semibold text-slate-900">Client Sign In</CardTitle>
              <CardDescription>
                Welcome to your client portal. Access your jobs, crew, and project details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email or Access Code</Label>
                <Input placeholder="name@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" />
              </div>
              <Button className="w-full h-11 text-base font-medium bg-slate-900 hover:bg-slate-800 text-white" onClick={() => setLoggedClientId("dc1")}>
                Sign In
              </Button>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-slate-500">Or try demo</span></div>
              </div>
              <Button variant="outline" className="w-full h-11 border-slate-300 text-slate-700" onClick={() => setLoggedClientId("dc1")}>
                Demo Account (HSS Limited)
              </Button>
            </CardContent>
          </Card>
          <div className="text-center mt-6 text-xs text-slate-400">
            Protected by The Ledger Operations Platform
          </div>
        </div>
      </div>
    );
  }

  const client = clients.find(c => c.id === loggedClientId);
  const clientJobs = jobs.filter(j => j.clientId === loggedClientId);
  const selectedJob = clientJobs.find(j => j.id === selectedJobId);

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedJobId) return;
    
    setComments(prev => ({
      ...prev,
      [selectedJobId]: [
        ...(prev[selectedJobId] || []),
        { author: client?.name || "Client", text: newComment, date: new Date().toISOString() }
      ]
    }));
    setNewComment("");
    toast({ title: "Request sent", description: "Your comment has been added to the project." });
  };

  // Mock data for components
  const mockDocuments = [
    { name: "Signed Quote (PDF)", date: "12 Oct 2023" },
    { name: "RAMS (PDF)", date: "14 Oct 2023" },
    { name: "Insurance Certificate (PDF)", date: "01 Nov 2023" },
    ...(selectedJob?.status === 'Completed' ? [{ name: "Completion Certificate", date: "28 Nov 2023" }] : [])
  ];

  const mockActivities = [
    { title: "Job Created", date: "10 Oct 2023", description: "Project brief received and created in system.", icon: CheckCircle2 },
    { title: "Scheduled", date: "12 Oct 2023", description: "Crew and dates confirmed.", icon: Calendar },
    { title: "Materials Ordered", date: "15 Oct 2023", description: "Supplies requested from wholesaler.", icon: Package },
    { title: "Work Started", date: "20 Oct 2023", description: "Crew on site.", icon: Wrench },
  ];

  const mappedCrew = selectedJob?.assignedWorkerIds.map(wid => {
    const w = workers.find(worker => worker.id === wid);
    if (!w) return null;
    return {
      initials: `${w.firstName[0]}${w.lastName[0]}`,
      name: `${w.firstName} ${w.lastName}`,
      role: w.roleIds.map(rid => roles.find(r => r.id === rid)?.name).filter(Boolean).join(", ") || "Crew Member",
      scheduledDate: new Date(selectedJob.startAt).toLocaleDateString()
    };
  }).filter(Boolean) || [];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Portal Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-slate-800" />
          <span className="font-bold text-lg tracking-tight hidden sm:inline-block text-slate-900">The Ledger Portal</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200">
            <Building2 className="h-4 w-4 text-slate-500" />
            {client?.name}
          </div>
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900" onClick={() => { setLoggedClientId(null); setSelectedJobId(null); }}>
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {!selectedJobId ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Projects</h1>
              <p className="text-slate-500 mt-1">Track progress, view crew, and manage requests.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {clientJobs.map(job => (
                <Card 
                  key={job.id} 
                  className="cursor-pointer border-slate-200 hover:border-slate-400 hover:shadow-md transition-all group"
                  onClick={() => setSelectedJobId(job.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Badge variant="outline" className={`mb-2 font-normal ${job.status === 'Completed' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          {job.status}
                        </Badge>
                        <CardTitle className="text-lg group-hover:text-slate-900 text-slate-800 transition-colors">{job.title}</CardTitle>
                      </div>
                      <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">{job.jobId}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{job.locationAddress}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                        <span>{new Date(job.startAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span>{job.assignedWorkerIds.length} Crew</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 text-slate-700">View Details</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {clientJobs.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-lg bg-white">
                  <Briefcase className="h-8 w-8 mx-auto text-slate-400 mb-3" />
                  <h3 className="text-lg font-medium text-slate-800">No projects found</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1">There are currently no active or historical projects assigned to your account.</p>
                </div>
              )}
            </div>
          </div>
        ) : selectedJob && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-12">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setSelectedJobId(null)} className="-ml-3 text-slate-500 hover:text-slate-900">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Projects
              </Button>
              <div className="text-xs text-slate-400 font-medium tracking-wide">Last Updated: Today at {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="outline" className={`font-normal ${selectedJob.status === 'Completed' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                    {selectedJob.status}
                  </Badge>
                  <span className="text-sm font-mono text-slate-500">{selectedJob.jobId}</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">{selectedJob.title}</h1>
              </div>
            </div>

            {/* Project Progress Tracker */}
            <ProjectProgress status={selectedJob.status} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
              {/* Main Content - Left Column */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Project Overview */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                    <CardTitle className="text-lg">Project Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm pt-5">
                    <p className="text-slate-700 leading-relaxed text-base">{selectedJob.description}</p>
                    
                    <div className="grid sm:grid-cols-2 gap-6 pt-5 border-t border-slate-100">
                      <div className="space-y-1.5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Location</span>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                          <span className="text-slate-800 font-medium">{selectedJob.locationAddress}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Schedule</span>
                        <div className="flex items-start gap-2">
                          <Calendar className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                          <div>
                            <div className="text-slate-800 font-medium">{new Date(selectedJob.startAt).toLocaleDateString()}</div>
                            <div className="text-slate-500 text-xs mt-0.5">{new Date(selectedJob.startAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Overview */}
                <FinancialOverview quote={8500} variations={1200} invoiced={4000} paid={4000} />

                {/* Documents Section */}
                <ProjectDocuments documents={mockDocuments} />

                {/* Activity Timeline */}
                <ActivityTimeline activities={mockActivities} />

                {/* Comment Thread */}
                <Card className="shadow-sm border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-slate-500" /> 
                      Comments & Requests
                    </CardTitle>
                    <CardDescription>Leave a message for the project manager or operations team.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-5">
                    <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2">
                      {/* Initial Mock Comment from PM */}
                      <div className="flex gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                          <UserCircle className="h-5 w-5" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none p-4 text-sm flex-1 shadow-sm">
                          <div className="font-medium mb-1.5 flex items-center justify-between">
                            <span className="text-slate-800">Project Manager</span>
                            <span className="text-xs text-slate-400 font-normal">Yesterday</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">Hi team, please let us know if you have any questions about the upcoming works. We're looking forward to getting started.</p>
                        </div>
                      </div>

                      {/* User Comments */}
                      {(comments[selectedJob.id] || []).map((comment, i) => (
                        <div key={i} className="flex gap-3 flex-row-reverse">
                          <div className="h-9 w-9 rounded-full bg-slate-800 text-white flex items-center justify-center shrink-0 font-bold text-xs shadow-sm">
                            YOU
                          </div>
                          <div className="bg-white border border-slate-200 rounded-xl rounded-tr-none p-4 text-sm flex-1 shadow-sm">
                            <div className="font-medium mb-1.5 flex items-center justify-between">
                              <span className="text-xs text-slate-400 font-normal">{new Date(comment.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              <span className="text-slate-800">{comment.author}</span>
                            </div>
                            <p className="text-slate-700 leading-relaxed">{comment.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-5 border-t border-slate-100 mt-2">
                      <Input 
                        placeholder="Type a message or request..." 
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                        className="bg-slate-50 border-slate-200 focus-visible:ring-slate-400"
                      />
                      <Button onClick={handleAddComment} size="icon" className="shrink-0 bg-slate-800 hover:bg-slate-700 text-white">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Content - Right Column */}
              <div className="space-y-8">
                <ProjectContacts />
                
                <AssignedCrew crew={mappedCrew} />
                
                <NextVisit 
                  date={selectedJob.status !== 'Completed' ? selectedJob.startAt : undefined} 
                  timeWindow="08:00 - 16:00"
                  crewSize={selectedJob.assignedWorkerIds.length}
                  notes="Please ensure site access is clear and induction documentation is signed before arrival."
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
