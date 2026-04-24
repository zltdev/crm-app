"use client";

import Link from "next/link";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectionBar } from "@/components/crm/selection-bar";
import { NewCampaignDialog } from "@/components/crm/new-campaign-dialog";
import { formatDateTime, fullName } from "@/lib/utils";
import type { BadgeProps } from "@/components/ui/badge";

export type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  email: string | null;
  status: string;
  created_at: string;
};

function statusVariant(status: string): BadgeProps["variant"] {
  switch (status) {
    case "active":
      return "success";
    case "blocked":
      return "warning";
    case "deleted":
      return "destructive";
    case "merged":
      return "secondary";
    default:
      return "outline";
  }
}

export function ContactsTable({
  rows,
  totalFiltered,
  filters,
  campaigns,
}: {
  rows: ContactRow[];
  totalFiltered: number;
  filters: { q?: string };
  campaigns: { id: string; name: string; status: string }[];
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allMatching, setAllMatching] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const allVisibleChecked =
    rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const someVisibleChecked = rows.some((r) => selectedIds.has(r.id));

  function toggleOne(id: string) {
    setAllMatching(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setAllMatching(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) {
        rows.forEach((r) => next.delete(r.id));
      } else {
        rows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setAllMatching(false);
  }

  const selectionCount = allMatching ? totalFiltered : selectedIds.size;

  return (
    <>
      <SelectionBar
        count={selectionCount}
        totalFiltered={totalFiltered}
        onSelectAllMatching={() => setAllMatching(true)}
        allMatchingActive={allMatching}
        onClear={clearSelection}
      >
        <Button type="button" size="sm" onClick={() => setDialogOpen(true)}>
          <Megaphone className="h-4 w-4" />
          Crear campaña
        </Button>
      </SelectionBar>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    aria-label="Seleccionar visibles"
                    checked={allVisibleChecked}
                    ref={(el) => {
                      if (el)
                        el.indeterminate =
                          someVisibleChecked && !allVisibleChecked;
                    }}
                    onChange={toggleAllVisible}
                  />
                </TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    {filters.q
                      ? `Sin resultados para "${filters.q}".`
                      : "Aún no hay contactos. Creá el primero."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="w-10">
                      <Checkbox
                        aria-label={`Seleccionar contacto ${r.id}`}
                        checked={selectedIds.has(r.id) || allMatching}
                        onChange={() => toggleOne(r.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/contactos/${r.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {fullName(r.first_name, r.last_name)}
                      </Link>
                    </TableCell>
                    <TableCell className="tabular-nums">{r.phone}</TableCell>
                    <TableCell>
                      {r.email || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(r.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <NewCampaignDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        source="contacts"
        scope={allMatching ? "all_matching" : "ids"}
        ids={allMatching ? [] : Array.from(selectedIds)}
        filters={filters}
        estimatedContacts={allMatching ? totalFiltered : selectedIds.size}
        campaigns={campaigns}
      />
    </>
  );
}

// Re-export para que el server page use el mismo badge helper si quiere
export { buttonVariants };
