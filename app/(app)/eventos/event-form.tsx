"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { EventFormState } from "./actions";
import { EVENT_STATUSES, EVENT_STATUS_LABELS } from "./constants";

const INITIAL: EventFormState = {};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

type Initial = {
  name?: string | null;
  event_type?: string | null;
  location?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  status?: string | null;
  campaign_id?: string | null;
};

export function EventForm({
  action,
  initial,
  campaigns,
  submitLabel = "Guardar",
}: {
  action: (state: EventFormState, fd: FormData) => Promise<EventFormState>;
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
          placeholder="Presentación proyecto Añelo"
        />
        <FieldError messages={fe.name} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="event_type">Tipo</Label>
          <Input
            id="event_type"
            name="event_type"
            defaultValue={initial?.event_type ?? ""}
            placeholder="presentación / capacitación / networking"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="status">Estado</Label>
          <Select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "planned"}
          >
            {EVENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {EVENT_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Ubicación</Label>
        <Input
          id="location"
          name="location"
          defaultValue={initial?.location ?? ""}
          placeholder="Centro de convenciones Neuquén"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start_at">Inicio</Label>
          <Input
            id="start_at"
            name="start_at"
            type="datetime-local"
            defaultValue={toLocalInput(initial?.start_at)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="end_at">Fin</Label>
          <Input
            id="end_at"
            name="end_at"
            type="datetime-local"
            defaultValue={toLocalInput(initial?.end_at)}
          />
        </div>
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
