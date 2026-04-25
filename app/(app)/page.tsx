import Link from "next/link";
import {
  ArrowRight,
  Users,
  CalendarDays,
  Upload,
  Sparkles,
  Megaphone,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buttonVariants } from "@/components/ui/button";
import { SourceBadge } from "@/components/crm/source-badge";
import { StatusBadge } from "@/components/crm/status-badge";
import {
  BarChartInline,
  type BarChartInlineItem,
} from "@/components/crm/bar-chart-inline";
import {
  DELIVERY_STATUS_LABELS,
  type DeliveryStatus,
} from "@/lib/crm/deliveries";

export const dynamic = "force-dynamic";

type DashboardStats = {
  contacts_total: number;
  contacts_new_7d: number;
  touchpoints_total: number;
  import_batches_total: number;
  campaigns_active: number;
  contacts_by_week: Array<{ week: string; count: number }>;
  touchpoints_by_type: Array<{ type: string; count: number }>;
  top_campaigns: Array<{
    id: string;
    name: string;
    count: number;
    status: string;
  }>;
  deliveries_by_status: Array<{ status: string; count: number }>;
};

async function getStats(): Promise<{
  stats: DashboardStats | null;
  error: string | null;
}> {
  const admin = createSupabaseAdminClient();
  try {
    // dashboard_stats es una RPC custom. La llamamos preservando `this`
    // (sin desreferenciar admin.rpc en una variable, que rompe `this`).
    const result = await (
      admin as unknown as {
        rpc: (
          name: string,
          args?: unknown,
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc("dashboard_stats");
    if (result.error) return { stats: null, error: result.error.message };
    return { stats: result.data as DashboardStats, error: null };
  } catch (e) {
    return { stats: null, error: e instanceof Error ? e.message : String(e) };
  }
}

function formatWeek(iso: string): string {
  const d = new Date(iso);
  return `sem ${d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  })}`;
}

export default async function DashboardPage() {
  const { stats, error } = await getStats();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visión general de la base unificada.
          </p>
        </div>
        <Link
          href="/contactos/nuevo"
          className={buttonVariants({ size: "sm" })}
        >
          Nuevo contacto <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Error cargando stats: {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<Users className="h-4 w-4 text-primary" />}
          label="Contactos"
          value={stats?.contacts_total ?? 0}
          hint="Base consolidada."
        />
        <KpiCard
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          label="Nuevos 7d"
          value={stats?.contacts_new_7d ?? 0}
          hint="Últimos 7 días."
        />
        <KpiCard
          icon={<CalendarDays className="h-4 w-4 text-primary" />}
          label="Touchpoints"
          value={stats?.touchpoints_total ?? 0}
          hint="Historial completo."
        />
        <KpiCard
          icon={<Megaphone className="h-4 w-4 text-primary" />}
          label="Campañas activas"
          value={stats?.campaigns_active ?? 0}
          hint="Status = active."
        />
        <KpiCard
          icon={<Upload className="h-4 w-4 text-primary" />}
          label="Importaciones"
          value={stats?.import_batches_total ?? 0}
          hint="Archivos cargados."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contactos nuevos por semana</CardTitle>
            <CardDescription>Últimas 8 semanas.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartInline
              items={(stats?.contacts_by_week ?? []).map<BarChartInlineItem>(
                (w) => ({
                  label: formatWeek(w.week),
                  value: w.count,
                }),
              )}
              emptyLabel="Todavía no hay contactos nuevos en las últimas 8 semanas."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Touchpoints por tipo</CardTitle>
            <CardDescription>Todos los registros.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {(stats?.touchpoints_by_type ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Todavía no hay touchpoints.
                </p>
              ) : (
                (stats?.touchpoints_by_type ?? []).map((t) => (
                  <div key={t.type} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <SourceBadge type={t.type} />
                      <span className="tabular-nums text-muted-foreground">
                        {t.count.toLocaleString("es-AR")}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${percentOf(
                            t.count,
                            stats?.touchpoints_by_type ?? [],
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top campañas por deliveries</CardTitle>
            <CardDescription>Las 5 con más envíos.</CardDescription>
          </CardHeader>
          <CardContent>
            {(stats?.top_campaigns ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay campañas con deliveries aún.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {(stats?.top_campaigns ?? []).map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-col">
                      <Link
                        href={`/campanas/${c.id}`}
                        className="truncate font-medium hover:text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                      <div>
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                    <span className="tabular-nums text-muted-foreground">
                      {c.count.toLocaleString("es-AR")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deliveries por estado</CardTitle>
            <CardDescription>
              Pipeline de envíos de todas las campañas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BarChartInline
              items={(stats?.deliveries_by_status ?? [])
                .sort((a, b) => b.count - a.count)
                .map<BarChartInlineItem>((d) => ({
                  label:
                    DELIVERY_STATUS_LABELS[d.status as DeliveryStatus] ??
                    d.status,
                  value: d.count,
                }))}
              emptyLabel="Sin deliveries aún."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="text-3xl font-semibold tabular-nums">
          {value.toLocaleString("es-AR")}
        </div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function percentOf(
  n: number,
  items: Array<{ count: number }>,
): number {
  const max = Math.max(...items.map((i) => i.count), 1);
  return Math.max(2, Math.round((n / max) * 100));
}
