import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SegmentForm } from "../../segment-form";
import { updateSegmentAction } from "../../actions";
import { parseDefinition } from "@/lib/crm/segments";

export const dynamic = "force-dynamic";

export default async function EditSegmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const [{ data: seg }, campaigns, events, expos, forms] = await Promise.all([
    admin.from("segments").select("*").eq("id", id).maybeSingle(),
    admin.from("campaigns").select("id, name").order("name").limit(200),
    admin.from("events").select("id, name").order("name").limit(200),
    admin.from("expos").select("id, name").order("name").limit(200),
    admin.from("forms").select("id, name").order("name").limit(200),
  ]);
  if (!seg) notFound();

  const action = updateSegmentAction.bind(null, id);
  const definition = parseDefinition(seg.definition);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={`/segmentos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar segmento
        </h1>
      </div>
      <SegmentForm
        action={action}
        initial={{ ...seg, definition }}
        options={{
          campaigns: (campaigns.data ?? []).map((x) => ({
            id: x.id,
            label: x.name,
          })),
          events: (events.data ?? []).map((x) => ({
            id: x.id,
            label: x.name,
          })),
          expos: (expos.data ?? []).map((x) => ({
            id: x.id,
            label: x.name,
          })),
          forms: (forms.data ?? []).map((x) => ({
            id: x.id,
            label: x.name,
          })),
        }}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
