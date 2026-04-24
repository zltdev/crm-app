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

export const dynamic = "force-dynamic";

async function getData(id: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: campaign }, { data: touchpoints, count }] = await Promise.all([
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
  ]);
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
    touchpointsCount: count ?? 0,
  };
}

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { campaign, touchpoints, touchpointsCount } = await getData(id);
  if (!campaign) notFound();

  const deleteAction = async () => {
    "use server";
    await deleteCampaignAction(id);
  };

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
