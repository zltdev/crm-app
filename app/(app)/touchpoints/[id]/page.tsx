import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, fullName } from "@/lib/utils";
import { SourceBadge } from "@/components/crm/source-badge";
import { DeleteButton } from "@/components/crm/delete-button";
import { deleteTouchpointAction } from "../actions";

export const dynamic = "force-dynamic";

async function getTouchpoint(id: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("contact_touchpoints")
    .select(
      `*,
       contact:contacts(id, first_name, last_name, phone, email),
       campaign:campaigns(id, name),
       event:events(id, name),
       expo:expos(id, name),
       form:forms(id, name)`,
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

export default async function TouchpointDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tp = await getTouchpoint(id);
  if (!tp) notFound();

  const meta = (tp.metadata && typeof tp.metadata === "object"
    ? (tp.metadata as Record<string, unknown>)
    : {}) ?? {};
  const deleteAction = async () => {
    "use server";
    await deleteTouchpointAction(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/touchpoints"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver
      </Link>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Touchpoint
            </div>
            <CardTitle className="text-2xl">
              {tp.source_name || (tp.contact ? fullName(tp.contact.first_name, tp.contact.last_name) : "—")}
            </CardTitle>
            <CardDescription>
              {formatDateTime(tp.occurred_at)}
            </CardDescription>
            <div className="mt-1 flex items-center gap-2">
              <SourceBadge type={tp.source_type} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/touchpoints/${id}/editar`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
            <DeleteButton action={deleteAction} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Contacto
              </dt>
              <dd>
                {tp.contact ? (
                  <Link
                    href={`/contactos/${tp.contact.id}`}
                    className="text-primary hover:underline"
                  >
                    {fullName(tp.contact.first_name, tp.contact.last_name)}
                    <span className="ml-2 text-muted-foreground">
                      {tp.contact.phone}
                    </span>
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Fuente
              </dt>
              <dd>{tp.source_name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Campaña
              </dt>
              <dd>
                {tp.campaign ? (
                  <Link
                    href={`/campanas/${tp.campaign.id}`}
                    className="text-primary hover:underline"
                  >
                    {tp.campaign.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Evento
              </dt>
              <dd>
                {tp.event ? (
                  <Link
                    href={`/eventos/${tp.event.id}`}
                    className="text-primary hover:underline"
                  >
                    {tp.event.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Expo
              </dt>
              <dd>
                {tp.expo ? (
                  <Link
                    href={`/expos/${tp.expo.id}`}
                    className="text-primary hover:underline"
                  >
                    {tp.expo.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Formulario
              </dt>
              <dd>
                {tp.form ? (
                  <Link
                    href={`/formularios/${tp.form.id}`}
                    className="text-primary hover:underline"
                  >
                    {tp.form.name}
                  </Link>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {typeof meta.notes === "string" && meta.notes && (
              <div className="md:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Notas
                </dt>
                <dd className="whitespace-pre-wrap">{String(meta.notes)}</dd>
              </div>
            )}
            <div className="md:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Metadata adicional
              </dt>
              <dd>
                <pre className="mt-1 overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(tp.metadata, null, 2)}
                </pre>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
