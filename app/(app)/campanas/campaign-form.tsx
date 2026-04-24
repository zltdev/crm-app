"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { CampaignFormState } from "./actions";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_CHANNEL_LABELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
} from "./constants";

const INITIAL: CampaignFormState = {};

type Initial = {
  name?: string | null;
  description?: string | null;
  status?: string | null;
  channel?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export function CampaignForm({
  action,
  initial,
  submitLabel = "Guardar",
}: {
  action: (
    state: CampaignFormState,
    fd: FormData,
  ) => Promise<CampaignFormState>;
  initial?: Initial;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">
          Nombre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name ?? ""}
          required
          placeholder="Invertir en Añelo 2026"
        />
        <FieldError messages={fieldErrors.name} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Estado</Label>
          <Select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "draft"}
          >
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CAMPAIGN_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="channel">Canal</Label>
          <Select
            id="channel"
            name="channel"
            defaultValue={initial?.channel ?? ""}
          >
            <option value="">— Sin canal —</option>
            {CAMPAIGN_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {CAMPAIGN_CHANNEL_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start_date">Desde</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={initial?.start_date ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="end_date">Hasta</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={initial?.end_date ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={initial?.description ?? ""}
        />
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="self-start">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Save className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}
