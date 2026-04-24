import { cn } from "@/lib/utils";

export type BarChartInlineItem = {
  label: string;
  value: number;
  hint?: string;
};

export function BarChartInline({
  items,
  max,
  className,
  emptyLabel = "Sin datos.",
}: {
  items: BarChartInlineItem[];
  max?: number;
  className?: string;
  emptyLabel?: string;
}) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }
  const maxValue = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {items.map((it, idx) => {
        const pct = Math.max(2, Math.round((it.value / maxValue) * 100));
        return (
          <div key={`${it.label}-${idx}`} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="truncate text-foreground">{it.label}</span>
              <span className="ml-2 tabular-nums text-muted-foreground">
                {it.value.toLocaleString("es-AR")}
                {it.hint && (
                  <span className="ml-1 text-muted-foreground/70">
                    {it.hint}
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
