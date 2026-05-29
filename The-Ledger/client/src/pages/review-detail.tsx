import { Layout } from "@/components/layout";
import { useStore } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, Clock, FileText, Image as ImageIcon, Search, AlertCircle, ChevronLeft, ArrowRight, User } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";

export default function ReviewDetailPage() {
  const { id } = useParams();
  const { jobs, workers, reviewItems, updateReviewItem } = useStore();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");

  const job = jobs.find(j => j.id === id);

  // Get real review items for this job
  const jobReviewItems = reviewItems.filter(r => r.jobId === id);
  const pendingItems = jobReviewItems.filter(item => item.status === "pending");

  if (!job) {
    return (
      <Layout>
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Job Not Found</h2>
          <p className="text-slate-500 mt-2 mb-6">The job you are looking for does not exist or you don't have access.</p>
          <Button onClick={() => setLocation("/review")}>Back to Review Center</Button>
        </div>
      </Layout>
    );
  }

  const handleApprove = (itemId: string) => {
    updateReviewItem(itemId, { status: "approved" });
  };

  const handleReject = (itemId: string) => {
    updateReviewItem(itemId, { status: "rejected" });
  };

  const filteredItems = activeTab === "all" 
    ? pendingItems 
    : activeTab === "report"
      ? pendingItems.filter(item => item.type === "report" || item.type === "worker-report")
      : pendingItems.filter(item => item.type === activeTab);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/review")}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">{job.title}</h2>
              <Badge variant="outline">{job.jobId}</Badge>
            </div>
            <p className="text-slate-500 mt-1">Review pending submissions for this job.</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <TabsList>
              <TabsTrigger value="all">All Pending ({pendingItems.length})</TabsTrigger>
              <TabsTrigger value="report">Reports ({pendingItems.filter(i => i.type === "report" || i.type === "worker-report").length})</TabsTrigger>
              <TabsTrigger value="photo">Photos ({pendingItems.filter(i => i.type === "photo").length})</TabsTrigger>
            </TabsList>
            
            {pendingItems.length > 0 && (
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve All Remaining
              </Button>
            )}
          </div>

          <TabsContent value={activeTab} className="mt-0">
            {filteredItems.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900">All Caught Up!</h3>
                  <p className="text-slate-500 mt-2">There are no pending items of this type to review.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredItems.map(item => (
                  <Card key={item.id} className="overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {/* Left side - Content */}
                      <div className="flex-1 p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {item.type === 'report' || item.type === 'worker-report' ? <FileText className="h-4 w-4 text-purple-500" /> : <ImageIcon className="h-4 w-4 text-blue-500" />}
                              <Badge variant="secondary" className="capitalize">
                                {item.type}
                              </Badge>
                              <span className="text-sm text-slate-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {item.submittedAt}
                              </span>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
                            <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                              <User className="h-4 w-4" /> Submitted by <span className="font-medium">{item.submittedBy}</span>
                            </div>
                          </div>
                        </div>

                        {(item.type === 'report' || item.type === 'worker-report') && (
                          <div className="mt-4 space-y-4">
                            {item.content && (
                              <div>
                                <h4 className="text-sm font-medium text-slate-900 mb-1">Summary</h4>
                                <p className="text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">{item.content}</p>
                              </div>
                            )}

                            {item.notes && !item.content && (
                               <div>
                                 <h4 className="text-sm font-medium text-slate-900 mb-1">Summary</h4>
                                 <p className="text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">{item.notes}</p>
                               </div>
                            )}
                            
                            {/* Legacy Items */}
                            {item.items && item.items.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-slate-900 mb-2">Materials Logged</h4>
                                <div className="bg-white border rounded-md overflow-hidden">
                                  {item.items.map((mat, idx) => (
                                    <div key={idx} className={`flex justify-between p-2 px-3 ${idx !== 0 ? 'border-t' : ''}`}>
                                      <span className="text-sm text-slate-700">{mat.name}</span>
                                      <span className="text-sm font-medium">{mat.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Phase 2 Materials Used */}
                            {item.materialsUsed && item.materialsUsed.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium text-slate-900 mb-2">Materials Logged</h4>
                                <div className="bg-white border rounded-md overflow-hidden">
                                  {item.materialsUsed.map((mat, idx) => (
                                    <div key={idx} className={`flex justify-between p-2 px-3 ${idx !== 0 ? 'border-t' : ''}`}>
                                      <span className="text-sm text-slate-700">{mat.stockItemName}</span>
                                      <span className="text-sm font-medium">Qty: {mat.quantity}{mat.unit ? ` ${mat.unit}` : ''}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {item.type === 'photo' && item.notes && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium text-slate-900 mb-1">Notes</h4>
                            <p className="text-slate-600 bg-slate-50 p-3 rounded-md border border-slate-100">{item.notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Middle/Right - Photo if applicable */}
                      {item.type === 'photo' && item.url && (
                        <div className="md:w-1/3 bg-slate-100 flex-shrink-0">
                          <img 
                            src={item.url} 
                            alt={item.title} 
                            className="w-full h-full object-cover min-h-[200px]"
                          />
                        </div>
                      )}

                      {/* Right side - Actions */}
                      <div className="bg-slate-50 p-6 border-t md:border-t-0 md:border-l border-slate-100 md:w-48 flex flex-row md:flex-col justify-center gap-3">
                        <Button 
                          className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white w-full"
                          onClick={() => handleApprove(item.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1 md:flex-none text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 w-full"
                          onClick={() => handleReject(item.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}