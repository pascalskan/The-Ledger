import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

type Status = "pass" | "fail" | "pending";

interface CheckItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: Status;
}

const initialChecks: CheckItem[] = [
  // Worker Reporting
  { id: "wr1", category: "Worker Reporting", title: "Report Creation", description: "Worker can create a new operational report.", status: "pending" },
  { id: "wr2", category: "Worker Reporting", title: "Queue Insertion", description: "New reports are correctly added to the offline queue.", status: "pending" },
  { id: "wr3", category: "Worker Reporting", title: "Upload Attachment", description: "Worker can attach and preview uploads to a report.", status: "pending" },
  { id: "wr4", category: "Worker Reporting", title: "Secure Worker Attribution", description: "Reports are correctly associated with the logged-in worker.", status: "pending" },

  // Offline Architecture
  { id: "oa1", category: "Offline Architecture", title: "Queue Persistence", description: "The offline queue survives browser refresh and close.", status: "pending" },
  { id: "oa2", category: "Offline Architecture", title: "Hydration Restoration", description: "On app load, the queue state is correctly restored from localStorage.", status: "pending" },
  { id: "oa3", category: "Offline Architecture", title: "Replay Restoration", description: "Pending items are automatically re-queued for sync on rehydration.", status: "pending" },
  { id: "oa4", category: "Offline Architecture", title: "Auto Sync on Reconnect", description: "The queue automatically starts syncing when the app comes back online.", status: "pending" },

  // Upload Lifecycle
  { id: "ul1", category: "Upload Lifecycle", title: "Preview Rendering", description: "Upload previews are correctly generated and displayed.", status: "pending" },
  { id: "ul2", category: "Upload Lifecycle", title: "Retry Flow", description: "Failed uploads can be manually retried by the worker.", status: "pending" },
  { id: "ul3", category: "Upload Lifecycle", title: "Deletion Flow", description: "Uploads can be removed from a queued report.", status: "pending" },
  { id: "ul4", category: "Upload Lifecycle", title: "Conflict Flow", description: "Upload conflicts are correctly flagged for manual review.", status: "pending" },
  { id: "ul5", category: "Upload Lifecycle", title: "Progress Rendering", description: "Upload progress is accurately reflected in the UI.", status: "pending" },

  // Governance
  { id: "gv1", category: "Governance", title: "Correction Flow", description: "Workers can add correction notes to a conflict.", status: "pending" },
  { id: "gv2", category: "Governance", title: "Resubmission Flow", description: "Corrected items are correctly resubmitted to the queue.", status: "pending" },
  { id: "gv3", category: "Governance", title: "Lineage Preservation", description: "The history of a conflict and its resolution is preserved.", status: "pending" },
  { id: "gv4", category: "Governance", title: "Conflict Review UI", description: "The conflict review modal provides all necessary information.", status: "pending" },

  // Doctrine Validation
  { id: "dv1", category: "Doctrine Validation", title: "No Direct Stock Deduction", description: "Worker actions do not directly alter inventory levels.", status: "pending" },
  { id: "dv2", category: "Doctrine Validation", title: "No Direct Invoice Mutation", description: "Worker actions do not create or modify invoices.", status: "pending" },
  { id: "dv3", category: "Doctrine Validation", title: "No Direct Payroll Mutation", description: "Worker time logs do not directly affect payroll records.", status: "pending" },
  { id: "dv4", category: "Doctrine Validation", title: "No Direct Financial State Mutation", description: "Worker submissions are purely operational and do not touch financial systems.", status: "pending" },
];

const StatusIcon = ({ status }: { status: Status }) => {
  if (status === "pass") return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (status === "fail") return <XCircle className="w-5 h-5 text-red-500" />;
  return <div className="w-5 h-5 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-slate-400" /></div>;
};

export function Phase2ValidationChecklist() {
  const [checks, setChecks] = useState<CheckItem[]>(initialChecks);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Worker Reporting": true,
  });

  const toggleStatus = (id: string) => {
    setChecks(prev =>
      prev.map(c => {
        if (c.id !== id) return c;
        const nextStatus: Status = c.status === "pending" ? "pass" : c.status === "pass" ? "fail" : "pending";
        return { ...c, status: nextStatus };
      })
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const categories = [...new Set(checks.map(c => c.category))];
  const overallProgress = (checks.filter(c => c.status === "pass").length / checks.length) * 100;

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Phase 2 QA Checklist</h3>
          <p className="text-sm text-muted-foreground">Enterprise Hardening & Validation</p>
        </div>
        <div className="text-right">
            <div className="font-bold text-lg">{Math.round(overallProgress)}%</div>
            <div className="text-xs text-muted-foreground">Complete</div>
        </div>
      </div>
      
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${overallProgress}%` }}></div>
      </div>

      {categories.map(category => (
        <div key={category} className="rounded-xl border border-border">
          <button
            onClick={() => toggleCategory(category)}
            className="w-full flex items-center justify-between p-3 bg-muted hover:bg-muted"
          >
            <h4 className="font-semibold text-sm">{category}</h4>
            {expandedCategories[category] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {expandedCategories[category] && (
            <div className="divide-y divide-slate-100">
              {checks.filter(c => c.category === category).map(check => (
                <div key={check.id} className="p-3 flex items-start gap-3">
                  <button onClick={() => toggleStatus(check.id)} className="mt-1">
                    <StatusIcon status={check.status} />
                  </button>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{check.title}</p>
                    <p className="text-xs text-muted-foreground">{check.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}