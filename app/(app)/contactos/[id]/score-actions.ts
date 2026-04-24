"use server";

import { revalidatePath } from "next/cache";
import { persistScoreForContact } from "@/lib/crm/scoring";

export async function recalculateContactScoreAction(contactId: string) {
  await persistScoreForContact(contactId);
  revalidatePath(`/contactos/${contactId}`);
  revalidatePath("/contactos");
}
