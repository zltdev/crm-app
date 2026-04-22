import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { autoMapColumns } from "@/lib/import/auto-mapping";
import type { BatchMapping, SourceKind } from "@/lib/import/types";
import { BatchWizard } from "../_components/batch-wizard";

export const dynamic = "force-dynamic";

async function getBatchData(batchId: string) {
  const admin = createSupabaseAdminClient();

  const [{ data: batch }, { data: rawRows }] = await Promise.all([
    admin.from("import_batches").select("*").eq("id", batchId).maybeSingle(),
    admin
      .from("import_rows_raw")
      .select("raw_payload")
      .eq("batch_id", batchId)
      .order("row_number", { ascending: true })
      .limit(5),
  ]);

  if (!batch) return null;

  const [
    { data: events },
    { data: expos },
    { data: forms },
    { data: campaigns },
  ] = await Promise.all([
    admin
      .from("events")
      .select("id, name, start_at")
      .order("start_at", { ascending: false })
      .limit(200),
    admin
      .from("expos")
      .select("id, name, start_date")
      .order("start_date", { ascending: false })
      .limit(200),
    admin.from("forms").select("id, name").order("name").limit(200),
    admin.from("campaigns").select("id, name").order("name").limit(200),
  ]);

  return {
    batch,
    sampleRows:
      (rawRows ?? []).map(
        (r) => (r.raw_payload ?? {}) as Record<string, unknown>,
      ) ?? [],
    events: events ?? [],
    expos: expos ?? [],
    forms: forms ?? [],
    campaigns: campaigns ?? [],
  };
}

export default async function BatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getBatchData(id);
  if (!data) notFound();
  const { batch, sampleRows, events, expos, forms, campaigns } = data;

  const headers =
    sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [];
  const existingMapping = batch.column_mapping as BatchMapping | null;

  const initialMapping =
    existingMapping?.columns && existingMapping.columns.length > 0
      ? existingMapping.columns
      : autoMapColumns(headers, (batch.source_kind ?? "agent") as SourceKind);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/importar"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver a importaciones
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {batch.source_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {batch.file_name}
          {batch.sheet_name ? ` · ${batch.sheet_name}` : ""} ·{" "}
          {batch.row_count ?? 0} filas
        </p>
      </div>

      {sampleRows.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            El batch no tiene filas. Subí un archivo con datos.
          </CardContent>
        </Card>
      ) : (
        <BatchWizard
          batchId={batch.id}
          sourceKind={(batch.source_kind ?? "agent") as SourceKind}
          status={batch.status}
          sourceName={batch.source_name}
          sampleRows={sampleRows}
          initialMapping={initialMapping}
          contextIds={{
            event_id: batch.context_event_id,
            expo_id: batch.context_expo_id,
            form_id: batch.context_form_id,
            campaign_id: batch.context_campaign_id,
          }}
          options={{
            events: events.map((e) => ({
              id: e.id,
              label: e.name + (e.start_at ? ` (${e.start_at.slice(0, 10)})` : ""),
            })),
            expos: expos.map((e) => ({
              id: e.id,
              label:
                e.name + (e.start_date ? ` (${e.start_date.slice(0, 10)})` : ""),
            })),
            forms: forms.map((f) => ({ id: f.id, label: f.name })),
            campaigns: campaigns.map((c) => ({ id: c.id, label: c.name })),
          }}
          resultStats={batch.result_stats as unknown}
        />
      )}
    </div>
  );
}
