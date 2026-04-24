"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  ACTIVE_DELIVERY_STATUSES,
  DELIVERY_CHANNELS,
} from "@/lib/crm/deliveries";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES } from "./constants";

const SOURCE = ["touchpoints", "contacts"] as const;
const SCOPE = ["ids", "all_matching"] as const;

const Schema = z.object({
  source: z.enum(SOURCE),
  scope: z.enum(SCOPE),
  ids: z.string().optional(), // JSON array de strings
  filters: z.string().optional(), // JSON {source_type, from, to, q, contact}

  mode: z.enum(["new", "existing"]),

  // nueva campaña
  camp_name: z.string().optional(),
  camp_description: z.string().optional(),
  camp_channel: z
    .enum(CAMPAIGN_CHANNELS)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  camp_status: z.enum(CAMPAIGN_STATUSES).optional(),

  // campaña existente
  campaign_id: z.string().uuid().optional().or(z.literal("")),

  // delivery
  delivery_channel: z.enum(DELIVERY_CHANNELS),
  scheduled_at: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateCampaignFromSelectionState = {
  error?: string;
};

type FiltersShape = {
  source_type?: string;
  from?: string;
  to?: string;
  q?: string;
  contact?: string;
};

function parseIds(raw?: string): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseFilters(raw?: string): FiltersShape {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object") return v as FiltersShape;
  } catch {}
  return {};
}

export async function createCampaignFromSelection(
  _prev: CreateCampaignFromSelectionState,
  fd: FormData,
): Promise<CreateCampaignFromSelectionState> {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    obj[k] = typeof v === "string" ? v : "";
  });
  const parsed = Schema.safeParse(obj);
  if (!parsed.success) {
    return {
      error:
        "Datos inválidos: " +
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
    };
  }
  const d = parsed.data;
  const ids = parseIds(d.ids);
  const filters = parseFilters(d.filters);
  const admin = createSupabaseAdminClient();

  // 1) Resolver contact_ids únicos
  const contactIds = await resolveContactIds(
    d.source,
    d.scope,
    ids,
    filters,
    admin,
  );

  if (contactIds.length === 0) {
    return { error: "Ningún contacto para procesar." };
  }

  // 2) Resolver campaign_id
  let campaignId: string;
  if (d.mode === "new") {
    if (!d.camp_name || d.camp_name.trim().length === 0) {
      return { error: "El nombre de la nueva campaña es requerido." };
    }
    const { data: c, error } = await admin
      .from("campaigns")
      .insert({
        name: d.camp_name.trim(),
        description: d.camp_description?.trim() || null,
        channel: d.camp_channel ?? null,
        status: d.camp_status ?? "active",
      })
      .select("id")
      .single();
    if (error) return { error: `Error creando campaña: ${error.message}` };
    campaignId = c.id;
  } else {
    if (!d.campaign_id || d.campaign_id.length === 0) {
      return { error: "Elegí una campaña existente." };
    }
    campaignId = d.campaign_id;
  }

  // 3) Check de deliveries activos existentes para esa campaña
  const { data: existing } = await admin
    .from("campaign_deliveries")
    .select("contact_id")
    .eq("campaign_id", campaignId)
    .in("delivery_status", ACTIVE_DELIVERY_STATUSES)
    .in("contact_id", contactIds);

  const existingSet = new Set(
    ((existing ?? []) as { contact_id: string }[]).map((r) => r.contact_id),
  );
  const toInsert = contactIds.filter((id) => !existingSet.has(id));

  // 4) Insertar deliveries
  let createdCount = 0;
  if (toInsert.length > 0) {
    const baseMeta: Record<string, unknown> = {
      created_from: d.source,
      scope: d.scope,
    };
    if (d.source === "touchpoints" && d.scope === "ids") {
      baseMeta.source_touchpoint_ids = ids;
    }
    if (d.notes && d.notes.trim().length > 0) {
      baseMeta.notes = d.notes.trim();
    }

    const rows = toInsert.map((cid) => ({
      campaign_id: campaignId,
      contact_id: cid,
      channel: d.delivery_channel,
      delivery_status: d.scheduled_at ? "scheduled" : "pending",
      scheduled_at:
        d.scheduled_at && d.scheduled_at.length > 0
          ? new Date(d.scheduled_at).toISOString()
          : null,
      metadata: baseMeta as Json,
    }));

    const { data: inserted, error: insertError } = await admin
      .from("campaign_deliveries")
      .insert(rows)
      .select("id");

    if (insertError) {
      return { error: `Error creando deliveries: ${insertError.message}` };
    }
    createdCount = inserted?.length ?? 0;
  }

  const skippedCount = contactIds.length - createdCount;

  revalidatePath("/campanas");
  revalidatePath(`/campanas/${campaignId}`);

  const qs = new URLSearchParams({
    created: String(createdCount),
    skipped: String(skippedCount),
    unique: String(contactIds.length),
  });
  redirect(`/campanas/${campaignId}?${qs.toString()}`);
}

async function resolveContactIds(
  source: (typeof SOURCE)[number],
  scope: (typeof SCOPE)[number],
  ids: string[],
  filters: FiltersShape,
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<string[]> {
  const LIMIT = 50000;

  if (scope === "ids") {
    if (ids.length === 0) return [];
    if (source === "contacts") {
      const { data } = await admin
        .from("contacts")
        .select("id")
        .in("id", ids)
        .limit(LIMIT);
      return (data ?? []).map((r) => r.id);
    }
    // source = touchpoints
    const { data } = await admin
      .from("contact_touchpoints")
      .select("contact_id")
      .in("id", ids)
      .limit(LIMIT);
    return Array.from(
      new Set((data ?? []).map((r) => r.contact_id).filter(Boolean)),
    );
  }

  // scope = all_matching → aplicar filtros
  if (source === "touchpoints") {
    let q = admin.from("contact_touchpoints").select("contact_id").limit(LIMIT);
    if (filters.source_type) q = q.eq("source_type", filters.source_type);
    if (filters.from) q = q.gte("occurred_at", filters.from);
    if (filters.to) q = q.lte("occurred_at", filters.to);
    if (filters.contact) q = q.eq("contact_id", filters.contact);
    const { data } = await q;
    return Array.from(
      new Set((data ?? []).map((r) => r.contact_id).filter(Boolean)),
    );
  }

  // source = contacts
  let q = admin.from("contacts").select("id").limit(LIMIT);
  if (filters.q && filters.q.trim().length > 0) {
    const like = `%${filters.q.trim()}%`;
    q = q.or(
      `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
    );
  }
  const { data } = await q;
  return (data ?? []).map((r) => r.id);
}
