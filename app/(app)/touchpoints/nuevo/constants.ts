export const TOUCHPOINT_SOURCE_TYPES = [
  "form",
  "event",
  "expo",
  "phone_call",
  "whatsapp",
  "email",
  "agent",
  "manual",
  "referral",
  "import",
  "other",
] as const;

export type TouchpointSourceType = (typeof TOUCHPOINT_SOURCE_TYPES)[number];

export const SOURCE_LABELS: Record<TouchpointSourceType, string> = {
  form: "Formulario",
  event: "Evento",
  expo: "Expo / feria",
  phone_call: "Llamada telefónica",
  whatsapp: "WhatsApp",
  email: "Email",
  agent: "Agente / bot",
  referral: "Referido",
  manual: "Carga manual",
  import: "Importación",
  other: "Otro",
};
