import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import type { ColumnMapping, RowFilter, SourceKind } from "./types";
import { normalizeRow } from "./normalize";

type Admin = SupabaseClient<Database>;

export type CommitContext = {
  batchId: string;
  sourceKind: SourceKind;
  sourceName: string;
  eventId?: string | null;
  expoId?: string | null;
  formId?: string | null;
  campaignId?: string | null;
  rowFilter?: RowFilter | null;
};

export type CommitStats = {
  total: number;
  contactsCreated: number;
  contactsMatched: number;
  satellitesCreated: number;
  touchpointsCreated: number;
  skippedNoIdentifier: number;
  skippedInvalidPhone: number;
  skippedFiltered: number;
  failed: number;
  errors: string[];
};

function rowMatchesFilter(
  payload: Record<string, unknown>,
  filter: RowFilter | null | undefined,
): boolean {
  if (!filter || filter.values.length === 0) return true;
  const raw = payload[filter.column];
  const value = raw == null ? "" : String(raw).trim().toLowerCase();
  const set = new Set(filter.values.map((v) => v.trim().toLowerCase()));
  return filter.operator === "in" ? set.has(value) : !set.has(value);
}

export async function commitBatch(
  admin: Admin,
  ctx: CommitContext,
  mapping: ColumnMapping[],
): Promise<CommitStats> {
  const stats: CommitStats = {
    total: 0,
    contactsCreated: 0,
    contactsMatched: 0,
    satellitesCreated: 0,
    touchpointsCreated: 0,
    skippedNoIdentifier: 0,
    skippedInvalidPhone: 0,
    skippedFiltered: 0,
    failed: 0,
    errors: [],
  };

  const { data: rawRows, error: rawErr } = await admin
    .from("import_rows_raw")
    .select("id, raw_payload, row_number")
    .eq("batch_id", ctx.batchId)
    .order("row_number", { ascending: true });

  if (rawErr) throw new Error(rawErr.message);
  stats.total = rawRows?.length ?? 0;

  // Cache de contactos para no hacer lookup repetido dentro del mismo batch.
  const contactCache = new Map<string, string>(); // key phone_norm|email_norm → contact_id

  for (const raw of rawRows ?? []) {
    try {
      const payload = (raw.raw_payload as Record<string, unknown>) ?? {};

      // Filtro por columna (ej: TIPO ∈ {VISITANTE, EXPOSITOR}).
      if (ctx.rowFilter && !rowMatchesFilter(payload, ctx.rowFilter)) {
        stats.skippedFiltered++;
        await admin
          .from("import_rows_normalized")
          .insert({
            batch_id: ctx.batchId,
            raw_row_id: raw.id,
            source_type: ctx.sourceKind,
            source_name: ctx.sourceName,
            normalization_status: "skipped",
            metadata: {
              reason: "filtered_out",
              filter_column: ctx.rowFilter.column,
              filter_value: payload[ctx.rowFilter.column] ?? null,
            } as Json,
          });
        continue;
      }

      const row = normalizeRow(payload, mapping, ctx.sourceKind);

      if (!row.phone_normalized && !row.email_normalized) {
        const isInvalidPhone = row.phone_invalid_reason !== null;
        if (isInvalidPhone) stats.skippedInvalidPhone++;
        else stats.skippedNoIdentifier++;
        await admin
          .from("import_rows_normalized")
          .insert({
            batch_id: ctx.batchId,
            raw_row_id: raw.id,
            source_type: ctx.sourceKind,
            source_name: row.source_name_override ?? ctx.sourceName,
            first_name: row.first_name,
            last_name: row.last_name,
            normalization_status: "skipped",
            metadata: {
              reason: isInvalidPhone
                ? `invalid_phone_${row.phone_invalid_reason}`
                : "missing_identifier",
              raw_phone: row.phone,
              touchpoint: row.touchpointMetadata,
              satellite: row.satellite,
              satellite_metadata: row.satelliteMetadata,
            } as Json,
          });
        continue;
      }

      const cacheKey = `${row.phone_normalized ?? ""}|${row.email_normalized ?? ""}`;
      let contactId = contactCache.get(cacheKey) ?? null;
      let matched = false;

      if (!contactId) {
        // Lookup contacto existente
        const orFilters: string[] = [];
        if (row.phone_normalized) {
          orFilters.push(`phone_normalized.eq.${row.phone_normalized}`);
        }
        if (row.email_normalized) {
          orFilters.push(`email_normalized.eq.${row.email_normalized}`);
        }
        const { data: existing } = await admin
          .from("contacts")
          .select("id")
          .or(orFilters.join(","))
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          contactId = existing.id;
          matched = true;
        }
      } else {
        matched = true;
      }

      if (!contactId) {
        const phoneForInsert =
          row.phone ?? row.phone_normalized ?? row.email ?? "";
        const { data: created, error: insertErr } = await admin
          .from("contacts")
          .insert({
            phone: phoneForInsert,
            email: row.email,
            first_name: row.first_name,
            last_name: row.last_name,
          })
          .select("id")
          .single();

        if (insertErr || !created) {
          throw new Error(insertErr?.message ?? "contact insert failed");
        }
        contactId = created.id;
        stats.contactsCreated++;
      } else if (matched) {
        stats.contactsMatched++;
        // Completar datos faltantes sin pisar
        await admin
          .from("contacts")
          .update({
            first_name: row.first_name ?? undefined,
            last_name: row.last_name ?? undefined,
            email: row.email ?? undefined,
          })
          .eq("id", contactId)
          .is("email", null);
      }
      contactCache.set(cacheKey, contactId);

      // Satélite
      const satelliteId = await createSatellite(
        admin,
        ctx,
        contactId,
        row.occurred_at,
        row.satellite,
        row.satelliteMetadata,
      );
      if (satelliteId) stats.satellitesCreated++;

      // Touchpoint
      const touchpointInsert: Database["public"]["Tables"]["contact_touchpoints"]["Insert"] =
        {
          contact_id: contactId,
          source_type: ctx.sourceKind,
          source_name: row.source_name_override ?? ctx.sourceName,
          occurred_at: row.occurred_at ?? new Date().toISOString(),
          metadata: {
            import_batch_id: ctx.batchId,
            ...row.touchpointMetadata,
          } as Json,
          event_id: ctx.sourceKind === "event" ? (ctx.eventId ?? null) : null,
          expo_id: ctx.sourceKind === "expo" ? (ctx.expoId ?? null) : null,
          form_id: ctx.sourceKind === "form" ? (ctx.formId ?? null) : null,
          campaign_id: ctx.campaignId ?? null,
          agent_conversation_id:
            ctx.sourceKind === "agent" ? satelliteId : null,
        };

      const { error: tpErr } = await admin
        .from("contact_touchpoints")
        .insert(touchpointInsert);
      if (tpErr) throw new Error(tpErr.message);
      stats.touchpointsCreated++;

      await admin
        .from("import_rows_normalized")
        .insert({
          batch_id: ctx.batchId,
          raw_row_id: raw.id,
          source_type: ctx.sourceKind,
          source_name: row.source_name_override ?? ctx.sourceName,
          first_name: row.first_name,
          last_name: row.last_name,
          normalized_phone: row.phone_normalized,
          normalized_email: row.email_normalized,
          occurred_at: row.occurred_at,
          matched_contact_id: contactId,
          normalization_status: matched ? "matched" : "imported",
          metadata: {
            was_matched: matched,
            satellite: row.satellite,
            satellite_metadata: row.satelliteMetadata,
            touchpoint: row.touchpointMetadata,
          } as Json,
        });
    } catch (e) {
      stats.failed++;
      const msg = e instanceof Error ? e.message : String(e);
      if (stats.errors.length < 10) stats.errors.push(msg);
      await admin
        .from("import_rows_normalized")
        .insert({
          batch_id: ctx.batchId,
          raw_row_id: raw.id,
          source_type: ctx.sourceKind,
          source_name: ctx.sourceName,
          normalization_status: "failed",
          metadata: { error: msg } as Json,
        });
    }
  }

  await admin
    .from("import_batches")
    .update({
      status: "imported",
      processed_at: new Date().toISOString(),
      result_stats: stats as unknown as Json,
    })
    .eq("id", ctx.batchId);

  return stats;
}

async function createSatellite(
  admin: Admin,
  ctx: CommitContext,
  contactId: string,
  occurredAt: string | null,
  satellite: Record<string, unknown>,
  satelliteMetadata: Record<string, unknown>,
): Promise<string | null> {
  const meta = { ...satelliteMetadata } as Record<string, unknown>;

  if (ctx.sourceKind === "agent") {
    const channel =
      typeof satellite.channel === "string" ? satellite.channel : "whatsapp";
    const conversationId =
      satellite.conversation_id != null
        ? String(satellite.conversation_id)
        : null;
    const { data, error } = await admin
      .from("agent_conversations")
      .insert({
        contact_id: contactId,
        channel,
        conversation_id: conversationId,
        agent_name:
          typeof satellite.agent_name === "string"
            ? satellite.agent_name
            : null,
        started_at:
          pickDate(satellite.started_at) ??
          occurredAt ??
          new Date().toISOString(),
        ended_at: pickDate(satellite.ended_at),
        campaign_id: ctx.campaignId ?? null,
        metadata: meta as Json,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data?.id ?? null;
  }

  if (ctx.sourceKind === "form") {
    if (!ctx.formId) return null;
    const { data, error } = await admin
      .from("form_submissions")
      .insert({
        contact_id: contactId,
        form_id: ctx.formId,
        campaign_id: ctx.campaignId ?? null,
        submitted_at:
          pickDate(satellite.submitted_at) ??
          occurredAt ??
          new Date().toISOString(),
        payload: { ...satellite, ...meta } as Json,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data?.id ?? null;
  }

  if (ctx.sourceKind === "event") {
    if (!ctx.eventId) return null;
    const { data, error } = await admin
      .from("event_attendances")
      .upsert(
        {
          contact_id: contactId,
          event_id: ctx.eventId,
          attendance_status:
            typeof satellite.attendance_status === "string"
              ? satellite.attendance_status
              : "registered",
          lead_source:
            typeof satellite.lead_source === "string"
              ? satellite.lead_source
              : null,
          checked_in_at: pickDate(satellite.checked_in_at),
          metadata: meta as Json,
        },
        { onConflict: "contact_id,event_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data?.id ?? null;
  }

  if (ctx.sourceKind === "expo") {
    if (!ctx.expoId) return null;
    const stand =
      typeof satellite.stand === "string" && satellite.stand.length > 0
        ? satellite.stand
        : null;
    const { data, error } = await admin
      .from("expo_contacts")
      .insert({
        contact_id: contactId,
        expo_id: ctx.expoId,
        stand,
        sales_rep:
          typeof satellite.sales_rep === "string"
            ? satellite.sales_rep
            : null,
        interaction_result:
          typeof satellite.interaction_result === "string"
            ? satellite.interaction_result
            : null,
        metadata: meta as Json,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data?.id ?? null;
  }

  return null;
}

function pickDate(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (v instanceof Date) return v.toISOString();
  return null;
}
