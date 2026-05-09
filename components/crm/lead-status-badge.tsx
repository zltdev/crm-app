import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  type LeadStatus,
} from "@/lib/crm/leads";

export function LeadStatusBadge({ status }: { status: string }) {
  const label =
    LEAD_STATUS_LABELS[status as LeadStatus] ?? status;
  const variant =
    (LEAD_STATUS_COLORS[status as LeadStatus] as BadgeProps["variant"]) ??
    "secondary";

  return <Badge variant={variant}>{label}</Badge>;
}

export function LeadFeedbackBadge({ feedback }: { feedback: string | null }) {
  if (!feedback || feedback === "Sin feedback") {
    return <Badge variant="secondary">Sin feedback</Badge>;
  }
  const variant: BadgeProps["variant"] =
    feedback.toLowerCase() === "vendido"
      ? "success"
      : feedback.toLowerCase() === "en negociación"
        ? "warning"
        : feedback.toLowerCase().includes("rechaz")
          ? "destructive"
          : "outline";

  return <Badge variant={variant}>{feedback}</Badge>;
}
