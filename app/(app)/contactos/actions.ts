"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { contactFormSchema, CONTACT_STATUSES } from "@/lib/crm/contacts";

export type ActionState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseForm(formData: FormData) {
  const raw = {
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    first_name: String(formData.get("first_name") ?? ""),
    last_name: String(formData.get("last_name") ?? ""),
    status: String(formData.get("status") ?? "active"),
  };
  return contactFormSchema.safeParse(raw);
}

export async function createContact(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      phone: parsed.data.phone,
      email: parsed.data.email,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      status: parsed.data.status,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error:
          "Ya existe un contacto con ese teléfono o email. Buscalo en la lista.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/contactos");
  redirect(`/contactos/${data.id}`);
}

export async function updateContact(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      phone: parsed.data.phone,
      email: parsed.data.email,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      status: parsed.data.status,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error:
          "Los datos chocan con otro contacto existente (teléfono o email duplicado).",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/contactos");
  revalidatePath(`/contactos/${id}`);
  redirect(`/contactos/${id}`);
}

export async function archiveContact(id: string) {
  const allowed = CONTACT_STATUSES.includes("deleted")
    ? "deleted"
    : "blocked";
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("contacts")
    .update({ status: allowed })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/contactos");
  revalidatePath(`/contactos/${id}`);
  redirect("/contactos");
}
