import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, fullName } from "@/lib/utils";
import { ScoreCard } from "./score-card";

export const dynamic = "force-dynamic";

async function getContact(id: string) {
  const supabase = createSupabaseAdminClient();

  const [{ data: contact, error }, { data: touchpoints }, { data: score }] =
    await Promise.all([
      supabase.from("contacts").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("contact_touchpoints")
        .select("id, source_type, source_name, occurred_at, metadata")
        .eq("contact_id", id)
        .order("occurred_at", { ascending: false })
        .limit(50),
      supabase
        .from("contact_scores")
        .select(
          "fit_score, engagement_score, intent_score, freshness_score, score_total, calculated_at, scoring_model",
        )
        .eq("contact_id", id)
        .eq("is_current", true)
        .maybeSingle(),
    ]);

  if (error) throw new Error(error.message);
  if (!contact) return null;

  return { contact, touchpoints: touchpoints ?? [], score: score ?? null };
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getContact(id);
  if (!data) notFound();

  const { contact, touchpoints, score } = data;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/contactos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Ficha de contacto
            </div>
            <CardTitle className="text-2xl">
              {fullName(contact.first_name, contact.last_name)}
            </CardTitle>
            <CardDescription>
              {contact.phone}
              {contact.email && ` · ${contact.email}`}
            </CardDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{contact.status}</Badge>
              {contact.phone_normalized && (
                <Badge variant="secondary" className="font-mono text-xs">
                  {contact.phone_normalized}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/touchpoints/nuevo?contact=${contact.id}`}
              className={buttonVariants({ size: "sm" })}
            >
              <Plus className="h-4 w-4" />
              Touchpoint
            </Link>
            <Link
              href={`/contactos/${contact.id}/editar`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Creado
              </dt>
              <dd>{formatDateTime(contact.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Última actualización
              </dt>
              <dd>{formatDateTime(contact.updated_at)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Email normalizado
              </dt>
              <dd className="font-mono text-xs">
                {contact.email_normalized ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                ID
              </dt>
              <dd className="font-mono text-xs text-muted-foreground">
                {contact.id}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <ScoreCard contactId={contact.id} score={score} />

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle>Historial de touchpoints</CardTitle>
            <CardDescription>
              Todas las interacciones y apariciones del contacto, ordenadas de
              más recientes a más antiguas.
            </CardDescription>
          </div>
          <Link
            href={`/touchpoints/nuevo?contact=${contact.id}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Link>
        </CardHeader>
        <CardContent>
          {touchpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay touchpoints para este contacto. Se irán registrando a
              medida que haya formularios, llamadas, eventos o importaciones.
            </p>
          ) : (
            <ol className="flex flex-col gap-4">
              {touchpoints.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-col gap-1 border-l-2 border-primary/40 pl-4"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{t.source_type}</Badge>
                    {t.source_name && (
                      <span className="text-sm font-medium">
                        {t.source_name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(t.occurred_at)}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
