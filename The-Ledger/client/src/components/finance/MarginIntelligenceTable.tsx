import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { getAllJobMargins } from "@/lib/profitabilityEngine";
import { useStore } from "@/lib/mockData";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const TARGET_MARGIN = 20;

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);
}

/**
 * MarginIntelligenceTable
 *
 * Phase 5.2 — Portfolio-level margin comparison.
 * Replaces the disconnected JobProfitabilityTable (which used mock `any` props).
 * All data sourced from getAllJobMargins() → getJobFinancialSummary().
 * Single Source of Financial Truth preserved.
 */
export function MarginIntelligenceTable({ targetMargin = TARGET_MARGIN }: { targetMargin?: number }) {
  const { jobs } = useStore();
  const [, setLocation] = useLocation();

  const records = getAllJobMargins(jobs, targetMargin);
  const active = records.filter((r) => r.hasActivity);
  const inactive = records.filter((r) => !r.hasActivity);

  // Portfolio-level KPIs from jobs with activity
  const totalRevenue = active.reduce((s, r) => s + r.summary.totalRevenue, 0);
  const totalCost = active.reduce((s, r) => s + r.summary.totalCost, 0);
  const totalProfit = active.reduce((s, r) => s + r.summary.grossProfit, 0);
  const avgMargin = active.length > 0
    ? active.reduce((s, r) => s + r.summary.marginPercent, 0) / active.length
    : 0;
  const highest = active.length > 0 ? active[0] : null;
  const lowest = active.length > 0 ? active[active.length - 1] : null;
  const belowCount = active.filter((r) => r.belowThreshold).length;

  function MarginBadge({ margin, belowThreshold }: { margin: number; belowThreshold: boolean }) {
    if (!belowThreshold && margin >= targetMargin) {
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />{margin.toFixed(1)}%
        </Badge>
      );
    }
    if (margin > 0) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium text-xs">
          <Minus className="h-3 w-3 mr-1" />{margin.toFixed(1)}%
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-medium text-xs">
        <TrendingDown className="h-3 w-3 mr-1" />{margin.toFixed(1)}%
      </Badge>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio KPI strip */}
      {active.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Revenue', value: fmt(totalRevenue), sub: `${active.length} jobs`, color: 'text-slate-900' },
            { label: 'Total Cost', value: fmt(totalCost), sub: 'Approved spend', color: 'text-slate-700' },
            { label: 'Total Profit', value: fmt(totalProfit), sub: '', color: totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700' },
            { label: 'Avg Margin', value: `${avgMargin.toFixed(1)}%`, sub: `Target ${targetMargin}%`, color: avgMargin >= targetMargin ? 'text-emerald-700' : 'text-amber-700' },
            { label: 'Best Job', value: highest?.job.title ?? '—', sub: highest ? `${highest.summary.marginPercent.toFixed(1)}%` : '', color: 'text-emerald-700', small: true },
            { label: 'Below Target', value: `${belowCount}`, sub: `< ${targetMargin}% margin`, color: belowCount > 0 ? 'text-rose-700' : 'text-emerald-700' },
          ].map(({ label, value, sub, color, small }) => (
            <Card key={label} className="shadow-none border-slate-200">
              <CardHeader className="pb-1 pt-4 px-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className={cn('font-bold leading-tight', small ? 'text-sm' : 'text-xl', color)}>
                  {value}
                </p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Per-job table */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-base text-slate-900">
            Job Margin Ranking
            <span className="text-xs font-normal text-muted-foreground ml-2">
              — source: approved financial records via getJobFinancialSummary()
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Activity className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">No jobs found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Gross Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-center">Signal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => {
                  const { job, summary, belowThreshold, hasActivity, rank } = r;
                  const profitColor = summary.grossProfit >= 0
                    ? 'text-emerald-700 font-semibold'
                    : 'text-rose-700 font-semibold';

                  let signal = 'Healthy';
                  let signalClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (!hasActivity) {
                    signal = 'No Data';
                    signalClass = 'bg-slate-50 text-slate-500 border-slate-200';
                  } else if (summary.grossProfit < 0) {
                    signal = 'Loss';
                    signalClass = 'bg-rose-50 text-rose-700 border-rose-200';
                  } else if (belowThreshold) {
                    signal = 'Below Target';
                    signalClass = 'bg-amber-50 text-amber-700 border-amber-200';
                  }

                  return (
                    <TableRow
                      key={job.id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => setLocation(`/jobs/${job.id}`)}
                    >
                      <TableCell className="text-muted-foreground text-xs font-mono">
                        {hasActivity ? rank : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-800 max-w-[200px] truncate">{job.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">{job.jobId}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">{job.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-slate-700">
                        {hasActivity ? fmt(summary.totalRevenue) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {hasActivity ? fmt(summary.totalCost) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className={cn('text-right', hasActivity ? profitColor : 'text-muted-foreground text-xs')}>
                        {hasActivity ? fmt(summary.grossProfit) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {hasActivity ? (
                          <MarginBadge margin={summary.marginPercent} belowThreshold={belowThreshold} />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn('text-xs font-normal', signalClass)}>
                          {signal}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {inactive.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {inactive.length} job{inactive.length !== 1 ? 's' : ''} with no approved financial activity
          {' '}shown at the bottom. Approve a worker report to see financial data.
        </p>
      )}
    </div>
  );
}
