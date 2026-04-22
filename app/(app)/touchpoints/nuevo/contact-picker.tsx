"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fullName } from "@/lib/utils";
import {
  searchContactsAction,
  type ContactSearchResult,
} from "./search-contacts";

export function ContactPicker({
  initial,
  onChange,
}: {
  initial?: ContactSearchResult | null;
  onChange: (id: string) => void;
}) {
  const [selected, setSelected] = useState<ContactSearchResult | null>(
    initial ?? null,
  );
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [isLoading, startSearch] = useTransition();

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
        <div>
          <div className="font-medium">
            {fullName(selected.first_name, selected.last_name)}
          </div>
          <div className="text-xs text-muted-foreground">
            {selected.phone}
            {selected.email ? ` · ${selected.email}` : ""}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setSelected(null);
            onChange("");
            setQ("");
            setResults([]);
            setSearched(false);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  function doSearch() {
    if (q.trim().length < 2) return;
    startSearch(async () => {
      const data = await searchContactsAction(q);
      setResults(data);
      setSearched(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                doSearch();
              }
            }}
            placeholder="Buscar por nombre, teléfono o email…"
            className="pl-9"
          />
        </div>
        <Button
          type="button"
          onClick={doSearch}
          disabled={isLoading || q.trim().length < 2}
          variant="secondary"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
        </Button>
      </div>

      {results.length > 0 && (
        <Card className="max-h-60 overflow-y-auto p-1">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setSelected(r);
                onChange(r.id);
                setResults([]);
                setQ("");
                setSearched(false);
              }}
              className="flex w-full items-start justify-between gap-2 rounded px-2 py-2 text-left text-sm hover:bg-muted"
            >
              <div>
                <div className="font-medium">
                  {fullName(r.first_name, r.last_name)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.phone}
                  {r.email ? ` · ${r.email}` : ""}
                </div>
              </div>
            </button>
          ))}
        </Card>
      )}

      {!isLoading && searched && results.length === 0 && (
        <div className="text-xs text-muted-foreground">
          Sin resultados para &quot;{q}&quot;.
        </div>
      )}
    </div>
  );
}
