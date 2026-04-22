import Link from "next/link";
import { ArrowRight, Users, CalendarDays, Upload, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function getKpis() {
  const supabase = createSupabaseAdminClient();

  const sinceWeek = new Date();
  sinceWeek.setDate(sinceWeek.getDate() - 7);

  const [contacts, newThisWeek, touchpoints, importBatches] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceWeek.toISOString()),
    supabase.from("contact_touchpoints").select("*", { count: "exact", head: true }),
    supabase.from("import_batches").select("*", { count: "exact", head: true }),
  ]);

  return {
    contacts: contacts.count ?? 0,
    newThisWeek: newThisWeek.count ?? 0,
    touchpoints: touchpoints.count ?? 0,
    importBatches: importBatches.count ?? 0,
    error:
      contacts.error?.message ??
      newThisWeek.error?.message ??
      touchpoints.error?.message ??
      importBatches.error?.message ??
      null,
  };
}

export default async function DashboardPage() {
  const kpis = await getKpis();

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visión general de la base unificada de contactos.
          </p>
        </div>
        <Link
          href="/contactos/nuevo"
          className={buttonVariants({ size: "sm" })}
        >
          Nuevo contacto <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      {kpis.error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">
            Error cargando KPIs: {kpis.error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Users className="h-4 w-4 text-primary" />}
          label="Contactos unificados"
          value={kpis.contacts.toLocaleString("es-AR")}
          hint="Base consolidada."
        />
        <KpiCard
          icon={<Sparkles className="h-4 w-4 text-primary" />}
          label="Nuevos esta semana"
          value={kpis.newThisWeek.toLocaleString("es-AR")}
          hint="Últimos 7 días."
        />
        <KpiCard
          icon={<CalendarDays className="h-4 w-4 text-primary" />}
          label="Touchpoints registrados"
          value={kpis.touchpoints.toLocaleString("es-AR")}
          hint="Historial completo de interacciones."
        />
        <KpiCard
          icon={<Upload className="h-4 w-4 text-primary" />}
          label="Importaciones"
          value={kpis.importBatches.toLocaleString("es-AR")}
          hint="Archivos cargados al pipeline."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Próximos pasos</CardTitle>
          <CardDescription>
            Esto es V1. Las siguientes iteraciones agregan importación,
            campañas, eventos, segmentos y scoring.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs text-primary">
              1
            </span>
            <div>
              Empezá cargando contactos en{" "}
              <Link href="/contactos" className="text-primary underline">
                /contactos
              </Link>{" "}
              — la entidad central del modelo.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs">
              2
            </span>
            <div>
              El pipeline de importación (Excel → staging → dedupe) se habilita
              en la siguiente iteración.
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs">
              3
            </span>
            <div>
              Después: campañas, eventos, expos, scoring y segmentación.
            </div>
          </div>
        </CardContent>
      </Card>
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
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1.5 p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}
