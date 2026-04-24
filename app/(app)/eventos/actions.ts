"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EVENT_STATUSES } from "./constants";

const Schema = z.object({
  name: z.string().trim().min(1, "Requerido").max(200),
  event_type: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  location: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  start_at: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? new Date(v).toISOString() : null)),
  end_at: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? new Date(v).toISOString() : null)),
  status: z.enum(EVENT_STATUSES).default("planned"),
  campaign_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type EventFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parse(fd: FormData) {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    obj[k] = typeof v === "string" ? v : "";
  });
  return Schema.safeParse(obj);
}

export async function createEventAction(
  _prev: EventFormState,
  fd: FormData,
): Promise<EventFormState> {
  const parsed = parse(fd);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  const d = parsed.data;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("events")
    .insert({
      name: d.name,
      event_type: d.event_type,
      location: d.location,
      start_at: d.start_at,
      end_at: d.end_at,
      status: d.status,
      campaign_id: d.campaign_id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/eventos");
  redirect(`/eventos/${data.id}`);
}

export async function updateEventAction(
  id: string,
  _prev: EventFormState,
  fd: FormData,
): Promise<EventFormState> {
  const parsed = parse(fd);
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  const d = parsed.data;
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("events")
    .update({
      name: d.name,
      event_type: d.event_type,
      location: d.location,
      start_at: d.start_at,
      end_at: d.end_at,
      status: d.status,
      campaign_id: d.campaign_id,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/eventos");
  revalidatePath(`/eventos/${id}`);
  redirect(`/eventos/${id}`);
}

export async function deleteEventAction(id: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/eventos");
  redirect("/eventos");
}
