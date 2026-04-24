"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Select } from "@/components/ui/select";
import {
  DELIVERY_STATUSES,
  DELIVERY_STATUS_LABELS,
  type DeliveryStatus,
} from "@/lib/crm/deliveries";
import { updateDeliveryStatusAction } from "../delivery-actions";

export function DeliveryStatusSelect({
  deliveryId,
  campaignId,
  current,
}: {
  deliveryId: string;
  campaignId: string;
  current: DeliveryStatus;
}) {
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as DeliveryStatus;
    if (next === current) return;
    const fd = new FormData();
    fd.set("delivery_id", deliveryId);
    fd.set("campaign_id", campaignId);
    fd.set("status", next);
    startTransition(async () => {
      await updateDeliveryStatusAction({}, fd);
    });
  }

  return (
    <div className="inline-flex items-center gap-1">
      <Select
        value={current}
        onChange={onChange}
        disabled={pending}
        className="h-7 text-xs"
      >
        {DELIVERY_STATUSES.map((s) => (
          <option key={s} value={s}>
            {DELIVERY_STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
      {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
    </div>
  );
}
