import Link from "next/link";
import { Plus, Search, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { LeadStatusBadge, LeadFeedbackBadge } from "@/components/crm/lead-status-badge";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, LEAD_PROJECTS } from "@/lib/crm/leads";
import type { LeadRow } from "@/lib/crm/leads-db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type SearchParams = {
  q?: string;
  page?: string;
  status?: string;
  project?: string;
  month?: string;
  source?: string;
};

type LeadListRow = Pick<LeadRow, "id" | "name" | "phone" | "email" | "project" | "status" | "lead_source" | "feedback" | "contacted_at" | "broker_name" | "month">;

function fromLeads(admin: ReturnType<typeof createSupabaseAdminClient>) {
  return (admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createSupabaseAdminClient>["from"]> }).from("leads");
}

async function getLeads(params: SearchParams) {
  const pageNum = Math.max(1, Number(params.page ?? 1));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const admin = createSupabaseAdminClient();
  let query = fromLeads(admin)
    .select(
      "id, name, phone, email, project, status, lead_source, feedback, contacted_at, broker_name, month",
      { count: "exact" },
    )
    .order("contacted_at", { ascending: false })
    .range(from, to);

  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    query = query.or(
      `name.ilike.${like},phone.ilike.${like},email.ilike.${like},request_summary.ilike.${like}`,
    );
  }
  if (params.status) query = query.eq("status", params.status);
  if (params.project) query = query.eq("project", params.project);
  if (params.month) query = query.eq("month", params.month);
  if (params.source) query = query.eq("lead_source", params.source);

  const { data, count, error } = await query;
  return {
    rows: (data ?? []) as LeadListRow[],
    total: (count ?? 0) as number,
    page: pageNum,
    error: error?.message ?? null,
  };
}

async function getFilterOptions() {
  const admin = createSupabaseAdminClient();
  const { data: months } = await fromLeads(admin)
    .select("month")
    .not("month", "is", null)
    .order("month", { ascending: false })
    .limit(100);

  const { data: sources } = await fromLeads(admin)
    .select("lead_source")
    .not("lead_source", "is", null)
    .limit(200);

  const uniqueMonths = [...new Set(((months ?? []) as Array<{ month: string }>).map((r) => r.month))];
  const uniqueSources = [...new Set(((sources ?? []) as Array<{ lead_source: string }>).map((r) => r.lead_source))].sort();

  return { months: uniqueMonths, sources: uniqueSources };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ rows, total, page, error }, { months }] = await Promise.all([
    getLeads(params),
    getFilterOptions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = params.q || params.status || params.project || params.month || params.source;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pipeline de ventas · {total.toLocaleString("es-AR")} lead
            {total === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/leads/reportes"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <BarChart3 className="h-4 w-4" /> Reportes
          </Link>
          <Link
            href="/leads/nuevo"
            className={buttonVariants({ size: "sm" })}
          >
            <Plus className="h-4 w-4" /> Nuevo lead
          </Link>
        </div>
      </header>

      <Card>
        <CardContent className="py-4">
          <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="md:col-span-2 flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="Nombre, teléfono, email…"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Estado</label>
              <Select name="status" defaultValue={params.status ?? ""}>
                <option value="">Todos</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Proyecto</label>
              <Select name="project" defaultValue={params.project ?? ""}>
                <option value="">Todos</option>
                {LEAD_PROJECTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Mes</label>
              <Select name="month" defaultValue={params.month ?? ""}>
                <option value="">Todos</option>
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-5 flex items-center gap-2">
              <button
                type="submit"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                Aplicar
              </button>
              {hasFilters && (
                <Link
                  href="/leads"
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Proyecto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Feedback</TableHead>
              <TableHead>Fuente</TableHead>
              <TableHead>Broker</TableHead>
              <TableHead>Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No se encontraron leads.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {lead.name}
                    </Link>
                    {lead.phone && (
                      <div className="text-xs text-muted-foreground">{lead.phone}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{lead.project ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell>
                    <LeadFeedbackBadge feedback={lead.feedback} />
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{lead.lead_source ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{lead.broker_name ?? "—"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatDate(lead.contacted_at)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={{ pathname: "/leads", query: { ...params, page: page - 1 } }}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={{ pathname: "/leads", query: { ...params, page: page + 1 } }}
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
