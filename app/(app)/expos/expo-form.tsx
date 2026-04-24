"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ExpoFormState } from "./actions";
import { EXPO_STATUSES, EXPO_STATUS_LABELS } from "./constants";

const INITIAL: ExpoFormState = {};

type Initial = {
  name?: string | null;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  campaign_id?: string | null;
};

export function ExpoForm({
  action,
  initial,
  campaigns,
  submitLabel = "Guardar",
}: {
  action: (state: ExpoFormState, fd: FormData) => Promise<ExpoFormState>;
  initial?: Initial;
  campaigns: Array<{ id: string; label: string }>;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, INITIAL);
  const fe = state.fieldErrors ?? {};

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
          placeholder="Expo Oil & Gas 2026"
        />
        <FieldError messages={fe.name} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="venue">Venue</Label>
        <Input
          id="venue"
          name="venue"
          defaultValue={initial?.venue ?? ""}
          placeholder="La Rural"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Ciudad</Label>
          <Input
            id="city"
            name="city"
            defaultValue={initial?.city ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="country">País</Label>
          <Input
            id="country"
            name="country"
            defaultValue={initial?.country ?? ""}
          />
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Estado</Label>
          <Select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "planned"}
          >
            {EXPO_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EXPO_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="campaign_id">Campaña</Label>
          <Select
            id="campaign_id"
            name="campaign_id"
            defaultValue={initial?.campaign_id ?? ""}
          >
            <option value="">— Sin campaña —</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
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
