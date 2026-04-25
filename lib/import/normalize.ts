import type { ColumnMapping, SourceKind } from "./types";
import { normalizeEmail, normalizePhone } from "@/lib/crm/normalize";

export type NormalizedRow = {
  // Contact
  phone: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_normalized: string | null;
  email_normalized: string | null;
  // Si el phone original era basura/inválido (length < 6, solo símbolos),
  // dejamos marca para que el commit lo trate como sin-identificador
  // si tampoco hay email.
  phone_invalid_reason: string | null;
  // Touchpoint
  occurred_at: string | null;
  source_name_override: string | null;
  // Data por bucket
  satellite: Record<string, unknown>;
  satelliteMetadata: Record<string, unknown>;
  touchpointMetadata: Record<string, unknown>;
};

export function normalizeRow(
  rawRow: Record<string, unknown>,
  mapping: ColumnMapping[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _kind: SourceKind,
): NormalizedRow {
  const out: NormalizedRow = {
    phone: null,
    email: null,
    first_name: null,
    last_name: null,
    phone_normalized: null,
    email_normalized: null,
    phone_invalid_reason: null,
    occurred_at: null,
    source_name_override: null,
    satellite: {},
    satelliteMetadata: {},
    touchpointMetadata: {},
  };

  for (const m of mapping) {
    const raw = rawRow[m.column];
    if (raw == null || raw === "") continue;
    const value = typeof raw === "string" ? raw.trim() : raw;
    if (value === "") continue;

    switch (m.target) {
      case "skip":
        break;
      case "contact_phone":
        out.phone = String(value);
        break;
      case "contact_email":
        out.email = String(value);
        break;
      case "contact_first_name":
        out.first_name = String(value);
        break;
      case "contact_last_name":
        out.last_name = String(value);
        break;
      case "contact_full_name": {
        const [first, ...rest] = String(value).trim().split(/\s+/);
        out.first_name = out.first_name ?? first ?? null;
        if (rest.length > 0 && !out.last_name) {
          out.last_name = rest.join(" ");
        }
        break;
      }
      case "touchpoint_occurred_at":
        out.occurred_at = parseDate(value);
        break;
      case "touchpoint_source_name":
        out.source_name_override = String(value);
        break;
      case "satellite_field":
        if (m.satelliteField) {
          out.satellite[m.satelliteField] = value;
        }
        break;
      case "metadata":
        out.touchpointMetadata[m.metadataKey ?? m.column] = value;
        break;
    }
  }

  out.phone_normalized = normalizePhone(out.phone);
  out.email_normalized = normalizeEmail(out.email);

  // Validación de phone: si el original existe pero el normalizado tiene
  // menos de 6 dígitos, lo marcamos como inválido. El commit usará esto
  // junto con email para decidir si la fila tiene identificador.
  if (out.phone && out.phone_normalized) {
    const digits = out.phone_normalized.replace(/[^0-9]/g, "");
    if (digits.length < 6) {
      out.phone_invalid_reason = "too_short";
      out.phone_normalized = null;
    }
  } else if (out.phone && !out.phone_normalized) {
    // El phone tenía solo símbolos o caracteres no-numéricos
    out.phone_invalid_reason = "no_digits";
  }

  return out;
}

// Multiformato: ISO, ISO con TZ, dd/mm/yyyy, YYYYMMDD HH:MM:SS,
// YYYYMMDDHHMMSS, excel serial.
function parseDate(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number") {
    // excel serial (días desde 1899-12-30)
    const ms = (value - 25569) * 86400 * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const s = String(value).trim();
  if (!s) return null;

  // ISO 8601 directo
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = new Date(s);
    if (!Number.isNaN(iso.getTime())) return iso.toISOString();
  }

  // YYYYMMDD HH:MM:SS o YYYYMMDD HH:MM (caso AOG Expo)
  const compact = s.match(
    /^(\d{4})(\d{2})(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (compact) {
    const [, y, mo, d, hh, mm, ss] = compact;
    const date = new Date(
      Date.UTC(
        parseInt(y, 10),
        parseInt(mo, 10) - 1,
        parseInt(d, 10),
        parseInt(hh, 10),
        parseInt(mm, 10),
        ss ? parseInt(ss, 10) : 0,
      ),
    );
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  // YYYYMMDDHHMMSS (sin separador, 14 dígitos)
  const compact14 = s.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (compact14) {
    const [, y, mo, d, hh, mm, ss] = compact14;
    const date = new Date(
      Date.UTC(
        parseInt(y, 10),
        parseInt(mo, 10) - 1,
        parseInt(d, 10),
        parseInt(hh, 10),
        parseInt(mm, 10),
        parseInt(ss, 10),
      ),
    );
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  // YYYYMMDD (sin separador, 8 dígitos, sin hora)
  const dateOnly = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly) {
    const [, y, mo, d] = dateOnly;
    const date = new Date(
      Date.UTC(parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10)),
    );
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  // dd/mm/yyyy or dd/mm/yy (opcional hora)
  const ddmm = s.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (ddmm) {
    const [, d1, d2, y, hh, mm, ss] = ddmm;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    // Heurística: si d1 > 12 es dd/mm; si d2 > 12 es mm/dd; si ambos <= 12 asumimos dd/mm (LatAm).
    const dayFirst = parseInt(d1, 10) > 12 || parseInt(d2, 10) <= 12;
    const day = dayFirst ? parseInt(d1, 10) : parseInt(d2, 10);
    const month = dayFirst ? parseInt(d2, 10) : parseInt(d1, 10);
    const date = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        hh ? parseInt(hh, 10) : 0,
        mm ? parseInt(mm, 10) : 0,
        ss ? parseInt(ss, 10) : 0,
      ),
    );
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  // Fallback: intentar con Date()
  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback.toISOString();
}
