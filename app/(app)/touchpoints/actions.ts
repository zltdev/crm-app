"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TOUCHPOINT_SOURCE_TYPES } from "./nuevo/constants";

const UpdateSchema = z.object({
  source_type: z.enum(TOUCHPOINT_SOURCE_TYPES),
  source_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  occurred_at: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? new Date(v).toISOString() : null)),
  campaign_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  event_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  expo_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  form_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type UpdateTouchpointState = { error?: string };

export async function updateTouchpointAction(
  id: string,
  _prev: UpdateTouchpointState,
  fd: FormData,
): Promise<UpdateTouchpointState> {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    obj[k] = typeof v === "string" ? v : "";
  });
  const parsed = UpdateSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      error: parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }
  const d = parsed.data;

  const admin = createSupabaseAdminClient();
  // Leer metadata actual para preservar llaves no manejadas (ej: notes + external_id)
  const { data: current } = await admin
    .from("contact_touchpoints")
    .select("metadata, contact_id")
    .eq("id", id)
    .maybeSingle();

  const currentMeta =
    (current?.metadata && typeof current.metadata === "object"
      ? (current.metadata as Record<string, unknown>)
      : {}) ?? {};
  const nextMeta = { ...currentMeta };
  if (d.notes === null) {
    delete nextMeta.notes;
  } else {
    nextMeta.notes = d.notes;
  }
  nextMeta.last_edited_via = "ui";

  const { error } = await admin
    .from("contact_touchpoints")
    .update({
      source_type: d.source_type,
      source_name: d.source_name,
      occurred_at: d.occurred_at ?? undefined,
      campaign_id: d.campaign_id,
      event_id: d.event_id,
      expo_id: d.expo_id,
      form_id: d.form_id,
      metadata: nextMeta as Json,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/touchpoints");
  revalidatePath(`/touchpoints/${id}`);
  if (current?.contact_id) {
    revalidatePath(`/contactos/${current.contact_id}`);
  }
  redirect(`/touchpoints/${id}`);
}

export async function deleteTouchpointAction(id: string) {
  const admin = createSupabaseAdminClient();
  const { data: tp } = await admin
    .from("contact_touchpoints")
    .select("contact_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await admin
    .from("contact_touchpoints")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/touchpoints");
  if (tp?.contact_id) {
    revalidatePath(`/contactos/${tp.contact_id}`);
  }
  redirect("/touchpoints");
}
