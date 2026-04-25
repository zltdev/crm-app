import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ContactsTable } from "./contacts-table";
import { RecalcAllScoresButton } from "./recalc-all-scores-button";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

type SearchParams = {
  q?: string;
  page?: string;
  min_sources?: string;
  min_touchpoints?: string;
};

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  email: string | null;
  status: string;
  created_at: string;
};

type SummaryByContact = Record<
  string,
  { count: number; sources: string[] }
>;

async function getContacts({
  q,
  page,
  min_sources,
  min_touchpoints,
}: SearchParams) {
  const pageNum = Math.max(1, Number(page ?? 1));
  const minSources = Math.max(0, Number(min_sources ?? 0));
  const minTouchpoints = Math.max(0, Number(min_touchpoints ?? 0));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createSupabaseAdminClient();

  // Caso A: sin filtro por sources/touchpoints → query directa con range.
  if (minSources < 2 && minTouchpoints < 1) {
    let query = supabase
      .from("contacts")
      .select(
        "id, first_name, last_name, phone, email, status, created_at, updated_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (q && q.trim().length > 0) {
      const term = q.trim();
      const like = `%${term}%`;
      query = query.or(
        `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
      );
    }

    const { data, count, error } = await query;
    return {
      rows: (data ?? []) as ContactRow[],
      total: count ?? 0,
      page: pageNum,
      error: error?.message ?? null,
      summaries: {} as SummaryByContact,
    };
  }

  // Caso B: hay filtro por touchpoints → primero resolvemos los contact_ids
  // que cumplen, después paginamos sobre esos.
  // Traemos hasta 50000 touchpoints para agrupar.
  const { data: tpRows, error: tpErr } = await supabase
    .from("contact_touchpoints")
    .select("contact_id, source_type")
    .limit(50000);
  if (tpErr) {
    return {
      rows: [] as ContactRow[],
      total: 0,
      page: pageNum,
      error: tpErr.message,
      summaries: {} as SummaryByContact,
    };
  }
  const summary = new Map<string, { count: number; sources: Set<string> }>();
  for (const r of tpRows ?? []) {
    if (!r.contact_id) continue;
    const cur = summary.get(r.contact_id) ?? {
      count: 0,
      sources: new Set<string>(),
    };
    cur.count++;
    cur.sources.add(r.source_type);
    summary.set(r.contact_id, cur);
  }
  const qualifyingIds: string[] = [];
  summary.forEach((v, id) => {
    if (v.count >= minTouchpoints && v.sources.size >= minSources) {
      qualifyingIds.push(id);
    }
  });

  if (qualifyingIds.length === 0) {
    return {
      rows: [] as ContactRow[],
      total: 0,
      page: pageNum,
      error: null,
      summaries: {} as SummaryByContact,
    };
  }

  // Page sobre los qualifying ids.
  let query = supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, phone, email, status, created_at, updated_at",
      { count: "exact" },
    )
    .in("id", qualifyingIds)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q && q.trim().length > 0) {
    const term = q.trim();
    const like = `%${term}%`;
    query = query.or(
      `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`,
    );
  }

  const { data, count, error } = await query;
  const rows = (data ?? []) as ContactRow[];

  // Sumar summary solo de los visibles.
  const summaries: SummaryByContact = {};
  for (const r of rows) {
    const s = summary.get(r.id);
    if (s) {
      summaries[r.id] = {
        count: s.count,
        sources: Array.from(s.sources).sort(),
      };
    }
  }

  return {
    rows,
    total: count ?? 0,
    page: pageNum,
    error: error?.message ?? null,
    summaries,
  };
}

async function getSummariesForRows(
  contactIds: string[],
): Promise<SummaryByContact> {
  if (contactIds.length === 0) return {};
  const admin = createSupabaseAdminClient();
  try {
    const result = await (
      admin as unknown as {
        rpc: (
          name: string,
          args?: unknown,
        ) => Promise<{
          data: Array<{
            contact_id: string;
            touchpoint_count: number;
            source_types: string[];
            source_count: number;
          }> | null;
          error: { message: string } | null;
        }>;
      }
    ).rpc("contacts_touchpoint_summary", { contact_ids: contactIds });
    const out: SummaryByContact = {};
    for (const r of result.data ?? []) {
      out[r.contact_id] = {
        count: r.touchpoint_count,
        sources: r.source_types ?? [],
      };
    }
    return out;
  } catch {
    return {};
  }
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

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ rows, total, page, error, summaries: prefilledSummaries }, campaigns] =
    await Promise.all([getContacts(params), getCampaignsForDialog()]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const q = params.q ?? "";

  // Si el query no resolvió summaries (caso A sin filtros), las traemos ahora
  // solo para los rows visibles.
  const summaries: SummaryByContact =
    Object.keys(prefilledSummaries).length > 0
      ? prefilledSummaries
      : await getSummariesForRows(rows.map((r) => r.id));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contactos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Base unificada · {total.toLocaleString("es-AR")} contacto
            {total === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RecalcAllScoresButton />
          <Link
            href="/contactos/nuevo"
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="h-4 w-4" /> Nuevo contacto
          </Link>
        </div>
      </header>

      <Card>
        <CardContent className="py-4">
          <form
            method="get"
            className="grid grid-cols-1 gap-3 md:grid-cols-4"
          >
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Nombre, teléfono o email…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                Mín. fuentes distintas
              </label>
              <Select
                name="min_sources"
                defaultValue={params.min_sources ?? "0"}
              >
                <option value="0">Cualquiera</option>
                <option value="2">2 o más (cruzados)</option>
                <option value="3">3 o más</option>
                <option value="4">4 o más</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">
                Mín. touchpoints
              </label>
              <Select
                name="min_touchpoints"
                defaultValue={params.min_touchpoints ?? "0"}
              >
                <option value="0">Cualquiera</option>
                <option value="2">2 o más</option>
                <option value="5">5 o más</option>
                <option value="10">10 o más</option>
              </Select>
            </div>
            <div className="md:col-span-4 flex items-center gap-2">
              <button
                type="submit"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Aplicar
              </button>
              {(params.min_sources || params.min_touchpoints || params.q) && (
                <Link
                  href="/contactos"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Limpiar filtros
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Error: {error}
          </CardContent>
        </Card>
      )}

      <ContactsTable
        rows={rows}
        totalFiltered={total}
        filters={{ q: q || undefined }}
        campaigns={campaigns}
        summaries={summaries}
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
                  pathname: "/contactos",
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
                  pathname: "/contactos",
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
