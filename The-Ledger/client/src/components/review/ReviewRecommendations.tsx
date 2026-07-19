/**
 * UX-7.5 — REVIEW RECOMMENDATION COMPONENTS
 *
 * Read-only recommendation intelligence: a distribution dashboard + guidance
 * feed (CEO review page) and a per-job recommendation panel (review detail).
 *
 * Doctrine:
 *   - Guidance only. NOTHING here approves, rejects, requests corrections or
 *     triggers a workflow. No action buttons exist in these surfaces.
 *   - Every value is derived by reviewRecommendationEngine (pure/deterministic).
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Compass, History, Sparkles } from "lucide-react";
import { formatGbp } from "@/lib/reviewIntelligenceEngine";
import {
  computeRecommendationModel,
  getJobRecommendations,
  getRecommendationMeta,
  getConfidenceBadge,
  type RecommendationType,
  type ConfidenceLevel,
} from "@/lib/reviewRecommendationEngine";

// ── Reusable badges ─────────────────────────────────────────────────────────

export function RecommendationBadge({
  type,
  className = "",
}: {
  type: RecommendationType;
  className?: string;
}) {
  const meta = getRecommendationMeta(type);
  return (
    <Badge
      variant="outline"
      className={`${meta.badgeClass} ${className}`}
      data-testid={`recommendation-badge-${type.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {type}
    </Badge>
  );
}

export function ConfidenceBadge({
  confidence,
  className = "",
}: {
  confidence: ConfidenceLevel;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={`${getConfidenceBadge(confidence)} ${className}`}
      data-testid={`confidence-badge-${confidence.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {confidence}
    </Badge>
  );
}

// ── Distribution dashboard + insights + guidance feed (CEO review page) ──────

export function RecommendationDistributionPanel() {
  const model = useMemo(() => computeRecommendationModel(), []);
  const { distribution, insights, guidance, highConfidenceCount, recommendations } =
    model;

  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-6" data-testid="review-recommendation-panel">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <Sparkles className="h-5 w-5 text-violet-500" /> Review Recommendations
        </h3>
        <p className="text-sm text-muted-foreground">
          Historical intelligence — "what you'd normally do here". Guidance only;
          every decision remains yours.
        </p>
      </div>

      {/* Recommendation distribution dashboard */}
      <div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        data-testid="recommendation-distribution"
      >
        {distribution.map((d) => {
          const meta = getRecommendationMeta(d.type);
          return (
            <Card
              key={d.type}
              data-testid={`recommendation-dist-${d.type
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {d.type}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-bold text-foreground">{d.count}</p>
                <p className="text-xs text-muted-foreground">{d.percent}% of pending</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recommendation insights */}
        <Card data-testid="recommendation-insights">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" /> Recommendation Insights
            </CardTitle>
            <CardDescription>
              {highConfidenceCount} of {recommendations.length} pending reviews are
              high-confidence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground"
                  data-testid="recommendation-insight"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Executive guidance feed */}
        <Card data-testid="recommendation-guidance">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Compass className="h-4 w-4 text-blue-500" /> Executive Guidance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {guidance.map((g, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground"
                  data-testid="recommendation-guidance-item"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {g}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Per-job recommendation panel (review detail) ─────────────────────────────

export function JobRecommendationPanel({ jobId }: { jobId: string }) {
  const recs = useMemo(() => getJobRecommendations(jobId), [jobId]);
  if (recs.length === 0) return null;

  return (
    <Card data-testid="review-recommendation-detail">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-violet-500" /> Recommendations
        </CardTitle>
        <CardDescription>
          What you'd normally do, based on similar past reviews. Guidance only —
          approval controls below are unchanged.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recs.map(({ record, recommendation }) => (
          <div
            key={record.id}
            className="rounded-md border border-border p-4"
            data-testid={`recommendation-row-${record.id}`}
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{record.id}</span>
              <span className="text-xs text-muted-foreground">{record.reviewType}</span>
              <RecommendationBadge type={recommendation.type} />
              <span className="text-xs text-muted-foreground">Confidence:</span>
              <ConfidenceBadge confidence={recommendation.confidence} />
              <Badge variant="outline" className="ml-auto capitalize">
                {recommendation.risk} risk
              </Badge>
            </div>

            {/* Supporting rationale */}
            <p className="text-sm text-foreground" data-testid="recommendation-reason">
              {recommendation.reason}
            </p>

            {/* Similar decisions / historical patterns */}
            <div
              className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground"
              data-testid="recommendation-similar"
            >
              <span className="flex items-center gap-1">
                <History className="h-3 w-3" />
                {recommendation.similar.total} similar reviews
              </span>
              <span className="text-emerald-600">
                {recommendation.similar.approvals} approved
              </span>
              <span className="text-rose-600">
                {recommendation.similar.rejections} rejected
              </span>
              <span className="text-amber-600">
                {recommendation.similar.corrections} corrected
              </span>
              <span>Approval rate {recommendation.similar.approvalRate}%</span>
              <span>Last: {recommendation.similar.lastOccurrence}</span>
              {record.financialImpact > 0 && (
                <span>Impact {formatGbp(record.financialImpact)}</span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
