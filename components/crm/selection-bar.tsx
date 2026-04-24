"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SelectionBar({
  count,
  totalFiltered,
  onSelectAllMatching,
  allMatchingActive,
  onClear,
  children,
  className,
}: {
  count: number;
  totalFiltered?: number;
  onSelectAllMatching?: () => void;
  allMatchingActive?: boolean;
  onClear: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  if (count === 0) return null;
  const canSelectMore =
    onSelectAllMatching !== undefined &&
    totalFiltered !== undefined &&
    totalFiltered > count &&
    !allMatchingActive;

  return (
    <div
      className={cn(
        "sticky top-4 z-30 flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 shadow-sm backdrop-blur",
        className,
      )}
    >
      <span className="text-sm font-medium">
        {allMatchingActive && totalFiltered !== undefined
          ? `${totalFiltered.toLocaleString("es-AR")} seleccionados (todos los que cumplen filtros)`
          : `${count.toLocaleString("es-AR")} seleccionado${
              count === 1 ? "" : "s"
            }`}
      </span>
      {canSelectMore && (
        <button
          type="button"
          onClick={onSelectAllMatching}
          className="text-xs text-primary underline-offset-4 hover:underline"
        >
          Seleccionar todos los {totalFiltered?.toLocaleString("es-AR")}
        </button>
      )}
      <div className="flex-1" />
      {children}
      <Button type="button" size="sm" variant="ghost" onClick={onClear}>
        <X className="h-4 w-4" />
        Limpiar
      </Button>
    </div>
  );
}
