// Helpers de UI del scoring — no importa nada de admin/server-only,
// se puede usar en client components.

export function scoreColor(
  value: number,
): "success" | "warning" | "secondary" | "destructive" {
  if (value >= 70) return "success";
  if (value >= 40) return "warning";
  if (value >= 20) return "secondary";
  return "destructive";
}
