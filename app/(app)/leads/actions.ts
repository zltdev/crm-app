"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/crm/normalize";

// leads table not yet in generated types — use unknown cast
function fromLeads(admin: ReturnType<typeof createSupabaseAdminClient>) {
  return (admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createSupabaseAdminClient>["from"]> }).from("leads");
}

export async function createLead(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name?.trim()) throw new Error("Nombre requerido");

  const phone = (formData.get("phone") as string) || null;
  const email = (formData.get("email") as string) || null;
  const now = new Date().toISOString();
  const month = now.slice(0, 7);

  const row = {
    name: name.trim(),
    phone,
    phone_normalized: normalizePhone(phone),
    email,
    locality: (formData.get("locality") as string) || null,
    contacted_at: (formData.get("contacted_at") as string) || now,
    reception: (formData.get("reception") as string) || null,
    contact_medium: (formData.get("contact_medium") as string) || null,
    lead_source: (formData.get("lead_source") as string) || null,
    project: (formData.get("project") as string) || null,
    status: (formData.get("status") as string) || "nuevo",
    broker_name: (formData.get("broker_name") as string) || null,
    broker_email: (formData.get("broker_email") as string) || null,
    request_summary: (formData.get("request_summary") as string) || null,
    feedback: "Sin feedback",
    month,
  };

  const admin = createSupabaseAdminClient();
  const { error } = await fromLeads(admin).insert(row);
  if (error) throw new Error(error.message);

  revalidatePath("/leads");
  redirect("/leads");
}

export async function updateLead(id: string, formData: FormData) {
  const name = formData.get("name") as string;
  if (!name?.trim()) throw new Error("Nombre requerido");

  const phone = (formData.get("phone") as string) || null;
  const status = (formData.get("status") as string) || "nuevo";
  const prevStatus = (formData.get("prev_status") as string) || "";

  const update: Record<string, unknown> = {
    name: name.trim(),
    phone,
    phone_normalized: normalizePhone(phone),
    email: (formData.get("email") as string) || null,
    locality: (formData.get("locality") as string) || null,
    reception: (formData.get("reception") as string) || null,
    contact_medium: (formData.get("contact_medium") as string) || null,
    lead_source: (formData.get("lead_source") as string) || null,
    project: (formData.get("project") as string) || null,
    status,
    broker_name: (formData.get("broker_name") as string) || null,
    broker_email: (formData.get("broker_email") as string) || null,
    request_summary: (formData.get("request_summary") as string) || null,
    interest: (formData.get("interest") as string) || null,
    progress: (formData.get("progress") as string) || null,
    feedback: (formData.get("feedback") as string) || null,
    followup_3d: (formData.get("followup_3d") as string) || null,
  };

  if (status === "derivado" && prevStatus !== "derivado") {
    update.derived_at = new Date().toISOString();
  }

  const feedbackVal = formData.get("feedback") as string;
  if (feedbackVal && feedbackVal !== "Sin feedback") {
    update.feedback_at = new Date().toISOString();
  }

  const admin = createSupabaseAdminClient();
  const { error } = await fromLeads(admin).update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  redirect(`/leads/${id}`);
}

export async function deleteLead(id: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await fromLeads(admin).delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/leads");
  redirect("/leads");
}
