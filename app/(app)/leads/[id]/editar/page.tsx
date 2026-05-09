import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateLead, deleteLead } from "../../actions";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_PROJECTS, LEAD_FEEDBACKS } from "@/lib/crm/leads";
import type { LeadRow } from "@/lib/crm/leads-db";

export const dynamic = "force-dynamic";

export default async function EditLeadPage({
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

  const updateWithId = updateLead.bind(null, id);
  const deleteWithId = deleteLead.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link
          href={`/leads/${id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editar lead
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{lead.name}</p>
        </div>
      </header>

      <form action={updateWithId}>
        <input type="hidden" name="prev_status" value={lead.status} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contacto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" name="name" defaultValue={lead.name} required />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" defaultValue={lead.phone ?? ""} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" defaultValue={lead.email ?? ""} />
              </div>
              <div>
                <Label htmlFor="locality">Localidad</Label>
                <Input id="locality" name="locality" defaultValue={lead.locality ?? ""} />
              </div>
              <div>
                <Label htmlFor="contact_medium">Medio de contacto</Label>
                <Input id="contact_medium" name="contact_medium" defaultValue={lead.contact_medium ?? ""} />
              </div>
              <div>
                <Label htmlFor="lead_source">Fuente del lead</Label>
                <Input id="lead_source" name="lead_source" defaultValue={lead.lead_source ?? ""} />
              </div>
              <div>
                <Label htmlFor="reception">Recepción</Label>
                <Select id="reception" name="reception" defaultValue={lead.reception ?? ""}>
                  <option value="">—</option>
                  <option value="agente">Agente</option>
                  <option value="persona">Persona</option>
                  <option value="forms">Forms</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clasificación y seguimiento</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <Label htmlFor="project">Proyecto</Label>
                <Select id="project" name="project" defaultValue={lead.project ?? ""}>
                  <option value="">Sin asignar</option>
                  {LEAD_PROJECTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue={lead.status}>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="broker_name">Broker / Inmobiliaria</Label>
                <Input id="broker_name" name="broker_name" defaultValue={lead.broker_name ?? ""} />
              </div>
              <div>
                <Label htmlFor="broker_email">Email broker</Label>
                <Input id="broker_email" name="broker_email" defaultValue={lead.broker_email ?? ""} />
              </div>
              <div>
                <Label htmlFor="feedback">Feedback</Label>
                <Select id="feedback" name="feedback" defaultValue={lead.feedback ?? ""}>
                  <option value="">—</option>
                  {LEAD_FEEDBACKS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="followup_3d">Seguimiento 3 días</Label>
                <Select id="followup_3d" name="followup_3d" defaultValue={lead.followup_3d ?? ""}>
                  <option value="">—</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Enviado">Enviado</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="interest">Interés</Label>
                <Input id="interest" name="interest" defaultValue={lead.interest ?? ""} />
              </div>
              <div>
                <Label htmlFor="progress">Avance</Label>
                <Input id="progress" name="progress" defaultValue={lead.progress ?? ""} />
              </div>
              <div>
                <Label htmlFor="request_summary">Qué solicitó</Label>
                <Textarea
                  id="request_summary"
                  name="request_summary"
                  rows={4}
                  defaultValue={lead.request_summary ?? ""}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Link
            href={`/leads/${id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Cancelar
          </Link>
          <button
            type="submit"
            className={buttonVariants({ size: "sm" })}
          >
            Guardar cambios
          </button>
        </div>
      </form>

      <div className="flex justify-start">
        <form action={deleteWithId}>
          <button
            type="submit"
            className={buttonVariants({ variant: "destructive", size: "sm" })}
          >
            Eliminar lead
          </button>
        </form>
      </div>
    </div>
  );
}
