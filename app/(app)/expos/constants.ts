export const EXPO_STATUSES = [
  "planned",
  "active",
  "closed",
  "cancelled",
] as const;
export type ExpoStatus = (typeof EXPO_STATUSES)[number];

export const EXPO_STATUS_LABELS: Record<ExpoStatus, string> = {
  planned: "Planificada",
  active: "Activa",
  closed: "Cerrada",
  cancelled: "Cancelada",
};
