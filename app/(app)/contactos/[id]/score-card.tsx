"use client";

import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { scoreColor } from "@/lib/crm/scoring-ui";
import { recalculateContactScoreAction } from "./score-actions";

type Score = {
  fit_score: number;
  engagement_score: number;
  intent_score: number;
  freshness_score: number;
  score_total: number;
  calculated_at: string;
  scoring_model: string | null;
};

export function ScoreCard({
  contactId,
  score,
}: {
  contactId: string;
  score: Score | null;
}) {
  const [pending, startTransition] = useTransition();

  function recalc() {
    startTransition(async () => {
      await recalculateContactScoreAction(contactId);
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Score del contacto</CardTitle>
          <CardDescription>
            {score
              ? `Calculado ${formatDateTime(score.calculated_at)}${
                  score.scoring_model ? ` · modelo ${score.scoring_model}` : ""
                }`
              : "Todavía no se calculó."}
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={recalc}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Recalcular
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <ScoreCell label="Total" value={score?.score_total ?? null} highlight />
          <ScoreCell label="Fit" value={score?.fit_score ?? null} />
          <ScoreCell label="Engagement" value={score?.engagement_score ?? null} />
          <ScoreCell label="Intent" value={score?.intent_score ?? null} />
          <ScoreCell label="Freshness" value={score?.freshness_score ?? null} />
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
}) {
  if (value === null || value === undefined) {
    return (
      <div
        className={
          "rounded-lg border border-border bg-muted/30 p-3 " +
          (highlight ? "md:col-span-1" : "")
        }
      >
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-muted-foreground">
          —
        </div>
      </div>
    );
  }
  const variant = scoreColor(value);
  const bg =
    variant === "success"
      ? "border-success/30 bg-success/5"
      : variant === "warning"
        ? "border-warning/30 bg-warning/5"
        : variant === "destructive"
          ? "border-destructive/30 bg-destructive/5"
          : "border-border bg-muted/30";
  return (
    <div className={"rounded-lg border p-3 " + bg}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {highlight && <Badge variant={variant}>{label}</Badge>}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {value.toFixed(0)}
        <span className="text-sm text-muted-foreground"> / 100</span>
      </div>
    </div>
  );
}
