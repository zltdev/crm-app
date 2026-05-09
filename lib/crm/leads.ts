export const LEAD_STATUSES = [
  "nuevo",
  "falta_derivar",
  "derivado",
  "no_derivar",
  "rechazado",
  "resuelto",
  "no_contactado",
  "reclamo",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  falta_derivar: "Falta derivar",
  derivado: "Derivado",
  no_derivar: "No derivar",
  rechazado: "Rechazado",
  resuelto: "Resuelto",
  no_contactado: "No contactado",
  reclamo: "Reclamo",
};

export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  nuevo: "default",
  falta_derivar: "warning",
  derivado: "success",
  no_derivar: "secondary",
  rechazado: "destructive",
  resuelto: "default",
  no_contactado: "secondary",
  reclamo: "destructive",
};

export const LEAD_PROJECTS = [
  "Alamos",
  "PIVM",
  "Nodo Flex",
  "Lumina Funes",
  "Onix",
  "Condo Funes",
  "ZLT",
  "Otro",
] as const;

export const LEAD_SOURCES = [
  "Pauta RRSS",
  "Agente",
  "Form",
  "Form Web",
  "Formulario Web",
  "Libre",
  "Evento",
  "Google Maps",
  "Mailing",
  "WPP",
  "Mail",
  "web ZLT",
  "Reel Acción Influencer",
  "Indeterminado",
  "Desconocido",
] as const;

export const LEAD_FEEDBACKS = [
  "Sin feedback",
  "En negociación",
  "Vendido",
  "Rechazado",
  "No contesta",
  "No interesado",
  "Contactado",
] as const;
