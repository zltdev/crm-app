"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  evaluateSegment,
  SCORE_TYPES,
  SegmentDefinitionSchema,
  type SegmentDefinition,
} from "@/lib/crm/segments";
import { TOUCHPOINT_SOURCE_TYPES } from "@/app/(app)/touchpoints/nuevo/constants";
import { CONTACT_STATUSES } from "@/lib/crm/contacts";

export type SegmentFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const FormSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  status: z.enum(["active", "inactive", "archived"]).default("active"),

  // definition fields — vienen como FormData, parseo a mano
  def_status: z.string().optional(), // CSV
  def_has_email: z.enum(["any", "yes", "no"]).default("any"),
  def_created_from: z.string().optional(),
  def_created_to: z.string().optional(),
  def_tp_types: z.string().optional(), // CSV
  def_tp_campaign: z.string().optional(),
  def_tp_event: z.string().optional(),
  def_tp_expo: z.string().optional(),
  def_tp_form: z.string().optional(),
  def_tp_min_count: z.string().optional(),
  def_tp_within_days: z.string().optional(),
  def_score_type: z.string().optional(),
  def_score_min: z.string().optional(),
  def_score_max: z.string().optional(),
});

function parseForm(fd: FormData) {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    obj[k] = typeof v === "string" ? v : "";
  });
  return FormSchema.safeParse(obj);
}

function buildDefinition(
  d: z.infer<typeof FormSchema>,
): SegmentDefinition {
  const statusArr = (d.def_status ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is (typeof CONTACT_STATUSES)[number] =>
      (CONTACT_STATUSES as readonly string[]).includes(s),
    );

  const typesArr = (d.def_tp_types ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is (typeof TOUCHPOINT_SOURCE_TYPES)[number] =>
      (TOUCHPOINT_SOURCE_TYPES as readonly string[]).includes(s),
    );

  const minCount = Number(d.def_tp_min_count ?? 0);
  const withinDays = d.def_tp_within_days
    ? Number(d.def_tp_within_days)
    : null;

  let score: SegmentDefinition["score"] = null;
  if (
    d.def_score_type &&
    (SCORE_TYPES as readonly string[]).includes(d.def_score_type)
  ) {
    score = {
      type: d.def_score_type as SegmentDefinition["score"] extends { type: infer T } | null ? T : never,
      min: d.def_score_min ? Number(d.def_score_min) : null,
      max: d.def_score_max ? Number(d.def_score_max) : null,
    };
  }

  const def: SegmentDefinition = {
    status: statusArr,
    has_email: d.def_has_email,
    created_from: d.def_created_from || null,
    created_to: d.def_created_to || null,
    touchpoints: {
      source_types: typesArr,
      campaign_id: d.def_tp_campaign || null,
      event_id: d.def_tp_event || null,
      expo_id: d.def_tp_expo || null,
      form_id: d.def_tp_form || null,
      min_count: Number.isFinite(minCount) ? minCount : 0,
      within_days:
        withinDays !== null && Number.isFinite(withinDays)
          ? withinDays
          : null,
    },
    score,
  };

  // Valida y devuelve el shape correcto (aplica defaults)
  return SegmentDefinitionSchema.parse(def);
}

export async function createSegmentAction(
  _prev: SegmentFormState,
  fd: FormData,
): Promise<SegmentFormState> {
  const parsed = parseForm(fd);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  const d = parsed.data;
  const def = buildDefinition(d);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("segments")
    .insert({
      name: d.name,
      description: d.description,
      status: d.status,
      definition: def as unknown as Json,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un segmento con ese nombre." };
    }
    return { error: error.message };
  }
  revalidatePath("/segmentos");
  redirect(`/segmentos/${data.id}`);
}

export async function updateSegmentAction(
  id: string,
  _prev: SegmentFormState,
  fd: FormData,
): Promise<SegmentFormState> {
  const parsed = parseForm(fd);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  const d = parsed.data;
  const def = buildDefinition(d);
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("segments")
    .update({
      name: d.name,
      description: d.description,
      status: d.status,
      definition: def as unknown as Json,
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un segmento con ese nombre." };
    }
    return { error: error.message };
  }
  revalidatePath("/segmentos");
  revalidatePath(`/segmentos/${id}`);
  redirect(`/segmentos/${id}`);
}

export async function deleteSegmentAction(id: string) {
  const admin = createSupabaseAdminClient();
  // contact_segments tiene on delete cascade, así que se limpia solo.
  const { error } = await admin.from("segments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/segmentos");
  redirect("/segmentos");
}

export async function refreshSegmentAction(id: string) {
  const admin = createSupabaseAdminClient();
  const { data: seg, error: segErr } = await admin
    .from("segments")
    .select("definition")
    .eq("id", id)
    .maybeSingle();
  if (segErr) throw new Error(segErr.message);
  if (!seg) throw new Error("Segmento no encontrado.");

  const { SegmentDefinitionSchema } = await import("@/lib/crm/segments");
  const def = SegmentDefinitionSchema.parse(seg.definition);
  const contactIds = await evaluateSegment(admin, def);

  // Reset membresía
  await admin.from("contact_segments").delete().eq("segment_id", id);

  if (contactIds.length > 0) {
    const CHUNK = 1000;
    for (let i = 0; i < contactIds.length; i += CHUNK) {
      const slice = contactIds.slice(i, i + CHUNK);
      const rows = slice.map((cid) => ({
        contact_id: cid,
        segment_id: id,
        assignment_source: "auto_refresh",
      }));
      const { error } = await admin.from("contact_segments").insert(rows);
      if (error) throw new Error(`Insert chunk falló: ${error.message}`);
    }
  }

  revalidatePath(`/segmentos/${id}`);
  revalidatePath("/segmentos");
  return { matched: contactIds.length };
}
