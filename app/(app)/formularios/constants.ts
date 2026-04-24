export const FORM_STATUSES = ["active", "inactive", "archived"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  archived: "Archivado",
};
