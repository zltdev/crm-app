import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  BarChartInline,
  type BarChartInlineItem,
} from "@/components/crm/bar-chart-inline";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/crm/leads";
import { MonthFilter } from "@/components/crm/month-filter";

export const dynamic = "force-dynamic";

type SummaryStats = {
  total: number;
  nuevos_7d: number;
  falta_derivar: number;
  derivados: number;
  vendidos: number;
  en_negociacion: number;
  by_status: Array<{ status: string; count: number }>;
  by_project: Array<{ project: string; count: number }>;
  by_month: Array<{ month: string; count: number }>;
  by_source: Array<{ source: string; count: number }>;
  by_feedback: Array<{ feedback: string; count: number }>;
};

type FunnelRow = {
  month: string;
  leads: number;
  calificados: number;
  vendidos: number;
  en_negociacion: number;
  rechazados: number;
};

type MatrixRow = {
  project: string;
  month: string;
  leads: number;
  derivados: number;
};

type BrokerRow = {
  broker: string;
  total: number;
  derivados: number;
  en_negociacion: number;
  vendidos: number;
  rechazados: number;
  sin_feedback: number;
};

async function rpc<T>(
  name: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const admin = createSupabaseAdminClient();
  const result = await (
    admin as unknown as {
      rpc: (
        name: string,
        args?: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: { message: string } | null }>;
    }
  ).rpc(name, args);
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export default async function LeadsReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const monthsParam =
    typeof params.months === "string" ? params.months : undefined;

  const availableMonths = await rpc<string[]>("leads_available_months");

  const showAll = monthsParam === "all";
  let selectedMonths: string[];

  if (showAll) {
    selectedMonths = availableMonths;
  } else if (monthsParam) {
    selectedMonths = monthsParam.split(",").filter((m) => m.trim());
  } else {
    selectedMonths = availableMonths.filter((m) => m.startsWith("2026"));
  }

  const rpcArgs =
    showAll ? {} : { p_months: selectedMonths };

  const [stats, funnel, matrix, brokers] = await Promise.all([
    rpc<SummaryStats>("leads_summary_stats", rpcArgs),
    rpc<FunnelRow[]>("leads_funnel_monthly", rpcArgs),
    rpc<MatrixRow[]>("leads_project_month_matrix", rpcArgs),
    rpc<BrokerRow[]>("leads_broker_stats", rpcArgs),
  ]);

  const allMonths = [...new Set(matrix.map((r) => r.month))].sort();
  const allProjects = [...new Set(matrix.map((r) => r.project))].sort();
  const matrixMap = new Map<string, MatrixRow>();
  for (const r of matrix) {
    matrixMap.set(`${r.project}::${r.month}`, r);
  }

  const totalBrokerLeads = brokers.reduce((a, b) => a + b.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-3">
        <Link
          href="/leads"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Reportes de Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            KPIs, embudo de conversión y distribución por proyecto e
            inmobiliaria.
          </p>
        </div>
      </header>

      {/* Month filter */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <MonthFilter
            availableMonths={availableMonths}
            selectedMonths={selectedMonths}
            showAll={showAll}
          />
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total leads" value={stats.total} />
        <KpiCard label="Nuevos 7d" value={stats.nuevos_7d} />
        <KpiCard
          label="Falta derivar"
          value={stats.falta_derivar}
          accent="warning"
        />
        <KpiCard
          label="Derivados"
          value={stats.derivados}
          accent="success"
        />
        <KpiCard
          label="En negociación"
          value={stats.en_negociacion}
          accent="primary"
        />
        <KpiCard label="Vendidos" value={stats.vendidos} accent="success" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartInline
              items={stats.by_status.map<BarChartInlineItem>((s) => ({
                label:
                  LEAD_STATUS_LABELS[s.status as LeadStatus] ?? s.status,
                value: s.count,
              }))}
              emptyLabel="Sin datos."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads por proyecto</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartInline
              items={stats.by_project.map<BarChartInlineItem>((p) => ({
                label: p.project,
                value: p.count,
              }))}
              emptyLabel="Sin datos."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads por fuente</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartInline
              items={stats.by_source
                .slice(0, 10)
                .map<BarChartInlineItem>((s) => ({
                  label: s.source,
                  value: s.count,
                }))}
              emptyLabel="Sin datos."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leads por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartInline
              items={stats.by_month.map<BarChartInlineItem>((m) => ({
                label: m.month,
                value: m.count,
              }))}
              emptyLabel="Sin datos."
            />
          </CardContent>
        </Card>
      </div>

      {/* Broker / Inmobiliaria report */}
      <Card>
        <CardHeader>
          <CardTitle>Derivaciones por inmobiliaria</CardTitle>
          <CardDescription>
            Leads asignados a cada broker/inmobiliaria y su resultado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brokers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin derivaciones en el período seleccionado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inmobiliaria</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Derivados</TableHead>
                  <TableHead className="text-right">
                    En negociación
                  </TableHead>
                  <TableHead className="text-right">Vendidos</TableHead>
                  <TableHead className="text-right">Rechazados</TableHead>
                  <TableHead className="text-right">
                    Sin feedback
                  </TableHead>
                  <TableHead className="text-right">% Efectividad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokers.map((b) => {
                  const efectividad =
                    b.derivados > 0
                      ? (
                          ((b.vendidos + b.en_negociacion) / b.derivados) *
                          100
                        ).toFixed(1)
                      : "0.0";
                  return (
                    <TableRow key={b.broker}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {b.broker}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {b.total}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {b.derivados}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">
                        {b.en_negociacion}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-green-600">
                        {b.vendidos}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-500">
                        {b.rechazados}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {b.sin_feedback}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {efectividad}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {brokers.length > 1 && (
                  <TableRow className="font-semibold bg-muted/30">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {totalBrokerLeads}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {brokers.reduce((a, b) => a + b.derivados, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">
                      {brokers.reduce((a, b) => a + b.en_negociacion, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-green-600">
                      {brokers.reduce((a, b) => a + b.vendidos, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-red-500">
                      {brokers.reduce((a, b) => a + b.rechazados, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {brokers.reduce((a, b) => a + b.sin_feedback, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(() => {
                        const totalDeriv = brokers.reduce(
                          (a, b) => a + b.derivados,
                          0,
                        );
                        const totalEfect = brokers.reduce(
                          (a, b) => a + b.vendidos + b.en_negociacion,
                          0,
                        );
                        return totalDeriv > 0
                          ? ((totalEfect / totalDeriv) * 100).toFixed(1)
                          : "0.0";
                      })()}
                      %
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Broker bar chart */}
      {brokers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Leads por inmobiliaria</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartInline
                items={brokers.map<BarChartInlineItem>((b) => ({
                  label: b.broker,
                  value: b.total,
                  hint: `(${b.derivados} deriv.)`,
                }))}
                emptyLabel="Sin datos."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Leads por feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartInline
                items={stats.by_feedback.map<BarChartInlineItem>((f) => ({
                  label: f.feedback,
                  value: f.count,
                }))}
                emptyLabel="Sin datos."
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Conversion funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Embudo de conversión mensual</CardTitle>
          <CardDescription>
            Leads → Calificados (derivados) → Vendidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {funnel.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin datos en el período seleccionado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mes</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Calificados</TableHead>
                  <TableHead className="text-right">% Conv.</TableHead>
                  <TableHead className="text-right">
                    En negociación
                  </TableHead>
                  <TableHead className="text-right">Vendidos</TableHead>
                  <TableHead className="text-right">% Venta</TableHead>
                  <TableHead className="text-right">Rechazados</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funnel.map((row) => {
                  const convPct =
                    row.leads > 0
                      ? ((row.calificados / row.leads) * 100).toFixed(1)
                      : "0.0";
                  const ventaPct =
                    row.calificados > 0
                      ? ((row.vendidos / row.calificados) * 100).toFixed(1)
                      : "0.0";
                  return (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">
                        {row.month}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.leads}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.calificados}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {convPct}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.en_negociacion}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-green-600">
                        {row.vendidos}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {ventaPct}%
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-500">
                        {row.rechazados}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {funnel.length > 1 && (
                  <TableRow className="font-semibold bg-muted/30">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {funnel.reduce((a, r) => a + r.leads, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {funnel.reduce((a, r) => a + r.calificados, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {(
                        (funnel.reduce((a, r) => a + r.calificados, 0) /
                          Math.max(
                            1,
                            funnel.reduce((a, r) => a + r.leads, 0),
                          )) *
                        100
                      ).toFixed(1)}
                      %
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {funnel.reduce((a, r) => a + r.en_negociacion, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-green-600">
                      {funnel.reduce((a, r) => a + r.vendidos, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {(
                        (funnel.reduce((a, r) => a + r.vendidos, 0) /
                          Math.max(
                            1,
                            funnel.reduce((a, r) => a + r.calificados, 0),
                          )) *
                        100
                      ).toFixed(1)}
                      %
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-red-500">
                      {funnel.reduce((a, r) => a + r.rechazados, 0)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Project × Month matrix */}
      {allMonths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leads por proyecto y mes</CardTitle>
            <CardDescription>
              Leads totales / derivados por celda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proyecto</TableHead>
                  {allMonths.map((m) => (
                    <TableHead key={m} className="text-center">
                      {m}
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProjects.map((proj) => {
                  let totalLeads = 0;
                  let totalDeriv = 0;
                  return (
                    <TableRow key={proj}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {proj}
                      </TableCell>
                      {allMonths.map((m) => {
                        const cell = matrixMap.get(`${proj}::${m}`);
                        const leads = cell?.leads ?? 0;
                        const deriv = cell?.derivados ?? 0;
                        totalLeads += leads;
                        totalDeriv += deriv;
                        return (
                          <TableCell
                            key={m}
                            className="text-center tabular-nums text-xs"
                          >
                            {leads > 0 ? (
                              <>
                                {leads}
                                <span className="text-muted-foreground">
                                  /{deriv}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center tabular-nums text-xs font-semibold">
                        {totalLeads}
                        <span className="text-muted-foreground">
                          /{totalDeriv}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "warning" | "success" | "primary";
}) {
  const colorClass =
    accent === "warning"
      ? "text-amber-600"
      : accent === "success"
        ? "text-green-600"
        : accent === "primary"
          ? "text-primary"
          : "";
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className={`text-2xl font-semibold tabular-nums ${colorClass}`}>
          {value.toLocaleString("es-AR")}
        </div>
      </CardContent>
    </Card>
  );
}
