import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, PoundSterling, Clock, Users, Truck, AlertTriangle, FileText, CheckCircle2, Activity } from "lucide-react";

interface JobData {
  title: string;
  contractValue: number;
  costToDate: number;
  marginStatus: 'Green' | 'Yellow' | 'Red';
  forecastMarginPct: number;
  remainingLaborHours: number;
  crewCount: number;
  equipmentCount?: number;
  hasConflict: boolean;
}

interface DayData {
  dateStr: string;
  totalScheduledRevenue: number;
  totalEstimatedLaborCost: number;
  netContribution: number;
  crewAllocationPct: number;
}

type OperationalDrawerProps = {
  onClose: () => void;
} & (
  | { type: 'job'; selectedItem: JobData | null }
  | { type: 'day'; selectedItem: DayData | null }
);

export function OperationalDrawer(props: OperationalDrawerProps) {
  if (!props.selectedItem) return null;

  const { onClose, type } = props;
  const selectedItem = props.selectedItem as JobData & DayData;

  const formatCur = (val: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="w-80 lg:w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] transition-transform duration-300 transform translate-x-0">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>
          <h3 className="font-semibold text-slate-900">{type === 'job' ? 'Job Analysis' : 'Daily Rollup'}</h3>
          <p className="text-xs text-slate-500">{type === 'job' ? selectedItem.title : selectedItem.dateStr}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 hover:text-slate-800">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {type === 'job' ? (
          <>
            {/* QB Financial Data */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> QuickBooks Data
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <div className="text-[10px] text-slate-500 mb-1">Contract Value</div>
                  <div className="font-semibold text-slate-900">{formatCur(selectedItem.contractValue)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-100">
                  <div className="text-[10px] text-slate-500 mb-1">Cost to Date</div>
                  <div className="font-semibold text-slate-700">{formatCur(selectedItem.costToDate)}</div>
                </div>
              </div>
            </div>

            {/* Operational Forecast */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Forecast Margin
              </h4>
              <div className={`p-4 rounded-lg border ${
                selectedItem.marginStatus === 'Green' ? 'bg-emerald-50/50 border-emerald-100' :
                selectedItem.marginStatus === 'Yellow' ? 'bg-amber-50 border-amber-200' :
                'bg-rose-50 border-rose-200'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-slate-700">Internal Forecast</span>
                  <span className={`text-lg font-bold ${
                    selectedItem.marginStatus === 'Green' ? 'text-emerald-700' :
                    selectedItem.marginStatus === 'Yellow' ? 'text-amber-700' :
                    'text-rose-700'
                  }`}>{selectedItem.forecastMarginPct}%</span>
                </div>
                <div className="text-xs text-slate-500">
                  Calculated based on scheduled hours and QB costs.
                </div>
              </div>
            </div>

            {/* Allocation */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Resource Allocation
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Remaining Labor</span>
                  <span className="font-medium text-slate-800">{selectedItem.remainingLaborHours} hrs</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Assigned Crew</span>
                  <span className="font-medium text-slate-800">{selectedItem.crewCount} Personnel</span>
                </div>
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-600">Equipment</span>
                  <span className="font-medium text-slate-800">{selectedItem.equipmentCount || 0} Units</span>
                </div>
              </div>
            </div>

            {/* Risk Flags */}
            {selectedItem.hasConflict && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-md flex items-start gap-2 text-rose-800 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                <div>
                  <div className="font-semibold text-xs mb-0.5">Resource Conflict Detected</div>
                  <div className="text-xs opacity-90">Crew member scheduled on conflicting site.</div>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Daily Rollup */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 bg-blue-50/50 rounded border border-blue-100">
                <div className="text-[10px] text-blue-600 uppercase font-semibold mb-1 tracking-wider">Scheduled Rev</div>
                <div className="text-lg font-bold text-blue-900">{formatCur(selectedItem.totalScheduledRevenue)}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1 tracking-wider">Est. Labor Cost</div>
                <div className="text-lg font-bold text-slate-800">{formatCur(selectedItem.totalEstimatedLaborCost)}</div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between mb-6">
              <div>
                <div className="text-[10px] text-emerald-600 uppercase font-semibold mb-0.5 tracking-wider">Net Contribution</div>
                <div className="text-xl font-bold text-emerald-800">{formatCur(selectedItem.netContribution)}</div>
              </div>
              <Activity className="h-6 w-6 text-emerald-500 opacity-50" />
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Capacity Utilization
              </h4>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">Crew Allocation</span>
                  <span className="text-slate-900 font-bold">{selectedItem.crewAllocationPct}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className={`h-full rounded-full ${selectedItem.crewAllocationPct > 85 ? 'bg-amber-400' : 'bg-slate-700'}`} style={{ width: `${selectedItem.crewAllocationPct}%` }}></div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
