import type { Json } from "@/lib/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Reglas de scoring V1 — hardcoded pero explicadas.
 *
 * Todos los scores van de 0 a 100. score_total es un promedio ponderado.
 */

const HOT_TYPES = new Set(["event", "expo", "phone_call", "form"]);

// Weights para score_total
const WEIGHTS = {
  fit: 0.2,
  engagement: 0.3,
  intent: 0.3,
  freshness: 0.2,
};

const MODEL_VERSION = "v1";

export type ScoreBreakdown = {
  fit: number;
  engagement: number;
  intent: number;
  freshness: number;
  total: number;
  meta: {
    model: string;
    touchpoints_90d: number;
    hot_touchpoints_30d: number;
    days_since_last_touchpoint: number | null;
  };
};

function engagementFromCount(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 20;
  if (count <= 4) return 45;
  if (count <= 9) return 70;
  return 100;
}

function intentFromCount(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 35;
  if (count === 2) return 60;
  if (count <= 4) return 85;
  return 100;
}

function freshnessFromDays(days: number | null): number {
  if (days === null) return 0;
  if (days <= 7) return 100;
  if (days <= 30) return 70;
  if (days <= 90) return 40;
  if (days <= 180) return 15;
  return 0;
}

export async function calculateScoreForContact(
  contactId: string,
): Promise<ScoreBreakdown> {
  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const since90 = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();

  const { data: tps, error } = await admin
    .from("contact_touchpoints")
    .select("source_type, occurred_at")
    .eq("contact_id", contactId)
    .gte("occurred_at", since90)
    .order("occurred_at", { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message);

  const rows = tps ?? [];
  const count90 = rows.length;
  const since30ms = now - 30 * 24 * 60 * 60 * 1000;
  const hotCount30 = rows.filter(
    (t) =>
      HOT_TYPES.has(t.source_type) &&
      new Date(t.occurred_at).getTime() >= since30ms,
  ).length;

  let daysSinceLast: number | null = null;
  if (rows.length > 0) {
    const latest = new Date(rows[0].occurred_at).getTime();
    daysSinceLast = Math.max(0, Math.floor((now - latest) / (1000 * 60 * 60 * 24)));
  }

  // fit placeholder — en V2 se alimenta de datos firmográficos / empresa / proyecto
  const fit = 50;
  const engagement = engagementFromCount(count90);
  const intent = intentFromCount(hotCount30);
  const freshness = freshnessFromDays(daysSinceLast);

  const total =
    fit * WEIGHTS.fit +
    engagement * WEIGHTS.engagement +
    intent * WEIGHTS.intent +
    freshness * WEIGHTS.freshness;

  return {
    fit: round(fit),
    engagement: round(engagement),
    intent: round(intent),
    freshness: round(freshness),
    total: round(total),
    meta: {
      model: MODEL_VERSION,
      touchpoints_90d: count90,
      hot_touchpoints_30d: hotCount30,
      days_since_last_touchpoint: daysSinceLast,
    },
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function persistScoreForContact(
  contactId: string,
): Promise<ScoreBreakdown> {
  const score = await calculateScoreForContact(contactId);
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("contact_scores").insert({
    contact_id: contactId,
    fit_score: score.fit,
    engagement_score: score.engagement,
    intent_score: score.intent,
    freshness_score: score.freshness,
    score_total: score.total,
    scoring_model: MODEL_VERSION,
    is_current: true,
    metadata: score.meta as unknown as Json,
  });
  if (error) throw new Error(error.message);
  // El trigger contact_scores_demote marca is_current=false en los previos.
  return score;
}

export async function persistScoresBulk(
  contactIds: string[],
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const id of contactIds) {
    try {
      await persistScoreForContact(id);
      ok++;
    } catch (e) {
      failed++;
      console.error("persistScoreForContact failed", id, e);
    }
  }
  return { ok, failed };
}

// Helpers de UI vivien en lib/crm/scoring-ui.ts para que los client
// components puedan importar sin arrastrar "server-only".

