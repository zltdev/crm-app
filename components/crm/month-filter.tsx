"use client";

import { useRouter } from "next/navigation";

const MONTH_LABELS: Record<string, string> = {
  "01": "Ene",
  "02": "Feb",
  "03": "Mar",
  "04": "Abr",
  "05": "May",
  "06": "Jun",
  "07": "Jul",
  "08": "Ago",
  "09": "Sep",
  "10": "Oct",
  "11": "Nov",
  "12": "Dic",
};

export function MonthFilter({
  availableMonths,
  selectedMonths,
  showAll,
}: {
  availableMonths: string[];
  selectedMonths: string[];
  showAll: boolean;
}) {
  const router = useRouter();
  const selected = new Set(selectedMonths);

  const byYear = new Map<string, string[]>();
  for (const m of availableMonths) {
    const year = m.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(m);
  }

  function navigate(months: string[] | "all") {
    if (months === "all") {
      router.push("/leads/reportes?months=all");
    } else if (months.length === 0) {
      router.push("/leads/reportes");
    } else {
      router.push(`/leads/reportes?months=${months.join(",")}`);
    }
  }

  function toggleMonth(month: string) {
    const next = new Set(selected);
    if (next.has(month)) next.delete(month);
    else next.add(month);
    navigate([...next].sort());
  }

  function toggleYear(year: string) {
    const yearMonths = byYear.get(year) ?? [];
    const allSelected = yearMonths.every((m) => selected.has(m));
    const next = new Set(selected);
    if (allSelected) {
      yearMonths.forEach((m) => next.delete(m));
    } else {
      yearMonths.forEach((m) => next.add(m));
    }
    navigate([...next].sort());
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-muted-foreground mr-1">
          Período:
        </span>
        <button
          onClick={() => navigate("all")}
          className={`text-xs font-medium px-2.5 py-1 rounded-md cursor-pointer transition-colors border ${
            showAll
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:bg-muted"
          }`}
        >
          Todos
        </button>
      </div>
      {[...byYear.entries()].map(([year, months]) => {
        const allYearSelected =
          !showAll && months.every((m) => selected.has(m));
        const someYearSelected =
          !showAll && months.some((m) => selected.has(m));
        return (
          <div key={year} className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => toggleYear(year)}
              className={`text-xs font-semibold px-2 py-1 rounded-md cursor-pointer transition-colors border min-w-[3rem] ${
                showAll
                  ? "bg-primary/10 text-primary border-primary/20"
                  : allYearSelected
                    ? "bg-primary text-primary-foreground border-primary"
                    : someYearSelected
                      ? "bg-primary/20 text-primary border-primary/30"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {year}
            </button>
            {months.map((m) => {
              const monthNum = m.slice(5);
              const isSelected = showAll || selected.has(m);
              return (
                <button
                  key={m}
                  onClick={() => toggleMonth(m)}
                  className={`text-xs px-1.5 py-1 rounded-md cursor-pointer transition-colors border ${
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  {MONTH_LABELS[monthNum] ?? monthNum}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
