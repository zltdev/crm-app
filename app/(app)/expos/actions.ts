"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EXPO_STATUSES } from "./constants";

const Schema = z.object({
  name: z.string().trim().min(1, "Requerido").max(200),
  venue: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  city: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  country: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  start_date: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  end_date: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  status: z.enum(EXPO_STATUSES).default("planned"),
  campaign_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type ExpoFormState = {
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

export async function createExpoAction(
  _prev: ExpoFormState,
  fd: FormData,
): Promise<ExpoFormState> {
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
    .from("expos")
    .insert({
      name: d.name,
      venue: d.venue,
      city: d.city,
      country: d.country,
      start_date: d.start_date,
      end_date: d.end_date,
      status: d.status,
      campaign_id: d.campaign_id,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/expos");
  redirect(`/expos/${data.id}`);
}

export async function updateExpoAction(
  id: string,
  _prev: ExpoFormState,
  fd: FormData,
): Promise<ExpoFormState> {
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
    .from("expos")
    .update({
      name: d.name,
      venue: d.venue,
      city: d.city,
      country: d.country,
      start_date: d.start_date,
      end_date: d.end_date,
      status: d.status,
      campaign_id: d.campaign_id,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/expos");
  revalidatePath(`/expos/${id}`);
  redirect(`/expos/${id}`);
}

export async function deleteExpoAction(id: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("expos").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/expos");
  redirect("/expos");
}
