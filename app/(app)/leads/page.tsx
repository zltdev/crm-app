import Link from "next/link";
import {
  Plus,
  Search,
  BarChart3,
  Phone,
  Mail,
  Calendar,
  Filter,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import {
  LeadStatusBadge,
  LeadFeedbackBadge,
} from "@/components/crm/lead-status-badge";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_PROJECTS,
} from "@/lib/crm/leads";
import type { LeadRow } from "@/lib/crm/leads-db";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = {
  q?: string;
  page?: string;
  status?: string;
  project?: string;
  month?: string;
  source?: string;
  broker?: string;
  feedback?: string;
};

type LeadListRow = Pick<
  LeadRow,
  | "id"
  | "name"
  | "phone"
  | "email"
  | "locality"
  | "project"
  | "status"
  | "lead_source"
  | "feedback"
  | "contacted_at"
  | "broker_name"
  | "month"
  | "contact_medium"
  | "derived_at"
  | "interest"
  | "is_duplicate"
  | "progress"
  | "followup_3d"
>;

function fromLeads(admin: ReturnType<typeof createSupabaseAdminClient>) {
  return (
    admin as unknown as {
      from: (
        t: string,
      ) => ReturnType<ReturnType<typeof createSupabaseAdminClient>["from"]>;
    }
  ).from("leads");
}

async function getLeads(params: SearchParams) {
  const pageNum = Math.max(1, Number(params.page ?? 1));
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const admin = createSupabaseAdminClient();
  let query = fromLeads(admin)
    .select(
      "id, name, phone, email, locality, project, status, lead_source, feedback, contacted_at, broker_name, month, contact_medium, derived_at, interest, is_duplicate, progress, followup_3d",
      { count: "exact" },
    )
    .order("contacted_at", { ascending: false })
    .range(from, to);

  if (params.q?.trim()) {
    const like = `%${params.q.trim()}%`;
    query = query.or(
      `name.ilike.${like},phone.ilike.${like},email.ilike.${like},request_summary.ilike.${like},locality.ilike.${like}`,
    );
  }
  if (params.status) query = query.eq("status", params.status);
  if (params.project) query = query.eq("project", params.project);
  if (params.month) query = query.eq("month", params.month);
  if (params.source) query = query.eq("lead_source", params.source);
  if (params.broker) query = query.eq("broker_name", params.broker);
  if (params.feedback) {
    if (params.feedback === "sin_feedback") {
      query = query.or("feedback.is.null,feedback.eq.Sin feedback,feedback.eq.");
    } else {
      query = query.eq("feedback", params.feedback);
    }
  }

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
  const [monthsRes, sourcesRes, brokersRes, feedbacksRes] = await Promise.all([
    fromLeads(admin)
      .select("month")
      .not("month", "is", null)
      .order("month", { ascending: false })
      .limit(100),
    fromLeads(admin)
      .select("lead_source")
      .not("lead_source", "is", null)
      .limit(500),
    fromLeads(admin)
      .select("broker_name")
      .not("broker_name", "is", null)
      .limit(500),
    fromLeads(admin)
      .select("feedback")
      .not("feedback", "is", null)
      .limit(500),
  ]);

  const uniqueMonths = [
    ...new Set(
      ((monthsRes.data ?? []) as Array<{ month: string }>).map(
        (r) => r.month,
      ),
    ),
  ];
  const uniqueSources = [
    ...new Set(
      ((sourcesRes.data ?? []) as Array<{ lead_source: string }>).map(
        (r) => r.lead_source,
      ),
    ),
  ].sort();
  const uniqueBrokers = [
    ...new Set(
      ((brokersRes.data ?? []) as Array<{ broker_name: string }>).map(
        (r) => r.broker_name,
      ),
    ),
  ].sort();
  const uniqueFeedbacks = [
    ...new Set(
      ((feedbacksRes.data ?? []) as Array<{ feedback: string }>)
        .map((r) => r.feedback)
        .filter((f) => f && f !== "Sin feedback"),
    ),
  ].sort();

  return {
    months: uniqueMonths,
    sources: uniqueSources,
    brokers: uniqueBrokers,
    feedbacks: uniqueFeedbacks,
  };
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene",
  "02": "Feb",
  "03": "Mar",
  "04": "Abr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dic",
};

function fmtMonth(m: string | null) {
  if (!m) return "—";
  const [y, mm] = m.split("-");
  return `${MONTH_LABELS[mm] ?? mm} ${y}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [{ rows, total, page, error }, filters] = await Promise.all([
    getLeads(params),
    getFilterOptions(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    params.q ||
    params.status ||
    params.project ||
    params.month ||
    params.source ||
    params.broker ||
    params.feedback;

  const activeFilterCount = [
    params.status,
    params.project,
    params.month,
    params.source,
    params.broker,
    params.feedback,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pipeline de ventas &middot;{" "}
            {total.toLocaleString("es-AR")} lead
            {total === 1 ? "" : "s"}
            {hasFilters && (
              <span className="text-primary"> (filtrado)</span>
            )}
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

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <form method="get" className="flex flex-col gap-3">
            {/* Search + Quick filters row */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-4 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Search className="h-3 w-3" /> Buscar
                </label>
                <Input
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="Nombre, tel, email, localidad..."
                  className="h-9"
                />
              </div>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Estado
                </label>
                <Select
                  name="status"
                  defaultValue={params.status ?? ""}
                  className="h-9"
                >
                  <option value="">Todos</option>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Proyecto
                </label>
                <Select
                  name="project"
                  defaultValue={params.project ?? ""}
                  className="h-9"
                >
                  <option value="">Todos</option>
                  {LEAD_PROJECTS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Mes
                </label>
                <Select
                  name="month"
                  defaultValue={params.month ?? ""}
                  className="h-9"
                >
                  <option value="">Todos</option>
                  {filters.months.map((m) => (
                    <option key={m} value={m}>
                      {fmtMonth(m)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Broker
                </label>
                <Select
                  name="broker"
                  defaultValue={params.broker ?? ""}
                  className="h-9"
                >
                  <option value="">Todos</option>
                  {filters.brokers.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Second row: source + feedback + actions */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Fuente
                </label>
                <Select
                  name="source"
                  defaultValue={params.source ?? ""}
                  className="h-9"
                >
                  <option value="">Todas</option>
                  {filters.sources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Feedback
                </label>
                <Select
                  name="feedback"
                  defaultValue={params.feedback ?? ""}
                  className="h-9"
                >
                  <option value="">Todos</option>
                  <option value="sin_feedback">Sin feedback</option>
                  {filters.feedbacks.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-8 flex items-end gap-2">
                <button
                  type="submit"
                  className={buttonVariants({
                    variant: "secondary",
                    size: "sm",
                  })}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filtrar
                  {activeFilterCount > 0 && (
                    <Badge variant="default" className="ml-1 px-1.5 py-0">
                      {activeFilterCount}
                    </Badge>
                  )}
                </button>
                {hasFilters && (
                  <Link
                    href="/leads"
                    className={buttonVariants({
                      variant: "ghost",
                      size: "sm",
                    })}
                  >
                    <X className="h-3.5 w-3.5" /> Limpiar
                  </Link>
                )}
              </div>
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

      {/* Leads table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Nombre</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Feedback</TableHead>
                <TableHead>Broker</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Medio</TableHead>
                <TableHead>Localidad</TableHead>
                <TableHead>Mes</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Derivaci&oacute;n</TableHead>
                <TableHead>Seguimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="text-center text-muted-foreground py-12"
                  >
                    No se encontraron leads.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className={lead.is_duplicate ? "opacity-60" : ""}
                  >
                    {/* Name + contact info */}
                    <TableCell>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {lead.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5">
                        {lead.phone && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <Phone className="h-2.5 w-2.5" />
                            {lead.phone}
                          </span>
                        )}
                        {lead.email && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <Mail className="h-2.5 w-2.5" />
                            {lead.email.length > 20
                              ? lead.email.slice(0, 20) + "..."
                              : lead.email}
                          </span>
                        )}
                      </div>
                      {lead.is_duplicate && (
                        <Badge
                          variant="warning"
                          className="text-[10px] px-1.5 py-0 mt-0.5"
                        >
                          Duplicado
                        </Badge>
                      )}
                    </TableCell>

                    {/* Project */}
                    <TableCell>
                      {lead.project ? (
                        <Badge variant="outline" className="text-xs">
                          {lead.project}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>

                    {/* Feedback */}
                    <TableCell>
                      <LeadFeedbackBadge feedback={lead.feedback} />
                    </TableCell>

                    {/* Broker */}
                    <TableCell>
                      <span className="text-xs whitespace-nowrap">
                        {lead.broker_name ?? "—"}
                      </span>
                    </TableCell>

                    {/* Source */}
                    <TableCell>
                      <span className="text-xs">
                        {lead.lead_source ?? "—"}
                      </span>
                    </TableCell>

                    {/* Medium */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {lead.contact_medium ?? "—"}
                      </span>
                    </TableCell>

                    {/* Locality */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {lead.locality ?? "—"}
                      </span>
                    </TableCell>

                    {/* Month */}
                    <TableCell>
                      <span className="text-xs tabular-nums">
                        {fmtMonth(lead.month)}
                      </span>
                    </TableCell>

                    {/* Contacted at */}
                    <TableCell>
                      <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        <Calendar className="inline h-3 w-3 mr-0.5" />
                        {formatDate(lead.contacted_at)}
                      </span>
                    </TableCell>

                    {/* Derived at */}
                    <TableCell>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {lead.derived_at
                          ? formatDate(lead.derived_at)
                          : "—"}
                      </span>
                    </TableCell>

                    {/* Followup */}
                    <TableCell>
                      {lead.followup_3d ? (
                        <Badge
                          variant={
                            lead.followup_3d.toLowerCase().includes("si") ||
                            lead.followup_3d.toLowerCase().includes("sí")
                              ? "success"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {lead.followup_3d}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            P&aacute;gina {page} de {totalPages} &middot;{" "}
            {total.toLocaleString("es-AR")} leads
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={{
                  pathname: "/leads",
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
                  pathname: "/leads",
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
