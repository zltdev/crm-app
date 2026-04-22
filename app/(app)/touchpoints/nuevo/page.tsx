import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { TouchpointForm } from "./touchpoint-form";
import type { ContactSearchResult } from "./search-contacts";

export const dynamic = "force-dynamic";

async function getOptions() {
  const admin = createSupabaseAdminClient();
  const [events, expos, forms, campaigns] = await Promise.all([
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
    events: (events.data ?? []).map((e) => ({
      id: e.id,
      label:
        e.name + (e.start_at ? ` (${e.start_at.slice(0, 10)})` : ""),
    })),
    expos: (expos.data ?? []).map((e) => ({
      id: e.id,
      label:
        e.name + (e.start_date ? ` (${e.start_date.slice(0, 10)})` : ""),
    })),
    forms: (forms.data ?? []).map((f) => ({ id: f.id, label: f.name })),
    campaigns: (campaigns.data ?? []).map((c) => ({ id: c.id, label: c.name })),
  };
}

async function getContact(id: string): Promise<ContactSearchResult | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("contacts")
    .select("id, phone, first_name, last_name, email")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

export default async function NewTouchpointPage({
  searchParams,
}: {
  searchParams: Promise<{ contact?: string }>;
}) {
  const params = await searchParams;
  const [options, initialContact] = await Promise.all([
    getOptions(),
    params.contact ? getContact(params.contact) : Promise.resolve(null),
  ]);

  const backHref = params.contact
    ? `/contactos/${params.contact}`
    : "/contactos";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nuevo touchpoint
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Registrá una interacción manual para un contacto ya existente.
          {!initialContact && " Buscá el contacto primero."}
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <TouchpointForm
            initialContact={initialContact}
            options={options}
          />
        </CardContent>
      </Card>
    </div>
  );
}
