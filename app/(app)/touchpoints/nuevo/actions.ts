"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Json } from "@/lib/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const TOUCHPOINT_SOURCE_TYPES = [
  "form",
  "event",
  "expo",
  "phone_call",
  "whatsapp",
  "email",
  "agent",
  "manual",
  "referral",
  "import",
  "other",
] as const;

const Schema = z.object({
  contact_id: z.string().uuid(),
  source_type: z.enum(TOUCHPOINT_SOURCE_TYPES),
  source_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  occurred_at: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  campaign_id: z.string().uuid().optional().or(z.literal("")),
  event_id: z.string().uuid().optional().or(z.literal("")),
  expo_id: z.string().uuid().optional().or(z.literal("")),
  form_id: z.string().uuid().optional().or(z.literal("")),
  notes: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type CreateTouchpointState = {
  error?: string;
};

export async function createTouchpointAction(
  _prev: CreateTouchpointState,
  fd: FormData,
): Promise<CreateTouchpointState> {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    obj[k] = typeof v === "string" ? v : "";
  });

  const parsed = Schema.safeParse(obj);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { error: `Datos inválidos: ${msg}` };
  }
  const d = parsed.data;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("contact_touchpoints").insert({
    contact_id: d.contact_id,
    source_type: d.source_type,
    source_name: d.source_name ?? null,
    occurred_at: d.occurred_at
      ? new Date(d.occurred_at).toISOString()
      : new Date().toISOString(),
    campaign_id: d.campaign_id || null,
    event_id: d.event_id || null,
    expo_id: d.expo_id || null,
    form_id: d.form_id || null,
    metadata: (d.notes
      ? { notes: d.notes, source: "manual_ui" }
      : { source: "manual_ui" }) as Json,
  });

  if (error) return { error: error.message };

  revalidatePath(`/contactos/${d.contact_id}`);
  revalidatePath("/contactos");
  revalidatePath("/");
  redirect(`/contactos/${d.contact_id}`);
}
