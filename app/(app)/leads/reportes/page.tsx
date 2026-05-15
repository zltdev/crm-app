import Link from "next/link";
import {
  ArrowLeft,
  Megaphone,
  Bot,
  Users,
  TrendingUp,
  DollarSign,
  Eye,
  MousePointerClick,
  MessageCircle,
  Target,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  BarChartInline,
  type BarChartInlineItem,
} from "@/components/crm/bar-chart-inline";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/crm/leads";
import { MonthFilter } from "@/components/crm/month-filter";
import { ExportPdfButton, type ReportPdfData } from "./export-pdf";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MetaTotals = {
  budget: number;
  impressions: number;
  reach: number;
  clicks: number;
  messages: number;
  campaigns: number;
  cpm: number;
  cpc: number;
  cost_per_message: number;
};
type MetaByMonth = {
  month: string;
  budget: number;
  impressions: number;
  reach: number;
  clicks: number;
  messages: number;
  campaigns: number;
};
type MetaByProject = {
  project: string;
  budget: number;
  impressions: number;
  reach: number;
  clicks: number;
  messages: number;
};
type MetaCampaign = {
  name: string;
  project: string;
  month: string;
  budget: number;
  impressions: number;
  reach: number;
  clicks: number;
  messages: number;
};
type MetaSummary = {
  totals: MetaTotals;
  by_month: MetaByMonth[];
  by_project: MetaByProject[];
  campaigns: MetaCampaign[];
};

type FunnelMonth = {
  month: string;
  inversion: number;
  mensajes_ads: number;
  contactos: number;
  leads_calificados: number;
  derivados: number;
  en_negociacion: number;
  vendidos: number;
  costo_por_lead: number;
  costo_por_derivado: number;
};
type FunnelTotals = {
  inversion: number;
  mensajes_ads: number;
  contactos: number;
  leads_calificados: number;
  derivados: number;
  en_negociacion: number;
  vendidos: number;
};
type FunnelData = { by_month: FunnelMonth[]; totals: FunnelTotals };

type BrokerMonthDetail = {
  month: string;
  total: number;
  derivados: number;
  en_negociacion: number;
  vendidos: number;
  sin_feedback: number;
};
type BrokerDetail = {
  broker: string;
  total: number;
  derivados: number;
  en_negociacion: number;
  vendidos: number;
  con_feedback: number;
  sin_feedback: number;
  rechazados: number;
  efectividad: number;
  by_month: BrokerMonthDetail[];
};
type BrokerMonthlyData = { brokers: BrokerDetail[]; months: string[] };

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

type MatrixRow = {
  project: string;
  month: string;
  leads: number;
  derivados: number;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

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

function fmtMonth(m: string) {
  const [y, mm] = m.split("-");
  return `${MONTH_LABELS[mm] ?? mm} ${y}`;
}

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

function fmtNum(n: number) {
  return n.toLocaleString("es-AR");
}

function fmtPct(n: number, d: number) {
  if (d === 0) return "0%";
  return `${((n / d) * 100).toFixed(1)}%`;
}

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

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

  const rpcArgs = showAll ? {} : { p_months: selectedMonths };

  const [stats, meta, funnel, brokerData, matrix] = await Promise.all([
    rpc<SummaryStats>("leads_summary_stats", rpcArgs),
    rpc<MetaSummary>("meta_campaigns_summary", rpcArgs),
    rpc<FunnelData>("leads_conversion_funnel", rpcArgs),
    rpc<BrokerMonthlyData>("leads_broker_monthly", rpcArgs),
    rpc<MatrixRow[]>("leads_project_month_matrix", rpcArgs),
  ]);

  const ft = funnel.totals;
  const mt = meta.totals;

  const allMonths = [...new Set(matrix.map((r) => r.month))].sort();
  const allProjects = [...new Set(matrix.map((r) => r.project))].sort();
  const matrixMap = new Map<string, MatrixRow>();
  for (const r of matrix) matrixMap.set(`${r.project}::${r.month}`, r);

  const pdfData: ReportPdfData = {
    selectedMonths,
    meta,
    funnel,
    brokerData,
    stats,
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex items-center gap-3">
        <Link
          href="/leads"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Dashboard de Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ads Meta &middot; Agente IA &middot; Derivaci&oacute;n &
            Seguimiento
          </p>
        </div>
        <ExportPdfButton data={pdfData} />
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

      {/* ============================================================ */}
      {/*  SECTION 1: ADS META                                         */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-blue-500/10">
            <Megaphone className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Ads Meta</h2>
            <p className="text-xs text-muted-foreground">
              Rendimiento de campanas de pauta en Meta
            </p>
          </div>
        </div>

        {/* Meta KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 mb-4">
          <KpiCard
            label="Inversi&oacute;n"
            value={fmtMoney(mt.budget)}
            icon={<DollarSign className="h-3.5 w-3.5" />}
            accent="blue"
          />
          <KpiCard
            label="Impresiones"
            value={fmtNum(mt.impressions)}
            icon={<Eye className="h-3.5 w-3.5" />}
          />
          <KpiCard
            label="Alcance"
            value={fmtNum(mt.reach)}
            icon={<Users className="h-3.5 w-3.5" />}
          />
          <KpiCard
            label="Clicks"
            value={fmtNum(mt.clicks)}
            icon={<MousePointerClick className="h-3.5 w-3.5" />}
          />
          <KpiCard
            label="Mensajes"
            value={fmtNum(mt.messages)}
            icon={<MessageCircle className="h-3.5 w-3.5" />}
            accent="green"
          />
          <KpiCard
            label="Costo/Mensaje"
            value={fmtMoney(mt.cost_per_message)}
            icon={<Target className="h-3.5 w-3.5" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Campaigns table */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Campanas</CardTitle>
              <CardDescription>
                {mt.campaigns} campanas activas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campana</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Inversi&oacute;n</TableHead>
                    <TableHead className="text-right">Impresiones</TableHead>
                    <TableHead className="text-right">Alcance</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Mensajes</TableHead>
                    <TableHead className="text-right">CPM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meta.campaigns.map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {c.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.project}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{fmtMonth(c.month)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(c.budget)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(c.impressions)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(c.reach)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(c.clicks)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {fmtNum(c.messages)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {c.impressions > 0
                          ? fmtMoney((c.budget / c.impressions) * 1000)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {meta.campaigns.length > 1 && (
                    <TableRow className="font-semibold bg-muted/30">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(mt.budget)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(mt.impressions)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(mt.reach)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(mt.clicks)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(mt.messages)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {fmtMoney(mt.cpm)}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Spend by project */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Inversi&oacute;n por proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartInline
                items={meta.by_project.map<BarChartInlineItem>((p) => ({
                  label: p.project,
                  value: Math.round(p.budget),
                  hint: `(${fmtNum(p.messages)} msgs)`,
                }))}
                emptyLabel="Sin datos."
              />
            </CardContent>
          </Card>

          {/* Messages by month */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mensajes por mes</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartInline
                items={meta.by_month.map<BarChartInlineItem>((m) => ({
                  label: fmtMonth(m.month),
                  value: m.messages,
                  hint: `(${fmtMoney(m.budget)})`,
                }))}
                emptyLabel="Sin datos."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SECTION 2: AGENTE IA / CONVERSION                           */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-500/10">
            <Bot className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Agente IA &amp; Conversi&oacute;n
            </h2>
            <p className="text-xs text-muted-foreground">
              Embudo de conversi&oacute;n y an&aacute;lisis de ROI
            </p>
          </div>
        </div>

        {/* Funnel KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7 mb-4">
          <KpiCard
            label="Contactos"
            value={fmtNum(ft.contactos)}
            accent="purple"
          />
          <KpiCard
            label="Calificados"
            value={fmtNum(ft.leads_calificados)}
          />
          <KpiCard
            label="Derivados"
            value={fmtNum(ft.derivados)}
            accent="blue"
          />
          <KpiCard
            label="En negociaci&oacute;n"
            value={fmtNum(ft.en_negociacion)}
            accent="amber"
          />
          <KpiCard
            label="Vendidos"
            value={fmtNum(ft.vendidos)}
            accent="green"
          />
          <KpiCard
            label="Costo/Lead"
            value={ft.contactos > 0 ? fmtMoney(ft.inversion / ft.contactos) : "$0"}
          />
          <KpiCard
            label="Costo/Derivado"
            value={ft.derivados > 0 ? fmtMoney(ft.inversion / ft.derivados) : "$0"}
          />
        </div>

        {/* Visual funnel */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Embudo de conversi&oacute;n</CardTitle>
            <CardDescription>
              Msgs Ads &rarr; Contactos (Agente) &rarr; Leads &rarr; Derivados &rarr; Vendidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelVisual
              steps={[
                {
                  label: "Mensajes Ads",
                  value: ft.mensajes_ads,
                  color: "bg-blue-500",
                },
                {
                  label: "Contactos (Agente)",
                  value: ft.contactos,
                  color: "bg-purple-500",
                },
                {
                  label: "Leads",
                  value: ft.leads_calificados,
                  color: "bg-indigo-500",
                },
                {
                  label: "Derivados",
                  value: ft.derivados,
                  color: "bg-cyan-500",
                },
                {
                  label: "En negociación",
                  value: ft.en_negociacion,
                  color: "bg-amber-500",
                },
                {
                  label: "Vendidos",
                  value: ft.vendidos,
                  color: "bg-green-500",
                },
              ]}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Conversion table by month */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Gastos vs Leads por mes
              </CardTitle>
              <CardDescription>
                Inversi&oacute;n publicitaria vs leads generados y derivados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">Inversi&oacute;n</TableHead>
                    <TableHead className="text-right">Msgs Ads</TableHead>
                    <TableHead className="text-right">Contactos</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Derivados</TableHead>
                    <TableHead className="text-right">Negociaci&oacute;n</TableHead>
                    <TableHead className="text-right">Vendidos</TableHead>
                    <TableHead className="text-right">$/Lead</TableHead>
                    <TableHead className="text-right">$/Derivado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funnel.by_month.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">
                        {fmtMonth(row.month)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(row.inversion)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(row.mensajes_ads)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {fmtNum(row.contactos)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(row.leads_calificados)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-cyan-600">
                        {fmtNum(row.derivados)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">
                        {fmtNum(row.en_negociacion)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium text-green-600">
                        {fmtNum(row.vendidos)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.costo_por_lead > 0
                          ? fmtMoney(row.costo_por_lead)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.costo_por_derivado > 0
                          ? fmtMoney(row.costo_por_derivado)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {funnel.by_month.length > 1 && (
                    <TableRow className="font-semibold bg-muted/30">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtMoney(ft.inversion)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(ft.mensajes_ads)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(ft.contactos)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtNum(ft.leads_calificados)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-cyan-600">
                        {fmtNum(ft.derivados)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">
                        {fmtNum(ft.en_negociacion)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-green-600">
                        {fmtNum(ft.vendidos)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {ft.contactos > 0
                          ? fmtMoney(ft.inversion / ft.contactos)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {ft.derivados > 0
                          ? fmtMoney(ft.inversion / ft.derivados)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Leads by status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leads por estado</CardTitle>
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

          {/* Leads by project */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leads por proyecto</CardTitle>
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
        </div>

        {/* Project × Month matrix */}
        {allMonths.length > 0 && (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Leads por proyecto y mes
              </CardTitle>
              <CardDescription>
                Total / derivados por celda
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proyecto</TableHead>
                    {allMonths.map((m) => (
                      <TableHead key={m} className="text-center whitespace-nowrap">
                        {fmtMonth(m)}
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
      </section>

      {/* ============================================================ */}
      {/*  SECTION 3: DERIVACION & SEGUIMIENTO                         */}
      {/* ============================================================ */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">
              Derivaci&oacute;n &amp; Seguimiento
            </h2>
            <p className="text-xs text-muted-foreground">
              Performance por inmobiliaria y seguimiento mensual
            </p>
          </div>
        </div>

        {/* Broker summary table */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Resumen por inmobiliaria
            </CardTitle>
            <CardDescription>
              Leads asignados y resultados de cada broker
            </CardDescription>
          </CardHeader>
          <CardContent>
            {brokerData.brokers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sin derivaciones en el per&iacute;odo seleccionado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inmobiliaria</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Derivados</TableHead>
                    <TableHead className="text-right">Negociaci&oacute;n</TableHead>
                    <TableHead className="text-right">Vendidos</TableHead>
                    <TableHead className="text-right">Rechazados</TableHead>
                    <TableHead className="text-right">Sin feedback</TableHead>
                    <TableHead className="text-right">Con feedback</TableHead>
                    <TableHead className="text-right">% Efectividad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokerData.brokers.map((b) => (
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
                        {b.con_feedback}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <Badge
                          variant={
                            b.efectividad >= 20
                              ? "success"
                              : b.efectividad >= 10
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {b.efectividad}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {brokerData.brokers.length > 1 && (
                    <TableRow className="font-semibold bg-muted/30">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brokerData.brokers.reduce((a, b) => a + b.total, 0)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brokerData.brokers.reduce(
                          (a, b) => a + b.derivados,
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600">
                        {brokerData.brokers.reduce(
                          (a, b) => a + b.en_negociacion,
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-green-600">
                        {brokerData.brokers.reduce(
                          (a, b) => a + b.vendidos,
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-red-500">
                        {brokerData.brokers.reduce(
                          (a, b) => a + b.rechazados,
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {brokerData.brokers.reduce(
                          (a, b) => a + b.sin_feedback,
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brokerData.brokers.reduce(
                          (a, b) => a + b.con_feedback,
                          0,
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(() => {
                          const td = brokerData.brokers.reduce(
                            (a, b) => a + b.derivados,
                            0,
                          );
                          const te = brokerData.brokers.reduce(
                            (a, b) => a + b.vendidos + b.en_negociacion,
                            0,
                          );
                          return (
                            <Badge variant="outline">
                              {td > 0
                                ? ((te / td) * 100).toFixed(1)
                                : "0"}
                              %
                            </Badge>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Broker × Month derivations matrix */}
        {brokerData.months.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Derivaciones por inmobiliaria y mes
              </CardTitle>
              <CardDescription>
                Leads derivados por broker en cada mes
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Inmobiliaria</TableHead>
                    {brokerData.months.map((m) => (
                      <TableHead key={m} className="text-center whitespace-nowrap">
                        {fmtMonth(m)}
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokerData.brokers.map((b) => {
                    const monthMap = new Map(
                      b.by_month.map((bm) => [bm.month, bm]),
                    );
                    return (
                      <TableRow key={b.broker}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {b.broker}
                        </TableCell>
                        {brokerData.months.map((m) => {
                          const bm = monthMap.get(m);
                          return (
                            <TableCell
                              key={m}
                              className="text-center tabular-nums text-sm"
                            >
                              {bm && bm.total > 0 ? (
                                <div className="flex flex-col items-center">
                                  <span>{bm.total}</span>
                                  {bm.sin_feedback > 0 && (() => {
                                    const ratio = bm.sin_feedback / bm.total;
                                    // Hue: 120 (green) → 0 (red) as ratio grows
                                    const hue = Math.round(120 * (1 - ratio));
                                    return (
                                      <span
                                        className="text-[10px] font-medium"
                                        style={{ color: `hsl(${hue}, 75%, 40%)` }}
                                      >
                                        {bm.sin_feedback} s/f
                                      </span>
                                    );
                                  })()}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center tabular-nums font-semibold">
                          {b.total}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Broker bar charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leads por inmobiliaria</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartInline
                items={brokerData.brokers.map<BarChartInlineItem>((b) => ({
                  label: b.broker,
                  value: b.total,
                  hint: `(${b.derivados} deriv.)`,
                }))}
                emptyLabel="Sin datos."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Feedback de leads</CardTitle>
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

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leads por fuente</CardTitle>
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
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Leads por mes</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChartInline
                items={stats.by_month.map<BarChartInlineItem>((m) => ({
                  label: fmtMonth(m.month),
                  value: m.count,
                }))}
                emptyLabel="Sin datos."
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: "blue" | "green" | "amber" | "purple" | "red";
}) {
  const accentClasses: Record<string, string> = {
    blue: "text-blue-600",
    green: "text-green-600",
    amber: "text-amber-600",
    purple: "text-purple-600",
    red: "text-red-600",
  };
  const colorClass = accent ? accentClasses[accent] : "";
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {icon}
          <span className="uppercase tracking-wide">{label}</span>
        </div>
        <div className={`text-xl font-semibold tabular-nums ${colorClass}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

function FunnelVisual({
  steps,
}: {
  steps: Array<{ label: string; value: number; color: string }>;
}) {
  const maxVal = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="flex flex-col gap-3">
      {steps.map((step, i) => {
        const pct = Math.max(8, Math.round((step.value / maxVal) * 100));
        const convRate =
          i > 0 && steps[i - 1].value > 0
            ? ((step.value / steps[i - 1].value) * 100).toFixed(1)
            : null;
        return (
          <div key={step.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{step.label}</span>
                {convRate && (
                  <span className="text-xs text-muted-foreground">
                    ({convRate}% del anterior)
                  </span>
                )}
              </div>
              <span className="tabular-nums font-semibold">
                {step.value.toLocaleString("es-AR")}
              </span>
            </div>
            <div className="h-6 w-full overflow-hidden rounded-md bg-muted">
              <div
                className={`h-full rounded-md ${step.color} transition-all flex items-center justify-end pr-2`}
                style={{ width: `${pct}%` }}
              >
                {pct > 15 && (
                  <span className="text-[10px] font-medium text-white">
                    {step.value.toLocaleString("es-AR")}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
