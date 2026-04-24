import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil, RefreshCw, Megaphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/crm/status-badge";
import { DeleteButton } from "@/components/crm/delete-button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, fullName } from "@/lib/utils";
import {
  deleteSegmentAction,
  refreshSegmentAction,
} from "../actions";
import { parseDefinition, SCORE_TYPE_LABELS } from "@/lib/crm/segments";
import { SOURCE_LABELS } from "@/app/(app)/touchpoints/nuevo/constants";
import { SegmentCampaignLauncher } from "./campaign-launcher";

export const dynamic = "force-dynamic";

async function getData(id: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: seg }, { data: members, count }, campaigns] =
    await Promise.all([
      admin.from("segments").select("*").eq("id", id).maybeSingle(),
      admin
        .from("contact_segments")
        .select(
          `assigned_at,
           contact:contacts(id, first_name, last_name, phone, email, status)`,
          { count: "exact" },
        )
        .eq("segment_id", id)
        .order("assigned_at", { ascending: false })
        .limit(50),
      admin
        .from("campaigns")
        .select("id, name, status")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  return {
    seg,
    members:
      (members as unknown as Array<{
        assigned_at: string;
        contact: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string;
          email: string | null;
          status: string;
        } | null;
      }>) ?? [],
    total: count ?? 0,
    campaigns: campaigns.data ?? [],
  };
}

export default async function SegmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { seg, members, total, campaigns } = await getData(id);
  if (!seg) notFound();

  const def = parseDefinition(seg.definition);
  const contactIds = members
    .map((m) => m.contact?.id)
    .filter((x): x is string => !!x);

  const deleteAction = async () => {
    "use server";
    await deleteSegmentAction(id);
  };
  const refreshAction = async () => {
    "use server";
    await refreshSegmentAction(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/segmentos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver
      </Link>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Segmento
            </div>
            <CardTitle className="text-2xl">{seg.name}</CardTitle>
            {seg.description && (
              <CardDescription>{seg.description}</CardDescription>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              <StatusBadge status={seg.status} />
              <Badge variant="secondary">
                {total.toLocaleString("es-AR")} miembro
                {total === 1 ? "" : "s"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <form action={refreshAction}>
              <button
                type="submit"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                <RefreshCw className="h-4 w-4" />
                Refrescar
              </button>
            </form>
            <Link
              href={`/segmentos/${id}/editar`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
            <DeleteButton action={deleteAction} />
          </div>
        </CardHeader>
        <CardContent>
          <DefinitionSummary definition={def} />
        </CardContent>
      </Card>

      {total > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Acción en lote</CardTitle>
              <CardDescription>
                Creá una campaña con todos los miembros del segmento.
              </CardDescription>
            </div>
            <SegmentCampaignLauncher
              contactIds={contactIds}
              totalMembers={total}
              campaigns={campaigns}
            />
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Miembros ({total.toLocaleString("es-AR")})</CardTitle>
          <CardDescription>
            Últimos 50 asignados. Tocá &quot;Refrescar&quot; arriba si cambiaste
            reglas o si hay contactos nuevos.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contacto</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Asignado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Sin miembros. Tocá &quot;Refrescar&quot; para calcular quiénes
                    cumplen las reglas.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m, i) => (
                  <TableRow key={`${m.contact?.id ?? i}`}>
                    <TableCell className="font-medium">
                      {m.contact ? (
                        <Link
                          href={`/contactos/${m.contact.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {fullName(
                            m.contact.first_name,
                            m.contact.last_name,
                          )}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {m.contact?.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      {m.contact?.email || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(m.assigned_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DefinitionSummary({ definition: d }: { definition: ReturnType<typeof parseDefinition> }) {
  const hasStatus = d.status.length > 0;
  const hasTp =
    d.touchpoints.source_types.length > 0 ||
    !!d.touchpoints.campaign_id ||
    !!d.touchpoints.event_id ||
    !!d.touchpoints.expo_id ||
    !!d.touchpoints.form_id ||
    d.touchpoints.min_count > 0 ||
    !!d.touchpoints.within_days;

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
          Estado del contacto
        </dt>
        <dd>{hasStatus ? d.status.join(", ") : "Cualquiera"}</dd>
      </div>
      <div>
        <dt className="text-xs uppercase tracking-wide text-muted-foreground">
          Email
        </dt>
        <dd>
          {d.has_email === "yes"
            ? "Tiene email"
            : d.has_email === "no"
              ? "Sin email"
              : "Cualquiera"}
        </dd>
      </div>
      {(d.created_from || d.created_to) && (
        <div className="md:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            Fecha de alta
          </dt>
          <dd>
            {d.created_from ?? "cualquiera"} → {d.created_to ?? "hoy"}
          </dd>
        </div>
      )}
      {hasTp && (
        <div className="md:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            Touchpoints
          </dt>
          <dd className="flex flex-wrap gap-2 text-xs">
            {d.touchpoints.source_types.length > 0 && (
              <span>
                tipos:{" "}
                {d.touchpoints.source_types
                  .map((t) => SOURCE_LABELS[t])
                  .join(", ")}
              </span>
            )}
            {d.touchpoints.min_count > 0 && (
              <span>mínimo {d.touchpoints.min_count}</span>
            )}
            {d.touchpoints.within_days && (
              <span>últimos {d.touchpoints.within_days} días</span>
            )}
          </dd>
        </div>
      )}
      {d.score && (
        <div className="md:col-span-2">
          <dt className="text-xs uppercase tracking-wide text-muted-foreground">
            Score
          </dt>
          <dd>
            {SCORE_TYPE_LABELS[d.score.type]}{" "}
            {d.score.min != null && <>≥ {d.score.min}</>}
            {d.score.min != null && d.score.max != null && " · "}
            {d.score.max != null && <>≤ {d.score.max}</>}
          </dd>
        </div>
      )}
    </dl>
  );
}
