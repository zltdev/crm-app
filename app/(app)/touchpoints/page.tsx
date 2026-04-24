import Link from "next/link";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatDateTime, fullName } from "@/lib/utils";
import { SourceBadge } from "@/components/crm/source-badge";
import {
  SOURCE_LABELS,
  TOUCHPOINT_SOURCE_TYPES,
} from "./nuevo/constants";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

type SearchParams = {
  source_type?: string;
  from?: string;
  to?: string;
  contact?: string;
  page?: string;
};

type RowContact = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  email: string | null;
};

type Row = {
  id: string;
  source_type: string;
  source_name: string | null;
  occurred_at: string;
  campaign_id: string | null;
  event_id: string | null;
  expo_id: string | null;
  form_id: string | null;
  contact: RowContact | null;
};

async function getTouchpoints(params: SearchParams) {
  const pageNum = Math.max(1, Number(params.page ?? 1));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const admin = createSupabaseAdminClient();
  let q = admin
    .from("contact_touchpoints")
    .select(
      `id, source_type, source_name, occurred_at,
       campaign_id, event_id, expo_id, form_id,
       contact:contacts(id, first_name, last_name, phone, email)`,
      { count: "exact" },
    )
    .order("occurred_at", { ascending: false })
    .range(from, to);

  if (params.source_type) q = q.eq("source_type", params.source_type);
  if (params.from) q = q.gte("occurred_at", params.from);
  if (params.to) q = q.lte("occurred_at", params.to);
  if (params.contact) q = q.eq("contact_id", params.contact);

  const { data, count, error } = await q;
  return {
    rows: (data as unknown as Row[]) ?? [],
    total: count ?? 0,
    page: pageNum,
    error: error?.message ?? null,
  };
}

function contextLabel(r: Row): string {
  const bits: string[] = [];
  if (r.campaign_id) bits.push("Campaña");
  if (r.event_id) bits.push("Evento");
  if (r.expo_id) bits.push("Expo");
  if (r.form_id) bits.push("Formulario");
  return bits.join(" · ");
}

export default async function TouchpointsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { rows, total, page, error } = await getTouchpoints(params);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Touchpoints</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial global de interacciones. {total.toLocaleString("es-AR")}{" "}
            registro{total === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/touchpoints/nuevo"
          className={buttonVariants({ size: "sm" })}
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </Link>
      </header>

      <Card>
        <CardContent className="py-4">
          <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select name="source_type" defaultValue={params.source_type ?? ""}>
                <option value="">Todos</option>
                {TOUCHPOINT_SOURCE_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Desde</label>
              <Input
                type="date"
                name="from"
                defaultValue={params.from ?? ""}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Hasta</label>
              <Input type="date" name="to" defaultValue={params.to ?? ""} />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className={buttonVariants({ variant: "secondary" })}
              >
                Filtrar
              </button>
              {(params.source_type || params.from || params.to || params.contact) && (
                <Link
                  href="/touchpoints"
                  className={buttonVariants({ variant: "ghost" })}
                >
                  Limpiar
                </Link>
              )}
              {params.contact && (
                <input type="hidden" name="contact" value={params.contact} />
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Contexto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Sin touchpoints para estos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/touchpoints/${r.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {formatDateTime(r.occurred_at)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {r.contact ? (
                        <Link
                          href={`/contactos/${r.contact.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          <span className="font-medium">
                            {fullName(
                              r.contact.first_name,
                              r.contact.last_name,
                            )}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {r.contact.phone}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SourceBadge type={r.source_type} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.source_name || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {contextLabel(r) || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={{
                  pathname: "/touchpoints",
                  query: { ...params, page: page - 1 },
                }}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={{
                  pathname: "/touchpoints",
                  query: { ...params, page: page + 1 },
                }}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
