import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { TOUCHPOINT_SOURCE_TYPES } from "@/app/(app)/touchpoints/nuevo/constants";
import { CONTACT_STATUSES } from "@/lib/crm/contacts";

// ============================================================
// Shape de la definición de un segmento (jsonb `segments.definition`)
// ============================================================

export const SCORE_TYPES = [
  "total",
  "fit",
  "engagement",
  "intent",
  "freshness",
] as const;
export type ScoreType = (typeof SCORE_TYPES)[number];

export const SCORE_TYPE_LABELS: Record<ScoreType, string> = {
  total: "Score total",
  fit: "Fit score",
  engagement: "Engagement score",
  intent: "Intent score",
  freshness: "Freshness score",
};

export const SegmentDefinitionSchema = z.object({
  status: z.array(z.enum(CONTACT_STATUSES)).default([]),
  has_email: z.enum(["any", "yes", "no"]).default("any"),
  created_from: z.string().optional().nullable(),
  created_to: z.string().optional().nullable(),
  touchpoints: z
    .object({
      source_types: z.array(z.enum(TOUCHPOINT_SOURCE_TYPES)).default([]),
      campaign_id: z.string().uuid().optional().nullable(),
      event_id: z.string().uuid().optional().nullable(),
      expo_id: z.string().uuid().optional().nullable(),
      form_id: z.string().uuid().optional().nullable(),
      min_count: z.number().int().min(0).default(0),
      within_days: z.number().int().min(0).optional().nullable(),
    })
    .default({
      source_types: [],
      min_count: 0,
    }),
  score: z
    .object({
      type: z.enum(SCORE_TYPES),
      min: z.number().optional().nullable(),
      max: z.number().optional().nullable(),
    })
    .optional()
    .nullable(),
});

export type SegmentDefinition = z.infer<typeof SegmentDefinitionSchema>;

export function emptyDefinition(): SegmentDefinition {
  return {
    status: ["active"],
    has_email: "any",
    created_from: null,
    created_to: null,
    touchpoints: {
      source_types: [],
      campaign_id: null,
      event_id: null,
      expo_id: null,
      form_id: null,
      min_count: 0,
      within_days: null,
    },
    score: null,
  };
}

export function parseDefinition(raw: Json | unknown): SegmentDefinition {
  const parsed = SegmentDefinitionSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return emptyDefinition();
}

// ============================================================
// Evaluación: dado un definition, devuelve contact_ids que matchean
// ============================================================

type Admin = ReturnType<
  typeof import("@/lib/supabase/admin").createSupabaseAdminClient
>;

export async function evaluateSegment(
  admin: Admin,
  def: SegmentDefinition,
): Promise<string[]> {
  const LIMIT = 50000;

  // 1) Base: filtros sobre `contacts`
  let base = admin.from("contacts").select("id, email").limit(LIMIT);
  if (def.status.length > 0) base = base.in("status", def.status);
  if (def.created_from) base = base.gte("created_at", def.created_from);
  if (def.created_to) base = base.lte("created_at", def.created_to);

  const { data: baseRows, error: baseErr } = await base;
  if (baseErr) throw new Error(`segments.base: ${baseErr.message}`);

  let ids = new Set(
    (baseRows ?? []).map((r) => r.id as string),
  );

  // has_email
  if (def.has_email !== "any") {
    const wantEmail = def.has_email === "yes";
    const filtered = (baseRows ?? []).filter((r) => {
      const hasEmail = !!r.email && String(r.email).length > 0;
      return wantEmail ? hasEmail : !hasEmail;
    });
    ids = new Set(filtered.map((r) => r.id as string));
  }

  // 2) Filtros sobre touchpoints (si aplica)
  const tf = def.touchpoints;
  const usesTouchpoints =
    tf.source_types.length > 0 ||
    !!tf.campaign_id ||
    !!tf.event_id ||
    !!tf.expo_id ||
    !!tf.form_id ||
    tf.min_count > 0 ||
    !!tf.within_days;

  if (usesTouchpoints) {
    let q = admin
      .from("contact_touchpoints")
      .select("contact_id")
      .limit(LIMIT);
    if (tf.source_types.length > 0) q = q.in("source_type", tf.source_types);
    if (tf.campaign_id) q = q.eq("campaign_id", tf.campaign_id);
    if (tf.event_id) q = q.eq("event_id", tf.event_id);
    if (tf.expo_id) q = q.eq("expo_id", tf.expo_id);
    if (tf.form_id) q = q.eq("form_id", tf.form_id);
    if (tf.within_days && tf.within_days > 0) {
      const since = new Date(
        Date.now() - tf.within_days * 24 * 60 * 60 * 1000,
      );
      q = q.gte("occurred_at", since.toISOString());
    }
    const { data: tps, error: tpErr } = await q;
    if (tpErr) throw new Error(`segments.touchpoints: ${tpErr.message}`);

    const counts = new Map<string, number>();
    ((tps as { contact_id: string }[] | null) ?? []).forEach((r) => {
      counts.set(r.contact_id, (counts.get(r.contact_id) ?? 0) + 1);
    });
    const minCount = Math.max(1, tf.min_count);
    const tpIds = new Set<string>();
    counts.forEach((count, cid) => {
      if (count >= minCount) tpIds.add(cid);
    });
    ids = intersect(ids, tpIds);
  }

  // 3) Filtros sobre score (si aplica)
  if (def.score) {
    const column =
      def.score.type === "total"
        ? "score_total"
        : (`${def.score.type}_score` as const);
    let q = admin
      .from("contact_scores")
      .select(`contact_id, ${column}`)
      .eq("is_current", true)
      .limit(LIMIT);
    if (def.score.min !== null && def.score.min !== undefined) {
      q = q.gte(column, def.score.min);
    }
    if (def.score.max !== null && def.score.max !== undefined) {
      q = q.lte(column, def.score.max);
    }
    const { data: sc, error: scErr } = await q;
    if (scErr) throw new Error(`segments.score: ${scErr.message}`);
    const scIds = new Set(
      ((sc as { contact_id: string }[] | null) ?? []).map((r) => r.contact_id),
    );
    ids = intersect(ids, scIds);
  }

  return Array.from(ids);
}

function intersect<T>(a: Set<T>, b: Set<T>): Set<T> {
  const out = new Set<T>();
  a.forEach((v) => {
    if (b.has(v)) out.add(v);
  });
  return out;
}
