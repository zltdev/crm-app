"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DELIVERY_CHANNELS,
  DELIVERY_CHANNEL_LABELS,
  type DeliveryChannel,
} from "@/lib/crm/deliveries";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_CHANNEL_LABELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
} from "@/app/(app)/campanas/constants";
import {
  createCampaignFromSelection,
  type CreateCampaignFromSelectionState,
} from "@/app/(app)/campanas/bulk-actions";

const INITIAL: CreateCampaignFromSelectionState = {};

type Campaign = { id: string; name: string; status: string };

export function NewCampaignDialog({
  open,
  onClose,
  source,
  scope,
  ids,
  filters,
  estimatedContacts,
  campaigns,
}: {
  open: boolean;
  onClose: () => void;
  source: "touchpoints" | "contacts";
  scope: "ids" | "all_matching";
  ids?: string[];
  filters?: Record<string, string | undefined>;
  estimatedContacts?: number;
  campaigns: Campaign[];
}) {
  const [state, action] = useActionState(createCampaignFromSelection, INITIAL);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [deliveryChannel, setDeliveryChannel] =
    useState<DeliveryChannel>("email");

  const sourceLabel =
    source === "touchpoints" ? "touchpoints" : "contactos";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Crear campaña desde selección"
      description={
        scope === "ids"
          ? `${ids?.length ?? 0} ${sourceLabel} seleccionados. Se resolverán los contactos únicos antes de crear deliveries.`
          : `Todos los ${sourceLabel} que cumplen los filtros actuales${
              estimatedContacts !== undefined
                ? ` (≈ ${estimatedContacts.toLocaleString("es-AR")})`
                : ""
            }.`
      }
    >
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="scope" value={scope} />
        <input type="hidden" name="ids" value={JSON.stringify(ids ?? [])} />
        <input
          type="hidden"
          name="filters"
          value={JSON.stringify(filters ?? {})}
        />

        {/* Tab selector */}
        <div className="inline-flex self-start rounded-lg border border-border bg-muted/50 p-1 text-sm">
          <TabButton
            active={mode === "new"}
            onClick={() => setMode("new")}
          >
            Nueva campaña
          </TabButton>
          <TabButton
            active={mode === "existing"}
            onClick={() => setMode("existing")}
          >
            Campaña existente
          </TabButton>
        </div>
        <input type="hidden" name="mode" value={mode} />

        {mode === "new" ? (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="camp_name">
                Nombre de la campaña <span className="text-destructive">*</span>
              </Label>
              <Input
                id="camp_name"
                name="camp_name"
                required
                placeholder="Nutrición Q2 — Leads Evento"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="camp_status">Estado</Label>
                <Select
                  id="camp_status"
                  name="camp_status"
                  defaultValue="active"
                >
                  {CAMPAIGN_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {CAMPAIGN_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="camp_channel">Canal de la campaña</Label>
                <Select id="camp_channel" name="camp_channel" defaultValue="">
                  <option value="">— Sin canal —</option>
                  {CAMPAIGN_CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {CAMPAIGN_CHANNEL_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="camp_description">Descripción</Label>
              <Textarea
                id="camp_description"
                name="camp_description"
                rows={2}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="campaign_id">
              Elegí la campaña <span className="text-destructive">*</span>
            </Label>
            <Select id="campaign_id" name="campaign_id" required defaultValue="">
              <option value="" disabled>
                — Seleccionar campaña —
              </option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.status}
                </option>
              ))}
            </Select>
            {campaigns.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hay campañas. Cambiá a &quot;Nueva campaña&quot; o creá una
                primero.
              </p>
            )}
          </div>
        )}

        <div className="rounded-md border border-border bg-muted/30 p-4">
          <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
            Configuración del delivery
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="delivery_channel">
                  Canal <span className="text-destructive">*</span>
                </Label>
                <Select
                  id="delivery_channel"
                  name="delivery_channel"
                  required
                  value={deliveryChannel}
                  onChange={(e) =>
                    setDeliveryChannel(e.target.value as DeliveryChannel)
                  }
                >
                  {DELIVERY_CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {DELIVERY_CHANNEL_LABELS[c]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="scheduled_at">
                  Scheduled (opcional)
                </Label>
                <Input
                  id="scheduled_at"
                  name="scheduled_at"
                  type="datetime-local"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" rows={2} />
              <p className="text-xs text-muted-foreground">
                Se guarda en <code>metadata.notes</code> de cada delivery.
              </p>
            </div>
          </div>
        </div>

        {state.error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <SubmitButton />
        </div>
      </form>
    </Dialog>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 transition-colors",
        active
          ? "bg-card text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
      Crear deliveries
    </Button>
  );
}
