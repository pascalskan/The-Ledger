/**
 * PHASE 5.9 — EXCEPTIONS TAB
 *
 * Displays exception counts and summary in Financial Explorer.
 * Reuses existing tab architecture pattern from Phase 5.8.
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
} from "lucide-react";
import {
  SEED_EXCEPTIONS,
  EXCEPTION_STATUS_LABELS,
  EXCEPTION_STATUS_COLORS,
  EXCEPTION_TYPE_LABELS,
  EXCEPTION_TYPE_COLORS,
  computeExceptionSummary,
} from "@/lib/exceptionResolutionEngine";
import {
  SEED_FINANCIAL_CONTROLS,
  CONTROL_STATE_LABELS,
  CONTROL_STATE_COLORS,
  computeControlSummary,
} from "@/lib/financialControlsEngine";

export function ExceptionsTab() {
  const [, setLocation] = useLocation();

  const exceptionSummary = useMemo(
    () => computeExceptionSummary(SEED_EXCEPTIONS),
    []
  );
  const controlSummary = useMemo(
    () => computeControlSummary(SEED_FINANCIAL_CONTROLS),
    []
  );

  const kpiCards = [
    {
      label: "Open Exceptions",
      value: exceptionSummary.open,
      icon: AlertTriangle,
      color: "text-red-600",
      testId: "exc-tab-kpi-open",
    },
    {
      label: "Investigating",
      value: exceptionSummary.underInvestigation,
      icon: Search,
      color: "text-blue-600",
      testId: "exc-tab-kpi-investigating",
    },
    {
      label: "Pending Approval",
      value: exceptionSummary.awaitingApproval,
      icon: Clock,
      color: "text-amber-600",
      testId: "exc-tab-kpi-pending",
    },
    {
      label: "Resolved",
      value: exceptionSummary.resolved,
      icon: CheckCircle2,
      color: "text-emerald-600",
      testId: "exc-tab-kpi-resolved",
    },
  ];

  return (
    <div className="mt-4 space-y-6" data-testid="exc-tab-panel">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="exc-tab-kpi-strip">
        {kpiCards.map(({ label, value, icon: Icon, color, testId }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex items-center gap-2">
              <Icon className={`h-5 w-5 flex-shrink-0 ${color}`} />
              <span className="text-2xl font-bold" data-testid={testId}>
                {value}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pending Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <span className="text-2xl font-bold text-amber-600" data-testid="exc-tab-controls-pending">
              {controlSummary.pending}
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Approved Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <span className="text-2xl font-bold text-emerald-600" data-testid="exc-tab-controls-approved">
              {controlSummary.approved}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Recent exceptions table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Recent Exceptions</h3>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={() => setLocation("/exception-resolution-center")}
            data-testid="exc-tab-link-centre"
          >
            <ExternalLink className="h-3 w-3 mr-1" /> Open Resolution Centre
          </Button>
        </div>
        <div className="border rounded-md" data-testid="exc-tab-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exception ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SEED_EXCEPTIONS.slice(0, 6).map((exc) => (
                <TableRow key={exc.id} data-testid={`exc-tab-row-${exc.id}`}>
                  <TableCell className="font-mono text-xs">{exc.exceptionNumber}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${EXCEPTION_TYPE_COLORS[exc.type]}`}
                    >
                      {EXCEPTION_TYPE_LABELS[exc.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[140px] truncate">
                    {exc.jobName ?? exc.clientName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${EXCEPTION_STATUS_COLORS[exc.status]}`}
                    >
                      {EXCEPTION_STATUS_LABELS[exc.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
