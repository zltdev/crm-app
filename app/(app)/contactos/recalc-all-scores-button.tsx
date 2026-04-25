"use client";

import { useState, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recalculateAllScoresAction } from "./actions";

export function RecalcAllScoresButton() {
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    startTransition(async () => {
      const res = await recalculateAllScoresAction();
      if (res.ok) {
        setMsg(`✓ ${res.affected ?? 0} scores actualizados`);
      } else {
        setMsg(`❌ ${res.error}`);
      }
      setArmed(false);
    });
  }

  if (armed) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Recalcular scores de todos los contactos. Puede tardar unos
          segundos.
        </span>
        <Button
          type="button"
          size="sm"
          onClick={run}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Confirmar
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setArmed(false)}
          disabled={pending}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setArmed(true)}
      >
        <RefreshCw className="h-4 w-4" />
        Recalcular scores
      </Button>
    </div>
  );
}
