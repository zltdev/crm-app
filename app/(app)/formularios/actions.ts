"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { FORM_STATUSES } from "./constants";

const Schema = z.object({
  name: z.string().trim().min(1, "Requerido").max(200),
  slug: z
    .string()
    .trim()
    .max(120)
    .regex(/^[a-z0-9-]*$/, "Solo letras minúsculas, números y guiones")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  source_name: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  status: z.enum(FORM_STATUSES).default("active"),
  campaign_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type FormFormState = {
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

export async function createFormAction(
  _prev: FormFormState,
  fd: FormData,
): Promise<FormFormState> {
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
    .from("forms")
    .insert({
      name: d.name,
      slug: d.slug,
      source_name: d.source_name,
      status: d.status,
      campaign_id: d.campaign_id,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un formulario con ese slug." };
    }
    return { error: error.message };
  }
  revalidatePath("/formularios");
  redirect(`/formularios/${data.id}`);
}

export async function updateFormAction(
  id: string,
  _prev: FormFormState,
  fd: FormData,
): Promise<FormFormState> {
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
    .from("forms")
    .update({
      name: d.name,
      slug: d.slug,
      source_name: d.source_name,
      status: d.status,
      campaign_id: d.campaign_id,
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un formulario con ese slug." };
    }
    return { error: error.message };
  }
  revalidatePath("/formularios");
  revalidatePath(`/formularios/${id}`);
  redirect(`/formularios/${id}`);
}

export async function deleteFormAction(id: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("forms").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/formularios");
  redirect("/formularios");
}
