import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateTouchpointAction } from "../../actions";
import { EditTouchpointForm } from "./edit-form";

export const dynamic = "force-dynamic";

async function getData(id: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: tp }, events, expos, forms, campaigns] = await Promise.all([
    admin
      .from("contact_touchpoints")
      .select(
        `*, contact:contacts(id, first_name, last_name, phone, email)`,
      )
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("events")
      .select("id, name, start_at")
      .order("start_at", { ascending: false })
      .limit(200),
    admin
      .from("expos")
      .select("id, name, start_date")
      .order("start_date", { ascending: false })
      .limit(200),
    admin.from("forms").select("id, name").order("name").limit(200),
    admin.from("campaigns").select("id, name").order("name").limit(200),
  ]);

  return {
    tp,
    options: {
      events: (events.data ?? []).map((e) => ({
        id: e.id,
        label: e.name + (e.start_at ? ` (${e.start_at.slice(0, 10)})` : ""),
      })),
      expos: (expos.data ?? []).map((e) => ({
        id: e.id,
        label: e.name + (e.start_date ? ` (${e.start_date.slice(0, 10)})` : ""),
      })),
      forms: (forms.data ?? []).map((f) => ({ id: f.id, label: f.name })),
      campaigns: (campaigns.data ?? []).map((c) => ({
        id: c.id,
        label: c.name,
      })),
    },
  };
}

export default async function EditTouchpointPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tp, options } = await getData(id);
  if (!tp) notFound();

  const action = updateTouchpointAction.bind(null, id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={`/touchpoints/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Editar touchpoint
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <EditTouchpointForm
            action={action}
            initial={{
              source_type: tp.source_type,
              source_name: tp.source_name,
              occurred_at: tp.occurred_at,
              campaign_id: tp.campaign_id,
              event_id: tp.event_id,
              expo_id: tp.expo_id,
              form_id: tp.form_id,
              notes:
                (tp.metadata &&
                typeof tp.metadata === "object" &&
                typeof (tp.metadata as Record<string, unknown>).notes ===
                  "string"
                  ? String(
                      (tp.metadata as Record<string, unknown>).notes,
                    )
                  : ""),
            }}
            contactLabel={
              tp.contact
                ? `${tp.contact.first_name ?? ""} ${tp.contact.last_name ?? ""}`.trim() +
                  ` — ${tp.contact.phone}`
                : "Contacto desconocido"
            }
            options={options}
          />
        </CardContent>
      </Card>
    </div>
  );
}
