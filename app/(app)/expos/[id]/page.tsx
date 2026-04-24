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
import { formatDate, fullName } from "@/lib/utils";
import { StatusBadge } from "@/components/crm/status-badge";
import { DeleteButton } from "@/components/crm/delete-button";
import { deleteExpoAction } from "../actions";

export const dynamic = "force-dynamic";

async function getData(id: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: expo }, { data: links, count }] = await Promise.all([
    admin
      .from("expos")
      .select("*, campaign:campaigns(id, name)")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("expo_contacts")
      .select(
        `id, stand, sales_rep, interaction_result, created_at,
         contact:contacts(id, first_name, last_name, phone)`,
        { count: "exact" },
      )
      .eq("expo_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  return {
    expo,
    links:
      (links as unknown as Array<{
        id: string;
        stand: string | null;
        sales_rep: string | null;
        interaction_result: string | null;
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

export default async function ExpoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { expo, links, total } = await getData(id);
  if (!expo) notFound();

  const deleteAction = async () => {
    "use server";
    await deleteExpoAction(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/expos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver
      </Link>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Expo
            </div>
            <CardTitle className="text-2xl">{expo.name}</CardTitle>
            <CardDescription>
              {[expo.venue, expo.city, expo.country]
                .filter(Boolean)
                .join(" · ") || "—"}
            </CardDescription>
            <div className="mt-1 flex flex-wrap gap-2">
              <StatusBadge status={expo.status} />
              {expo.campaign && (
                <Link
                  href={`/campanas/${expo.campaign.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Campaña: {expo.campaign.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/expos/${id}/editar`}
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
                Desde
              </dt>
              <dd>{formatDate(expo.start_date)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Hasta
              </dt>
              <dd>{formatDate(expo.end_date)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Contactos registrados ({total.toLocaleString("es-AR")})
          </CardTitle>
          <CardDescription>Últimos 50.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contacto</TableHead>
                <TableHead>Stand</TableHead>
                <TableHead>Ejecutivo</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Aún no hay contactos registrados en esta expo.
                  </TableCell>
                </TableRow>
              ) : (
                links.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      {l.contact ? (
                        <Link
                          href={`/contactos/${l.contact.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {fullName(
                            l.contact.first_name,
                            l.contact.last_name,
                          )}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {l.contact.phone}
                          </span>
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>{l.stand ?? "—"}</TableCell>
                    <TableCell>{l.sales_rep ?? "—"}</TableCell>
                    <TableCell>{l.interaction_result ?? "—"}</TableCell>
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
