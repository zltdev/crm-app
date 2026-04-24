"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  action,
  label = "Eliminar",
  confirmLabel = "Confirmar",
  confirmMessage = "¿Seguro que querés eliminar este registro? No se puede deshacer.",
  variant = "destructive",
}: {
  action: () => Promise<void>;
  label?: string;
  confirmLabel?: string;
  confirmMessage?: string;
  variant?: "destructive" | "outline" | "ghost";
}) {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (armed) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{confirmMessage}</span>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() => startTransition(() => action())}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          {confirmLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setArmed(false)}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={variant}
      onClick={() => setArmed(true)}
    >
      <Trash2 className="h-4 w-4" />
      {label}
    </Button>
  );
}
