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
import { formatDateTime, fullName } from "@/lib/utils";
import { StatusBadge } from "@/components/crm/status-badge";
import { DeleteButton } from "@/components/crm/delete-button";
import { deleteFormAction } from "../actions";

export const dynamic = "force-dynamic";

async function getData(id: string) {
  const admin = createSupabaseAdminClient();
  const [{ data: form }, { data: subs, count }] = await Promise.all([
    admin
      .from("forms")
      .select("*, campaign:campaigns(id, name)")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("form_submissions")
      .select(
        `id, submitted_at,
         contact:contacts(id, first_name, last_name, phone)`,
        { count: "exact" },
      )
      .eq("form_id", id)
      .order("submitted_at", { ascending: false })
      .limit(50),
  ]);
  return {
    form,
    subs:
      (subs as unknown as Array<{
        id: string;
        submitted_at: string;
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

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { form, subs, total } = await getData(id);
  if (!form) notFound();

  const deleteAction = async () => {
    "use server";
    await deleteFormAction(id);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/formularios"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver
      </Link>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div className="flex flex-col gap-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Formulario
            </div>
            <CardTitle className="text-2xl">{form.name}</CardTitle>
            {form.slug && (
              <CardDescription className="font-mono text-xs">
                /{form.slug}
              </CardDescription>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              <StatusBadge status={form.status} />
              {form.campaign && (
                <Link
                  href={`/campanas/${form.campaign.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  Campaña: {form.campaign.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/formularios/${id}/editar`}
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
                Nombre de origen
              </dt>
              <dd>{form.source_name ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                ID
              </dt>
              <dd className="font-mono text-xs text-muted-foreground">
                {form.id}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Submissions ({total.toLocaleString("es-AR")})
          </CardTitle>
          <CardDescription>Últimas 50 entregas.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Contacto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="py-8 text-center text-sm text-muted-foreground"
                  >
                    Aún no hay submissions.
                  </TableCell>
                </TableRow>
              ) : (
                subs.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDateTime(s.submitted_at)}
                    </TableCell>
                    <TableCell>
                      {s.contact ? (
                        <Link
                          href={`/contactos/${s.contact.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {fullName(
                            s.contact.first_name,
                            s.contact.last_name,
                          )}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {s.contact.phone}
                          </span>
                        </Link>
                      ) : (
                        "—"
                      )}
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
