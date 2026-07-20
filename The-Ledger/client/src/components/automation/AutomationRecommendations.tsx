/**
 * UX-6.8 — AUTOMATION RECOMMENDATIONS
 *
 * Executive intelligence layer: proactively answers "what should I automate
 * next?" and "where is automation underutilised?" via advisory recommendation
 * cards, a platform opportunity score, and a rolling insights feed.
 *
 * Doctrine: ADVISORY ONLY. Nothing here creates or modifies automations,
 * schedules, governance actions, approvals, or financial records. The
 * "Build From Recommendation" CTA simply launches the existing Automation
 * Builder (empty) so the CEO builds it themselves with all safeguards intact.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Lightbulb,
  Sparkles,
  TrendingUp,
  Gauge,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Wrench,
  Landmark,
  Gavel,
  ArrowRight,
  Target,
  CheckCircle2,
} from "lucide-react";
import {
  type AutomationRecommendation,
  type RecommendationGroup,
  RECOMMENDATION_CATEGORY_COLORS,
  IMPACT_COLORS,
  COMPLEXITY_COLORS,
  getRecommendations,
  getHeadlineInsights,
  computeRecommendationSummary,
  computeOpportunityScore,
  inGroup,
} from "@/lib/automationRecommendationEngine";
import { RISK_LEVEL_LABELS, RISK_LEVEL_COLORS } from "@/lib/automationGovernanceEngine";

const GROUPS: { key: RecommendationGroup | "All"; label: string; icon: typeof Zap }[] = [
  { key: "All", label: "All", icon: Sparkles },
  { key: "High Impact", label: "High Impact", icon: TrendingUp },
  { key: "Quick Wins", label: "Quick Wins", icon: Zap },
  { key: "Financial", label: "Financial", icon: Landmark },
  { key: "Governance", label: "Governance", icon: Gavel },
  { key: "Operational", label: "Operational", icon: Wrench },
];

// ── Detail dialog ───────────────────────────────────────────────────────

function RecommendationDetailDialog({
  rec, onClose, onBuild,
}: { rec: AutomationRecommendation; onClose: () => void; onBuild?: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto" data-testid="aut-rec-detail-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" />{rec.title}</DialogTitle>
          <DialogDescription>{rec.id} · {rec.area}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Advisory banner */}
          <div className="flex items-start gap-2 rounded-md bg-violet-50 border border-violet-200 px-3 py-2.5 text-xs text-violet-700" data-testid="aut-rec-detail-advisory">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Advisory only. This recommendation creates nothing — you remain in control and build any automation yourself in the Automation Builder.</p>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`text-xs ${RECOMMENDATION_CATEGORY_COLORS[rec.category]}`}>{rec.category}</Badge>
            <Badge variant="outline" className={`text-xs ${IMPACT_COLORS[rec.impact]}`}>{rec.impact} Impact</Badge>
            <Badge variant="outline" className={`text-xs ${COMPLEXITY_COLORS[rec.complexity]}`}>{rec.complexity} Complexity</Badge>
            <Badge variant="outline" className={`text-xs ${RISK_LEVEL_COLORS[rec.riskLevel]}`}>{RISK_LEVEL_LABELS[rec.riskLevel]} Risk</Badge>
            {rec.isFinanciallySensitive && (<Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50"><ShieldAlert className="h-3 w-3 mr-1" />Financially Sensitive</Badge>)}
          </div>

          <section><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Business Problem</h4><p className="text-sm">{rec.businessProblem}</p></section>
          <section><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Proposed Automation</h4><p className="text-sm">{rec.description}</p></section>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Suggested Trigger</span><div className="mt-1 font-medium" data-testid="aut-rec-detail-trigger">{rec.recommendedTrigger}</div></div>
            <div><span className="text-xs text-muted-foreground">Est. Time Saved</span><div className="mt-1 font-medium">{rec.estimatedHoursSavedPerWeek}h / week</div></div>
          </div>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Suggested Conditions</h4>
            <div className="flex flex-wrap gap-1.5">{rec.suggestedConditions.map((c) => (<span key={c} className="font-mono text-[11px] bg-muted px-2 py-0.5 rounded">{c}</span>))}</div>
          </section>
          <section data-testid="aut-rec-detail-actions">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Suggested Actions</h4>
            <ul className="space-y-1">{rec.recommendedActions.map((a) => (<li key={a} className="flex items-center gap-2 text-sm"><ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />{a}</li>))}</ul>
          </section>

          <section data-testid="aut-rec-detail-governance">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Governance Considerations</h4>
            <p className="text-sm text-muted-foreground">{rec.governanceConsiderations}</p>
          </section>
          <section data-testid="aut-rec-detail-safeguards">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Financial Safeguards</h4>
            <p className="text-sm text-muted-foreground">{rec.financialSafeguards}</p>
          </section>

          <div className="flex flex-wrap gap-2 pt-1">
            {onBuild && (
              <Button size="sm" onClick={() => { onBuild(); onClose(); }} data-testid="aut-rec-detail-build">
                <Zap className="h-3.5 w-3.5 mr-1" /> Build From Recommendation
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Opens the Automation Builder — no automation is created until you complete and save it yourself.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Card ────────────────────────────────────────────────────────────────

function RecommendationCard({
  rec, onView, onBuild,
}: { rec: AutomationRecommendation; onView: () => void; onBuild?: () => void }) {
  return (
    <Card className="flex flex-col" data-testid={`aut-rec-card-${rec.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug">{rec.title}</CardTitle>
          <Badge variant="outline" className={`text-[10px] shrink-0 ${IMPACT_COLORS[rec.impact]}`}>{rec.impact}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-3">
        <p className="text-xs text-muted-foreground leading-relaxed flex-1">{rec.description}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className={`text-[10px] ${RECOMMENDATION_CATEGORY_COLORS[rec.category]}`}>{rec.category}</Badge>
          <Badge variant="outline" className={`text-[10px] ${COMPLEXITY_COLORS[rec.complexity]}`}>{rec.complexity} effort</Badge>
          <Badge variant="outline" className={`text-[10px] ${RISK_LEVEL_COLORS[rec.riskLevel]}`}>{RISK_LEVEL_LABELS[rec.riskLevel]} risk</Badge>
          {rec.isFinanciallySensitive && (<Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50"><ShieldAlert className="h-2.5 w-2.5 mr-0.5" />Sensitive</Badge>)}
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{rec.estimatedHoursSavedPerWeek}h/wk saved</span>
          {rec.estimatedReviewReductionPerWeek > 0 && (<span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />−{rec.estimatedReviewReductionPerWeek} reviews/wk</span>)}
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="text-xs h-7 flex-1" onClick={onView} data-testid={`aut-rec-view-${rec.id}`}>View Details</Button>
          {onBuild && (<Button size="sm" className="text-xs h-7" onClick={onBuild} data-testid={`aut-rec-build-${rec.id}`}><Zap className="h-3 w-3 mr-1" />Build</Button>)}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main component ──────────────────────────────────────────────────────

export function AutomationRecommendations({ onBuild }: { onBuild?: () => void }) {
  const recs = useMemo(() => getRecommendations(), []);
  const summary = useMemo(() => computeRecommendationSummary(recs), [recs]);
  const opportunity = useMemo(() => computeOpportunityScore(recs), [recs]);
  const headlines = useMemo(() => getHeadlineInsights(), []);

  const [group, setGroup] = useState<RecommendationGroup | "All">("All");
  const [selected, setSelected] = useState<AutomationRecommendation | null>(null);

  const visible = useMemo(
    () => (group === "All" ? recs : recs.filter((r) => inGroup(r, group))),
    [recs, group]
  );

  const kpis = [
    { label: "Recommendations", value: summary.total, icon: Sparkles, color: "text-violet-600", testId: "aut-rec-kpi-total" },
    { label: "High Impact", value: summary.highImpact, icon: TrendingUp, color: "text-emerald-600", testId: "aut-rec-kpi-high" },
    { label: "Financial", value: summary.financial, icon: Landmark, color: "text-red-600", testId: "aut-rec-kpi-financial" },
    { label: "Operational", value: summary.operational, icon: Wrench, color: "text-blue-600", testId: "aut-rec-kpi-operational" },
    { label: "Governance", value: summary.governance, icon: Gavel, color: "text-amber-700", testId: "aut-rec-kpi-governance" },
    { label: "Time Savings", value: `${summary.estimatedHoursSavedPerWeek}h/wk`, icon: Clock, color: "text-blue-600", testId: "aut-rec-kpi-time" },
    { label: "Review Reduction", value: `${summary.estimatedReviewReductionPerWeek}/wk`, icon: TrendingUp, color: "text-emerald-600", testId: "aut-rec-kpi-reviews" },
  ];

  // Opportunity gauge geometry.
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const dash = (opportunity.score / 100) * circumference;
  const ratingColor =
    opportunity.rating === "Significant Opportunity" ? "text-emerald-500"
    : opportunity.rating === "Moderate Opportunity" ? "text-amber-500" : "text-muted-foreground";

  return (
    <div className="space-y-4" data-testid="aut-recommendations">
      {/* Advisory notice */}
      <div className="rounded-md bg-violet-50 border border-violet-200 px-4 py-3 text-sm text-violet-700 flex items-start gap-2">
        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
        <span><span className="font-semibold">Advisory Intelligence: </span>These are suggestions for where automation could help. Nothing is created automatically — you remain the decision maker and build any automation in the Automation Builder.</span>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3" data-testid="aut-rec-kpi-strip">
        {kpis.map(({ label, value, icon: Icon, color, testId }) => (
          <Card key={label}>
            <CardHeader className="pb-1 pt-3 px-3">
              <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="flex items-center gap-1.5">
                <Icon className={`h-4 w-4 flex-shrink-0 ${color}`} />
                <span className="text-xl font-bold" data-testid={testId}>{value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Opportunity score + headline feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card data-testid="aut-rec-opportunity">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-muted-foreground" /> Automation Opportunity Score</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <div className="relative shrink-0">
              <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
                <circle cx="56" cy="56" r={radius} fill="none" stroke="currentColor" strokeWidth="9" className="text-muted/20" />
                <circle cx="56" cy="56" r={radius} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} className={ratingColor} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold" data-testid="aut-rec-opportunity-score">{opportunity.score}</span>
                <span className="text-[10px] text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="min-w-0">
              <Badge variant="outline" className="text-xs" data-testid="aut-rec-opportunity-rating">{opportunity.rating}</Badge>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed" data-testid="aut-rec-opportunity-summary">{opportunity.summary}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="aut-rec-feed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Gauge className="h-4 w-4 text-muted-foreground" /> Executive Recommendations Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {headlines.map((line, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" data-testid={`aut-rec-feed-${i}`}>
                  <Lightbulb className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Group filter */}
      <div className="flex flex-wrap items-center gap-2" data-testid="aut-rec-groups">
        {GROUPS.map(({ key, label, icon: Icon }) => {
          const active = group === key;
          const count = key === "All" ? recs.length : recs.filter((r) => inGroup(r, key)).length;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setGroup(key)}
              aria-pressed={active}
              data-testid={`aut-rec-group-${key.replace(/ /g, "-").toLowerCase()}`}
              className={`flex items-center gap-1.5 text-xs rounded-full border px-3 py-1.5 transition-colors ${active ? "bg-violet-600 text-white border-violet-600" : "bg-background hover:bg-muted/50"}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
              <span className={`ml-0.5 rounded-full px-1.5 text-[10px] ${active ? "bg-white/20" : "bg-muted"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-md" data-testid="aut-rec-empty">
          <CheckCircle2 className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm">No recommendations in this group.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" data-testid="aut-rec-grid">
          {visible.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onView={() => setSelected(rec)}
              onBuild={onBuild}
            />
          ))}
        </div>
      )}

      {selected && (
        <RecommendationDetailDialog rec={selected} onClose={() => setSelected(null)} onBuild={onBuild} />
      )}
    </div>
  );
}
