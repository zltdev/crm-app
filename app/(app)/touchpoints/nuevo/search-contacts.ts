"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/crm/normalize";

export type ContactSearchResult = {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export async function searchContactsAction(
  query: string,
): Promise<ContactSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const admin = createSupabaseAdminClient();
  const normalized = normalizePhone(q);
  const like = `%${q}%`;

  const orFilters = [
    `first_name.ilike.${like}`,
    `last_name.ilike.${like}`,
    `email.ilike.${like}`,
    `phone.ilike.${like}`,
  ];
  if (normalized) {
    orFilters.push(`phone_normalized.ilike.%${normalized}%`);
  }

  const { data } = await admin
    .from("contacts")
    .select("id, phone, first_name, last_name, email")
    .or(orFilters.join(","))
    .limit(20);
  return data ?? [];
}
