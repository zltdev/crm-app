import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LeadStatusBadge, LeadFeedbackBadge } from "@/components/crm/lead-status-badge";
import type { LeadRow } from "@/lib/crm/leads-db";

export const dynamic = "force-dynamic";

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function fmtFull(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdminClient();
  const { data, error } = await (
    admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createSupabaseAdminClient>["from"]> }
  )
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return notFound();
  const lead = data as LeadRow;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/leads"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {lead.name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Lead · {fmtFull(lead.contacted_at)}
            </p>
          </div>
        </div>
        <Link
          href={`/leads/${id}/editar`}
          className={buttonVariants({ size: "sm" })}
        >
          <Pencil className="h-4 w-4" /> Editar
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-3 text-sm">
            <Field label="Teléfono" value={lead.phone} />
            <Field label="Email" value={lead.email} />
            <Field label="Localidad" value={lead.locality} />
            <Field label="Recepción" value={lead.reception} />
            <Field label="Medio de contacto" value={lead.contact_medium} />
            <Field label="Fuente del lead" value={lead.lead_source} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clasificación</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Proyecto</div>
              <div className="mt-0.5 font-medium">{lead.project ?? "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Estado</div>
              <div className="mt-1">
                <LeadStatusBadge status={lead.status} />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Feedback</div>
              <div className="mt-1">
                <LeadFeedbackBadge feedback={lead.feedback} />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Duplicado</div>
              <div className="mt-0.5 font-medium">
                {lead.is_duplicate ? "Sí" : "No"}
              </div>
            </div>
            <Field label="Mes" value={lead.month} />
            <Field label="Fuente datos" value={lead.data_source} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Derivación</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-y-3 text-sm">
            <Field label="Broker" value={lead.broker_name} />
            <Field label="Email broker" value={lead.broker_email} />
            <Field label="Fecha derivación" value={fmt(lead.derived_at)} />
            <Field label="Fecha aceptación" value={fmt(lead.accepted_at)} />
            <Field label="Seguimiento 3 días" value={lead.followup_3d} />
            <Field label="Fecha feedback" value={fmt(lead.feedback_at)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descripción</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">
                Qué solicitó
              </div>
              <div className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">
                {lead.request_summary || "—"}
              </div>
            </div>
            {lead.interest && (
              <div>
                <div className="text-xs text-muted-foreground">Interés</div>
                <div className="mt-0.5">{lead.interest}</div>
              </div>
            )}
            {lead.progress && (
              <div>
                <div className="text-xs text-muted-foreground">Avance</div>
                <div className="mt-0.5">{lead.progress}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value ?? "—"}</div>
    </div>
  );
}
