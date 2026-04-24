export const EVENT_STATUSES = [
  "planned",
  "active",
  "closed",
  "cancelled",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  planned: "Planificado",
  active: "Activo",
  closed: "Cerrado",
  cancelled: "Cancelado",
};
