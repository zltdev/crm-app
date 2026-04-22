import type { ColumnMapping, SourceKind, TargetKind } from "./types";

type SynonymEntry = { target: TargetKind; keywords: string[] };

// Sinónimos canónicos. Todo en lowercase, sin acentos normalizados para matching.
// Columnas cuyo nombre normalizado = estas keys se envían siempre a metadata
// con una semántica pre-definida. Evita, p.ej., que "id" matchee con "wa_id".
const FORCED_METADATA: Record<string, string> = {
  id: "external_id",
  external_id: "external_id",
  source_id: "external_id",
};

const BASE_SYNONYMS: SynonymEntry[] = [
  {
    target: "contact_phone",
    // Ojo: dejamos sinónimos que funcionan a nivel "palabra completa" para
    // que `id` no matchee con `wa_id`.
    keywords: [
      "phone",
      "phone_number",
      "telefono",
      "tel",
      "celular",
      "movil",
      "whatsapp",
      "wa_id",
    ],
  },
  {
    target: "contact_email",
    keywords: ["email", "mail", "correo", "e_mail", "emailaddress"],
  },
  {
    target: "contact_first_name",
    keywords: ["first_name", "firstname", "nombre", "given_name"],
  },
  {
    target: "contact_last_name",
    keywords: ["last_name", "lastname", "apellido", "surname", "family_name"],
  },
  {
    target: "contact_full_name",
    keywords: [
      "name",
      "full_name",
      "nombre_completo",
      "fullname",
      "contact_name",
    ],
  },
  {
    target: "touchpoint_occurred_at",
    keywords: [
      "occurred_at",
      "created_on",
      "created",
      "created_at",
      "fecha",
      "fecha_contacto",
      "date",
      "timestamp",
      "submitted_at",
      "started_at",
    ],
  },
];

// Ajustes específicos por tipo — por ejemplo en agent, "channel" es distinto que en contact.
const KIND_SPECIFIC: Record<SourceKind, Partial<Record<TargetKind, string[]>>> = {
  agent: {},
  form: {},
  event: {},
  expo: {},
};

// Campos satélite específicos por tipo con sus sinónimos.
const SATELLITE_SYNONYMS: Record<
  SourceKind,
  { field: string; keywords: string[] }[]
> = {
  agent: [
    {
      field: "conversation_id",
      keywords: ["conversation_id", "conv_id", "session_id", "thread_id"],
    },
    { field: "agent_name", keywords: ["agent_name", "agente", "agent"] },
    { field: "channel", keywords: ["channel", "canal", "medio"] },
    { field: "started_at", keywords: ["started_at", "inicio"] },
    { field: "ended_at", keywords: ["ended_at", "fin", "finalizado"] },
  ],
  form: [
    {
      field: "submitted_at",
      keywords: ["submitted_at", "fecha", "fecha_contacto", "created"],
    },
  ],
  event: [
    {
      field: "attendance_status",
      keywords: ["status", "estado", "attendance_status", "asistencia"],
    },
    {
      field: "lead_source",
      keywords: ["lead_source", "origen", "source", "fuente"],
    },
    {
      field: "checked_in_at",
      keywords: ["checked_in_at", "checkin", "check_in", "hora_ingreso"],
    },
  ],
  expo: [
    { field: "stand", keywords: ["stand", "puesto", "booth"] },
    { field: "sales_rep", keywords: ["sales_rep", "comercial", "vendedor", "rep"] },
    {
      field: "interaction_result",
      keywords: [
        "interaction_result",
        "resultado",
        "outcome",
        "result",
        "avance",
      ],
    },
  ],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function autoMapColumns(
  headers: string[],
  kind: SourceKind,
): ColumnMapping[] {
  const used = new Set<TargetKind>();
  const satelliteUsed = new Set<string>();

  return headers.map<ColumnMapping>((header) => {
    const h = normalize(header);

    // 0) Forced metadata: `id` siempre va a metadata.external_id, no a phone.
    if (FORCED_METADATA[h]) {
      return {
        column: header,
        target: "metadata",
        metadataKey: FORCED_METADATA[h],
      };
    }

    // 1) Match contra sinónimos base (campos de contacto + touchpoint)
    for (const entry of BASE_SYNONYMS) {
      if (used.has(entry.target)) continue;
      if (entry.keywords.some((k) => matches(h, k))) {
        used.add(entry.target);
        return { column: header, target: entry.target };
      }
    }

    // 2) Kind-specific adjustments
    const kindSpecific = KIND_SPECIFIC[kind];
    for (const [target, keywords] of Object.entries(kindSpecific) as [
      TargetKind,
      string[],
    ][]) {
      if (used.has(target)) continue;
      if ((keywords ?? []).some((k) => matches(h, k))) {
        used.add(target);
        return { column: header, target };
      }
    }

    // 3) Satélite
    for (const sat of SATELLITE_SYNONYMS[kind]) {
      if (satelliteUsed.has(sat.field)) continue;
      if (sat.keywords.some((k) => matches(h, k))) {
        satelliteUsed.add(sat.field);
        return {
          column: header,
          target: "satellite_field",
          satelliteField: sat.field,
        };
      }
    }

    // 4) Fallback → metadata con la key original del header
    return {
      column: header,
      target: "metadata",
      metadataKey: h || header,
    };
  });
}

function matches(header: string, keyword: string): boolean {
  const k = normalize(keyword);
  if (header === k) return true;
  // Match a nivel de palabra (split por guion bajo), no por inclusión de
  // substring — así `id` no matchea con `wa_id` y `mail` no matchea con
  // `email` erróneamente.
  const parts = header.split("_");
  if (parts.includes(k)) return true;
  const kParts = k.split("_");
  if (kParts.length > 1 && kParts.every((p) => parts.includes(p))) return true;
  return false;
}
