import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EventForm } from "../event-form";
import { createEventAction } from "../actions";

export const dynamic = "force-dynamic";

async function getCampaignOptions() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("campaigns")
    .select("id, name")
    .order("name")
    .limit(200);
  return (data ?? []).map((c) => ({ id: c.id, label: c.name }));
}

export default async function NewEventPage() {
  const campaigns = await getCampaignOptions();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/eventos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nuevo evento
        </h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <EventForm
            action={createEventAction}
            campaigns={campaigns}
            submitLabel="Crear evento"
          />
        </CardContent>
      </Card>
    </div>
  );
}
