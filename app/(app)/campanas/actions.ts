"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CAMPAIGN_CHANNELS, CAMPAIGN_STATUSES } from "./constants";

const Schema = z.object({
  name: z.string().trim().min(1, "Requerido").max(200),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  status: z.enum(CAMPAIGN_STATUSES).default("draft"),
  channel: z
    .enum(CAMPAIGN_CHANNELS)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  start_date: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  end_date: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type CampaignFormState = {
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

export async function createCampaignAction(
  _prev: CampaignFormState,
  fd: FormData,
): Promise<CampaignFormState> {
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
    .from("campaigns")
    .insert({
      name: d.name,
      description: d.description,
      status: d.status,
      channel: d.channel ?? null,
      start_date: d.start_date,
      end_date: d.end_date,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/campanas");
  redirect(`/campanas/${data.id}`);
}

export async function updateCampaignAction(
  id: string,
  _prev: CampaignFormState,
  fd: FormData,
): Promise<CampaignFormState> {
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
    .from("campaigns")
    .update({
      name: d.name,
      description: d.description,
      status: d.status,
      channel: d.channel ?? null,
      start_date: d.start_date,
      end_date: d.end_date,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/campanas");
  revalidatePath(`/campanas/${id}`);
  redirect(`/campanas/${id}`);
}

export async function deleteCampaignAction(id: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/campanas");
  redirect("/campanas");
}
