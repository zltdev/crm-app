export type SourceKind = "agent" | "form" | "event" | "expo";

export const SOURCE_KINDS: SourceKind[] = ["agent", "form", "event", "expo"];

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  agent: "Agente / Bot",
  form: "Formulario",
  event: "Evento",
  expo: "Exposición",
};

export const SOURCE_KIND_DESCRIPTIONS: Record<SourceKind, string> = {
  agent:
    "Leads que conversaron con un agente (WhatsApp, web, etc). Crea un agent_conversation por fila.",
  form:
    "Contactos que completaron un formulario o landing. Crea un form_submission por fila.",
  event:
    "Asistentes a un evento. Crea un event_attendance por fila, ligado al evento elegido.",
  expo:
    "Contactos capturados en una expo o feria. Crea un expo_contact por fila, ligado a la expo elegida.",
};

// Targets posibles para una columna del Excel.
export type TargetKind =
  | "skip"
  | "contact_phone"
  | "contact_email"
  | "contact_first_name"
  | "contact_last_name"
  | "contact_full_name"
  | "touchpoint_occurred_at"
  | "touchpoint_source_name"
  | "satellite_field"
  | "metadata";

// Campos específicos por cada tabla satélite (cuando target=satellite_field).
// Solo listamos los "first-class" — el resto de lo que no mapea acá debe ir a metadata.
export type SatelliteFieldByKind = {
  agent:
    | "agent_name"
    | "channel"
    | "started_at"
    | "ended_at"
    | "conversation_id";
  form: "submitted_at";
  event: "attendance_status" | "lead_source" | "checked_in_at";
  expo: "stand" | "sales_rep" | "interaction_result";
};

export type ColumnMapping = {
  column: string; // header original tal como viene del Excel
  target: TargetKind;
  // Solo cuando target=satellite_field. Campo de la tabla satélite del source_kind.
  satelliteField?: string;
  // Solo cuando target=metadata. Key bajo el cual guardar el valor en metadata.
  metadataKey?: string;
};

export type BatchMapping = {
  columns: ColumnMapping[];
};

// Filtro opcional por valor de columna del Excel.
// Ej: { column: "TIPO", operator: "in", values: ["VISITANTE", "EXPOSITOR"] }
// Las filas que no matcheen se marcan como skipped con reason=filtered_out.
export type RowFilter = {
  column: string;
  operator: "in" | "not_in";
  values: string[];
};

export type PreviewStats = {
  totalRows: number;
  rowsWithPhone: number;
  rowsWithEmail: number;
  rowsWithoutIdentifier: number;
  likelyMatches: number;
  likelyNew: number;
};

// Etiquetas para UI.
export const TARGET_LABELS: Record<TargetKind, string> = {
  skip: "Ignorar columna",
  contact_phone: "Contacto · teléfono",
  contact_email: "Contacto · email",
  contact_first_name: "Contacto · nombre",
  contact_last_name: "Contacto · apellido",
  contact_full_name: "Contacto · nombre completo (se parte)",
  touchpoint_occurred_at: "Touchpoint · fecha/hora",
  touchpoint_source_name: "Touchpoint · source name (override)",
  satellite_field: "Campo específico del tipo",
  metadata: "Guardar en metadata",
};

// Campos satélite disponibles por tipo, con labels.
export const SATELLITE_FIELDS: Record<
  SourceKind,
  { value: string; label: string }[]
> = {
  agent: [
    { value: "conversation_id", label: "ID de conversación (externo)" },
    { value: "agent_name", label: "Nombre del agente" },
    { value: "channel", label: "Canal (whatsapp, web, email, sms, other)" },
    { value: "started_at", label: "Inicio de conversación" },
    { value: "ended_at", label: "Fin de conversación" },
  ],
  form: [{ value: "submitted_at", label: "Fecha de submission" }],
  event: [
    {
      value: "attendance_status",
      label: "Estado (registered, confirmed, checked_in, no_show, cancelled)",
    },
    { value: "lead_source", label: "Origen del lead" },
    { value: "checked_in_at", label: "Hora de check-in" },
  ],
  expo: [
    { value: "stand", label: "Stand" },
    { value: "sales_rep", label: "Comercial / sales rep" },
    { value: "interaction_result", label: "Resultado de la interacción" },
  ],
};
