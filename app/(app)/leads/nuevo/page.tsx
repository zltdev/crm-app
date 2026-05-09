import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buttonVariants } from "@/components/ui/button";
import { createLead } from "../actions";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_PROJECTS } from "@/lib/crm/leads";

export default function NewLeadPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link
          href="/leads"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nuevo lead</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registrar un lead manualmente.
          </p>
        </div>
      </header>

      <form action={createLead}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contacto</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" placeholder="+5491112345678" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" />
              </div>
              <div>
                <Label htmlFor="locality">Localidad</Label>
                <Input id="locality" name="locality" />
              </div>
              <div>
                <Label htmlFor="contact_medium">Medio de contacto</Label>
                <Select id="contact_medium" name="contact_medium">
                  <option value="">—</option>
                  <option value="WPP">WhatsApp</option>
                  <option value="Form Web">Form Web</option>
                  <option value="IG">Instagram</option>
                  <option value="Mail">Mail</option>
                  <option value="Presencial">Presencial</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="lead_source">Fuente del lead</Label>
                <Select id="lead_source" name="lead_source">
                  <option value="">—</option>
                  <option value="Pauta RRSS">Pauta RRSS</option>
                  <option value="Agente">Agente</option>
                  <option value="Form">Form</option>
                  <option value="Libre">Libre</option>
                  <option value="Evento">Evento</option>
                  <option value="Google Maps">Google Maps</option>
                  <option value="Mailing">Mailing</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="reception">Recepción</Label>
                <Select id="reception" name="reception">
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
              <CardTitle>Clasificación</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div>
                <Label htmlFor="project">Proyecto</Label>
                <Select id="project" name="project">
                  <option value="">Sin asignar</option>
                  {LEAD_PROJECTS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Estado</Label>
                <Select id="status" name="status" defaultValue="nuevo">
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="broker_name">Broker / Inmobiliaria</Label>
                <Input id="broker_name" name="broker_name" />
              </div>
              <div>
                <Label htmlFor="broker_email">Email broker</Label>
                <Input id="broker_email" name="broker_email" type="email" />
              </div>
              <div>
                <Label htmlFor="request_summary">Qué solicitó</Label>
                <Textarea id="request_summary" name="request_summary" rows={4} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Link
            href="/leads"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Cancelar
          </Link>
          <button type="submit" className={buttonVariants({ size: "sm" })}>
            Crear lead
          </button>
        </div>
      </form>
    </div>
  );
}
