import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  SOURCE_LABELS,
  TOUCHPOINT_SOURCE_TYPES,
} from "./nuevo/constants";
import {
  TouchpointsTable,
  type TouchpointRow as Row,
} from "./touchpoints-table";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 30;

type SearchParams = {
  source_type?: string;
  from?: string;
  to?: string;
  contact?: string;
  page?: string;
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

async function getCampaignsForDialog() {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("campaigns")
    .select("id, name, status")
    .order("created_at", { ascending: false })
    .limit(200);
  return data ?? [];
}

export default async function TouchpointsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ rows, total, page, error }, campaigns] = await Promise.all([
    getTouchpoints(params),
    getCampaignsForDialog(),
  ]);
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

      <TouchpointsTable
        rows={rows}
        totalFiltered={total}
        filters={{
          source_type: params.source_type,
          from: params.from,
          to: params.to,
          contact: params.contact,
        }}
        campaigns={campaigns}
      />

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
