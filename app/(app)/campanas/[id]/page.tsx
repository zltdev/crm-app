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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDate, formatDateTime, fullName } from "@/lib/utils";
import { StatusBadge } from "@/components/crm/status-badge";
import { SourceBadge } from "@/components/crm/source-badge";
import { DeleteButton } from "@/components/crm/delete-button";
import { deleteCampaignAction } from "../actions";
import {
  CAMPAIGN_CHANNEL_LABELS,
  type CampaignChannel,
} from "../constants";
import {
  DELIVERY_CHANNEL_LABELS,
  DELIVERY_STATUS_LABELS,
  type DeliveryChannel,
  type DeliveryStatus,
} from "@/lib/crm/deliveries";

export const dynamic = "force-dynamic";

async function getData(id: string) {
  const admin = createSupabaseAdminClient();
  const [
    { data: campaign },
    { data: touchpoints, count: tpCount },
    { data: deliveries, count: dlvCount },
    statsResp,
  ] = await Promise.all([
    admin.from("campaigns").select("*").eq("id", id).maybeSingle(),
    admin
      .from("contact_touchpoints")
      .select(
        `id, occurred_at, source_type, source_name,
         contact:contacts(id, first_name, last_name, phone)`,
        { count: "exact" },
      )
      .eq("campaign_id", id)
      .order("occurred_at", { ascending: false })
      .limit(30),
    admin
      .from("campaign_deliveries")
      .select(
        `id, channel, delivery_status, scheduled_at, delivered_at, opened_at, created_at,
         contact:contacts(id, first_name, last_name, phone, email)`,
        { count: "exact" },
      )
      .eq("campaign_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("campaign_deliveries")
      .select("delivery_status")
      .eq("campaign_id", id),
  ]);

  const statusCounts: Record<string, number> = {};
  ((statsResp.data as { delivery_status: string }[] | null) ?? []).forEach(
    (r) => {
      statusCounts[r.delivery_status] =
        (statusCounts[r.delivery_status] ?? 0) + 1;
    },
  );

  return {
    campaign,
    touchpoints:
      (touchpoints as unknown as Array<{
        id: string;
        occurred_at: string;
        source_type: string;
        source_name: string | null;
        contact: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string;
        } | null;
      }>) ?? [],
    touchpointsCount: tpCount ?? 0,
    deliveries:
      (deliveries as unknown as Array<{
        id: string;
        channel: string;
        delivery_status: string;
        scheduled_at: string | null;
        delivered_at: string | null;
        opened_at: string | null;
        created_at: string;
        contact: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string;
          email: string | null;
        } | null;
      }>) ?? [],
    deliveriesCount: dlvCount ?? 0,
    statusCounts,
  };
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; skipped?: string; unique?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const {
    campaign,
    touchpoints,
    touchpointsCount,
    deliveries,
    deliveriesCount,
    statusCounts,
  } = await getData(id);
  if (!campaign) notFound();

  const deleteAction = async () => {
    "use server";
    await deleteCampaignAction(id);
  };

  const createdN = Number(sp.created ?? 0);
  const skippedN = Number(sp.skipped ?? 0);
  const uniqueN = Number(sp.unique ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/campanas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver
      </Link>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Campaña
            </div>
            <CardTitle className="text-2xl">{campaign.name}</CardTitle>
            {campaign.description && (
              <CardDescription>{campaign.description}</CardDescription>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              <StatusBadge status={campaign.status} />
              {campaign.channel && (
                <span className="text-xs text-muted-foreground">
                  Canal:{" "}
                  {CAMPAIGN_CHANNEL_LABELS[
                    campaign.channel as CampaignChannel
                  ] ?? campaign.channel}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/campanas/${id}/editar`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
            <DeleteButton
              action={deleteAction}
              confirmMessage="Eliminar campaña. Los touchpoints quedan sin campaña asignada."
            />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm md:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Desde
              </dt>
              <dd>{formatDate(campaign.start_date)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Hasta
              </dt>
              <dd>{formatDate(campaign.end_date)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {(createdN > 0 || skippedN > 0) && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="py-3 text-sm">
            Se crearon <b>{createdN.toLocaleString("es-AR")}</b> delivery
            {createdN === 1 ? "" : "s"}
            {skippedN > 0 && (
              <>
                {" "}
                ·{" "}
                <span className="text-muted-foreground">
                  {skippedN.toLocaleString("es-AR")} contacto
                  {skippedN === 1 ? "" : "s"} omitido
                  {skippedN === 1 ? "" : "s"} (ya tenían delivery activo)
                </span>
              </>
            )}
            {uniqueN > 0 && (
              <span className="ml-2 text-muted-foreground">
                · Contactos únicos: {uniqueN.toLocaleString("es-AR")}
              </span>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>
              Deliveries ({deliveriesCount.toLocaleString("es-AR")})
            </CardTitle>
            <CardDescription>
              Envíos planificados y su estado. Últimos 50.
            </CardDescription>
          </div>
          {Object.keys(statusCounts).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(statusCounts).map(([s, n]) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs"
                >
                  <StatusBadge status={s} />
                  <span className="tabular-nums">{n}</span>
                </span>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contacto</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Entregado</TableHead>
                <TableHead>Abierto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Aún no hay deliveries. Usá el botón &quot;Crear
                    campaña&quot; desde /touchpoints o /contactos para
                    agregar.
                  </TableCell>
                </TableRow>
              ) : (
                deliveries.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      {d.contact ? (
                        <Link
                          href={`/contactos/${d.contact.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {fullName(
                            d.contact.first_name,
                            d.contact.last_name,
                          )}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {d.contact.phone}
                          </span>
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {DELIVERY_CHANNEL_LABELS[d.channel as DeliveryChannel] ??
                        d.channel}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={d.delivery_status} />
                      <span className="sr-only">
                        {DELIVERY_STATUS_LABELS[
                          d.delivery_status as DeliveryStatus
                        ] ?? d.delivery_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.scheduled_at ? formatDateTime(d.scheduled_at) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.delivered_at ? formatDateTime(d.delivered_at) : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.opened_at ? formatDateTime(d.opened_at) : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Touchpoints asociados ({touchpointsCount.toLocaleString("es-AR")})
          </CardTitle>
          <CardDescription>
            Últimos 30. Incluye los importados y los manuales.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fuente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {touchpoints.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Aún no hay touchpoints asociados a esta campaña.
                  </TableCell>
                </TableRow>
              ) : (
                touchpoints.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/touchpoints/${t.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {formatDateTime(t.occurred_at)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {t.contact ? (
                        <Link
                          href={`/contactos/${t.contact.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {fullName(
                            t.contact.first_name,
                            t.contact.last_name,
                          )}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {t.contact.phone}
                          </span>
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <SourceBadge type={t.source_type} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {t.source_name || "—"}
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
