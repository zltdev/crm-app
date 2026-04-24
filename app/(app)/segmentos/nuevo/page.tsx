import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SegmentForm } from "../segment-form";
import { createSegmentAction } from "../actions";

export const dynamic = "force-dynamic";

async function getOptions() {
  const admin = createSupabaseAdminClient();
  const [campaigns, events, expos, forms] = await Promise.all([
    admin.from("campaigns").select("id, name").order("name").limit(200),
    admin.from("events").select("id, name").order("name").limit(200),
    admin.from("expos").select("id, name").order("name").limit(200),
    admin.from("forms").select("id, name").order("name").limit(200),
  ]);
  return {
    campaigns: (campaigns.data ?? []).map((x) => ({ id: x.id, label: x.name })),
    events: (events.data ?? []).map((x) => ({ id: x.id, label: x.name })),
    expos: (expos.data ?? []).map((x) => ({ id: x.id, label: x.name })),
    forms: (forms.data ?? []).map((x) => ({ id: x.id, label: x.name })),
  };
}

export default async function NewSegmentPage() {
  const options = await getOptions();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/segmentos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nuevo segmento
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Definí reglas. Después tocás &quot;Refrescar&quot; y el segmento se
          llena con los contactos que matchean.
        </p>
      </div>
      <SegmentForm
        action={createSegmentAction}
        options={options}
        submitLabel="Crear segmento"
      />
    </div>
  );
}
