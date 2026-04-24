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
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, fullName } from "@/lib/utils";
import { StatusBadge } from "@/components/crm/status-badge";
import { DeleteButton } from "@/components/crm/delete-button";
import { deleteEventAction } from "../actions";

export const dynamic = "force-dynamic";

async function getData(id: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: event }, { data: attendances, count }] = await Promise.all([
    admin
      .from("events")
      .select("*, campaign:campaigns(id, name)")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("event_attendances")
      .select(
        `id, attendance_status, lead_source, checked_in_at, created_at,
         contact:contacts(id, first_name, last_name, phone)`,
        { count: "exact" },
      )
      .eq("event_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  return {
    event,
    attendances:
      (attendances as unknown as Array<{
        id: string;
        attendance_status: string;
        lead_source: string | null;
        checked_in_at: string | null;
        created_at: string;
        contact: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          phone: string;
        } | null;
      }>) ?? [],
    total: count ?? 0,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { event, attendances, total } = await getData(id);
  if (!event) notFound();

  const deleteAction = async () => {
    "use server";
    await deleteEventAction(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/eventos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver
      </Link>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Evento
            </div>
            <CardTitle className="text-2xl">{event.name}</CardTitle>
            {event.location && (
              <CardDescription>{event.location}</CardDescription>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              <StatusBadge status={event.status} />
              {event.event_type && <Badge variant="secondary">{event.event_type}</Badge>}
              {event.campaign && (
                <Link
                  href={`/campanas/${event.campaign.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Campaña: {event.campaign.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/eventos/${id}/editar`}
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
                Inicio
              </dt>
              <dd>{formatDateTime(event.start_at)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Fin
              </dt>
              <dd>{formatDateTime(event.end_at)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Asistentes ({total.toLocaleString("es-AR")})
          </CardTitle>
          <CardDescription>Últimos 50.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Lead source</TableHead>
                <TableHead>Check-in</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendances.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Aún no hay asistentes registrados.
                  </TableCell>
                </TableRow>
              ) : (
                attendances.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {a.contact ? (
                        <Link
                          href={`/contactos/${a.contact.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {fullName(
                            a.contact.first_name,
                            a.contact.last_name,
                          )}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {a.contact.phone}
                          </span>
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={a.attendance_status} />
                    </TableCell>
                    <TableCell>{a.lead_source ?? "—"}</TableCell>
                    <TableCell>
                      {a.checked_in_at ? formatDateTime(a.checked_in_at) : "—"}
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
