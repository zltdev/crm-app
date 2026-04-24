"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DELIVERY_STATUSES } from "@/lib/crm/deliveries";

const Schema = z.object({
  delivery_id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  status: z.enum(DELIVERY_STATUSES),
});

export async function updateDeliveryStatusAction(
  _prev: { error?: string },
  fd: FormData,
): Promise<{ error?: string }> {
  const obj: Record<string, string> = {};
  fd.forEach((v, k) => {
    obj[k] = typeof v === "string" ? v : "";
  });
  const parsed = Schema.safeParse(obj);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  const { delivery_id, campaign_id, status } = parsed.data;
  const admin = createSupabaseAdminClient();

  const now = new Date().toISOString();
  const patch: {
    delivery_status: string;
    delivered_at?: string | null;
    opened_at?: string | null;
    clicked_at?: string | null;
    replied_at?: string | null;
  } = { delivery_status: status };

  if (status === "sent" || status === "delivered") {
    patch.delivered_at = now;
  }
  if (status === "opened") patch.opened_at = now;
  if (status === "clicked") patch.clicked_at = now;
  if (status === "replied") patch.replied_at = now;

  const { error } = await admin
    .from("campaign_deliveries")
    .update(patch)
    .eq("id", delivery_id);

  if (error) return { error: error.message };

  revalidatePath(`/campanas/${campaign_id}`);
  return {};
}
