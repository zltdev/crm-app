import { Badge, type BadgeProps } from "@/components/ui/badge";
import { SOURCE_LABELS } from "@/app/(app)/touchpoints/nuevo/constants";

const VARIANT: Record<string, BadgeProps["variant"]> = {
  form: "default",
  event: "success",
  expo: "warning",
  phone_call: "secondary",
  whatsapp: "success",
  email: "default",
  agent: "default",
  referral: "secondary",
  manual: "secondary",
  import: "outline",
  other: "outline",
};

export function SourceBadge({ type }: { type: string }) {
  const variant = VARIANT[type] ?? "outline";
  const label =
    (SOURCE_LABELS as Record<string, string>)[type] ?? type;
  return <Badge variant={variant}>{label}</Badge>;
}
