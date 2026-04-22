import type { ColumnMapping, SourceKind, TargetKind } from "./types";

type SynonymEntry = { target: TargetKind; keywords: string[] };

// Sinónimos canónicos. Todo en lowercase, sin acentos normalizados para matching.
const BASE_SYNONYMS: SynonymEntry[] = [
  {
    target: "contact_phone",
    keywords: [
      "phone",
      "phone_number",
      "telefono",
      "tel",
      "celular",
      "movil",
      "whatsapp",
      "wa",
      "wa_id",
    ],
  },
  {
    target: "contact_email",
    keywords: ["email", "mail", "correo", "e-mail", "e_mail", "emailaddress"],
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
    keywords: ["name", "full_name", "nombre completo", "nombre_completo", "fullname"],
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
      "fecha contacto",
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
  // matcheo por inclusión tanto en el header como en la keyword, para capturar
  // "fecha_de_contacto" ~ "fecha" y "phone_number" ~ "phone".
  return header.includes(k) || k.includes(header);
}
