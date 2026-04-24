import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { EventForm } from "../../event-form";
import { updateEventAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const [{ data: event }, { data: campaigns }] = await Promise.all([
    admin.from("events").select("*").eq("id", id).maybeSingle(),
    admin.from("campaigns").select("id, name").order("name").limit(200),
  ]);
  if (!event) notFound();
  const action = updateEventAction.bind(null, id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={`/eventos/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar evento
        </h1>
      </div>
      <Card>
        <CardContent className="pt-6">
          <EventForm
            action={action}
            initial={event}
            campaigns={(campaigns ?? []).map((c) => ({
              id: c.id,
              label: c.name,
            }))}
            submitLabel="Guardar cambios"
          />
        </CardContent>
      </Card>
    </div>
  );
}
