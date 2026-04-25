"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Json } from "@/lib/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  buildSheetPreview,
  parseWorkbook,
  sheetToObjects,
} from "@/lib/import/parser";
import { commitBatch } from "@/lib/import/commit";
import type {
  BatchMapping,
  ColumnMapping,
  RowFilter,
  SourceKind,
} from "@/lib/import/types";
import { SOURCE_KINDS } from "@/lib/import/types";

export type UploadState = {
  error?: string;
};

export async function uploadBatchAction(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const file = formData.get("file") as File | null;
  const kind = String(formData.get("source_kind") ?? "");
  const sourceName = String(formData.get("source_name") ?? "").trim();
  const sheetOverride = String(formData.get("sheet_name") ?? "").trim();

  if (!file || file.size === 0) return { error: "Subí un archivo." };
  if (!SOURCE_KINDS.includes(kind as SourceKind)) {
    return { error: "Tipo de fuente inválido." };
  }
  if (!sourceName) return { error: "Ponele un nombre a esta importación." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  let wb;
  try {
    wb = parseWorkbook(bytes);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `No pude leer el archivo: ${msg}` };
  }

  const chosenSheet = sheetOverride && wb.Sheets[sheetOverride]
    ? sheetOverride
    : wb.SheetNames[0];
  const ws = wb.Sheets[chosenSheet];
  if (!ws) return { error: "La hoja elegida no existe." };

  const preview = buildSheetPreview(chosenSheet, ws, 1);
  const rows = sheetToObjects(ws, preview.headerRow);

  const admin = createSupabaseAdminClient();
  const { data: batch, error } = await admin
    .from("import_batches")
    .insert({
      source_name: sourceName,
      source_type: kind,
      source_kind: kind,
      file_name: file.name,
      sheet_name: chosenSheet,
      header_row: preview.headerRow,
      row_count: rows.length,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (error || !batch) {
    return { error: error?.message ?? "No pude crear el batch." };
  }

  if (rows.length > 0) {
    const payload = rows.map((raw_payload, idx) => ({
      batch_id: batch.id,
      row_number: idx + 1,
      raw_payload: raw_payload as Json,
    }));
    // Insert en tandas de 500 para no pasar el límite del postgrest
    for (let i = 0; i < payload.length; i += 500) {
      const chunk = payload.slice(i, i + 500);
      const { error: rawErr } = await admin
        .from("import_rows_raw")
        .insert(chunk);
      if (rawErr) {
        return { error: `Falló el guardado de filas: ${rawErr.message}` };
      }
    }
  }

  revalidatePath("/importar");
  redirect(`/importar/${batch.id}`);
}

export type MappingState = {
  error?: string;
};

export async function saveMappingAction(
  batchId: string,
  _prev: MappingState,
  formData: FormData,
): Promise<MappingState> {
  const mappingJson = String(formData.get("mapping") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  const expoId = String(formData.get("expo_id") ?? "");
  const formId = String(formData.get("form_id") ?? "");
  const campaignId = String(formData.get("campaign_id") ?? "");
  const sourceName = String(formData.get("source_name") ?? "").trim();

  let parsed: BatchMapping;
  try {
    parsed = JSON.parse(mappingJson) as BatchMapping;
  } catch {
    return { error: "Mapping inválido." };
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("import_batches")
    .update({
      column_mapping: parsed as unknown as Json,
      context_event_id: eventId || null,
      context_expo_id: expoId || null,
      context_form_id: formId || null,
      context_campaign_id: campaignId || null,
      source_name: sourceName || undefined,
    })
    .eq("id", batchId);

  if (error) return { error: error.message };

  revalidatePath(`/importar/${batchId}`);
  return {};
}

export type CommitState = {
  error?: string;
  stats?: {
    total: number;
    contactsCreated: number;
    contactsMatched: number;
    touchpointsCreated: number;
    skippedNoIdentifier: number;
    skippedInvalidPhone: number;
    skippedFiltered: number;
    failed: number;
  };
};

export async function commitBatchAction(
  batchId: string,
  _prev: CommitState,
  _formData: FormData,
): Promise<CommitState> {
  const admin = createSupabaseAdminClient();
  const { data: batch, error } = await admin
    .from("import_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();

  if (error || !batch) return { error: "Batch no encontrado." };
  if (batch.status === "imported")
    return { error: "Este batch ya fue importado." };
  if (!batch.source_kind) return { error: "El batch no tiene tipo definido." };
  if (!batch.column_mapping)
    return { error: "Falta configurar el mapeo de columnas." };

  const mapping = (batch.column_mapping as unknown as BatchMapping).columns;
  if (!mapping || mapping.length === 0) {
    return { error: "El mapeo está vacío." };
  }

  const kind = batch.source_kind as SourceKind;
  if (kind === "event" && !batch.context_event_id) {
    return { error: "Seleccioná el evento antes de importar." };
  }
  if (kind === "expo" && !batch.context_expo_id) {
    return { error: "Seleccioná la expo antes de importar." };
  }
  if (kind === "form" && !batch.context_form_id) {
    return { error: "Seleccioná el formulario antes de importar." };
  }

  await admin
    .from("import_batches")
    .update({ status: "processing" })
    .eq("id", batchId);

  try {
    const rowFilter = batch.row_filter
      ? (batch.row_filter as unknown as RowFilter)
      : null;

    const stats = await commitBatch(
      admin,
      {
        batchId,
        sourceKind: kind,
        sourceName: batch.source_name,
        eventId: batch.context_event_id,
        expoId: batch.context_expo_id,
        formId: batch.context_form_id,
        campaignId: batch.context_campaign_id,
        rowFilter,
      },
      mapping,
    );
    revalidatePath("/importar");
    revalidatePath(`/importar/${batchId}`);
    revalidatePath("/contactos");
    revalidatePath("/");
    return {
      stats: {
        total: stats.total,
        contactsCreated: stats.contactsCreated,
        contactsMatched: stats.contactsMatched,
        touchpointsCreated: stats.touchpointsCreated,
        skippedNoIdentifier: stats.skippedNoIdentifier,
        skippedInvalidPhone: stats.skippedInvalidPhone,
        skippedFiltered: stats.skippedFiltered,
        failed: stats.failed,
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin
      .from("import_batches")
      .update({ status: "failed" })
      .eq("id", batchId);
    return { error: msg };
  }
}

export async function deleteBatchAction(batchId: string) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("import_batches")
    .delete()
    .eq("id", batchId);
  if (error) throw new Error(error.message);
  revalidatePath("/importar");
  redirect("/importar");
}

export type QuickCreateState = {
  error?: string;
  createdId?: string;
};

export async function quickCreateContextAction(
  kind: "event" | "expo" | "form" | "campaign",
  _prev: QuickCreateState,
  formData: FormData,
): Promise<QuickCreateState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Ingresá un nombre." };
  const admin = createSupabaseAdminClient();

  const tableByKind: Record<typeof kind, "events" | "expos" | "forms" | "campaigns"> = {
    event: "events",
    expo: "expos",
    form: "forms",
    campaign: "campaigns",
  };

  const { data, error } = await admin
    .from(tableByKind[kind])
    .insert({ name })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "No pude crearlo." };
  return { createdId: data.id };
}
