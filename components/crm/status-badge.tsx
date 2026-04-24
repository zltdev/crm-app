import { Badge, type BadgeProps } from "@/components/ui/badge";

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  active: "success",
  draft: "secondary",
  planned: "secondary",
  paused: "warning",
  closed: "outline",
  cancelled: "destructive",
  archived: "outline",
  inactive: "outline",
  blocked: "warning",
  deleted: "destructive",
  merged: "secondary",
};

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "outline";
  return <Badge variant={variant}>{status}</Badge>;
}
