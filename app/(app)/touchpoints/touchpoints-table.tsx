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
import { Button } from "@/components/ui/button";
import { SelectionBar } from "@/components/crm/selection-bar";
import { SourceBadge } from "@/components/crm/source-badge";
import { NewCampaignDialog } from "@/components/crm/new-campaign-dialog";
import { formatDateTime, fullName } from "@/lib/utils";

export type TouchpointRow = {
  id: string;
  source_type: string;
  source_name: string | null;
  occurred_at: string;
  campaign_id: string | null;
  event_id: string | null;
  expo_id: string | null;
  form_id: string | null;
  contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    phone: string;
    email: string | null;
  } | null;
};

type Filters = {
  source_type?: string;
  from?: string;
  to?: string;
  contact?: string;
};

function contextLabel(r: TouchpointRow): string {
  const bits: string[] = [];
  if (r.campaign_id) bits.push("Campaña");
  if (r.event_id) bits.push("Evento");
  if (r.expo_id) bits.push("Expo");
  if (r.form_id) bits.push("Formulario");
  return bits.join(" · ");
}

export function TouchpointsTable({
  rows,
  totalFiltered,
  filters,
  campaigns,
}: {
  rows: TouchpointRow[];
  totalFiltered: number;
  filters: Filters;
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
        <Button
          type="button"
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
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
                    aria-label="Seleccionar todos los visibles"
                    checked={allVisibleChecked}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          someVisibleChecked && !allVisibleChecked;
                      }
                    }}
                    onChange={toggleAllVisible}
                  />
                </TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead>Contexto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Sin touchpoints para estos filtros.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="w-10">
                      <Checkbox
                        aria-label={`Seleccionar touchpoint ${r.id}`}
                        checked={selectedIds.has(r.id) || allMatching}
                        onChange={() => toggleOne(r.id)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/touchpoints/${r.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {formatDateTime(r.occurred_at)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {r.contact ? (
                        <Link
                          href={`/contactos/${r.contact.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          <span className="font-medium">
                            {fullName(
                              r.contact.first_name,
                              r.contact.last_name,
                            )}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {r.contact.phone}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <SourceBadge type={r.source_type} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.source_name || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {contextLabel(r) || "—"}
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
        source="touchpoints"
        scope={allMatching ? "all_matching" : "ids"}
        ids={allMatching ? [] : Array.from(selectedIds)}
        filters={filters}
        estimatedContacts={allMatching ? totalFiltered : selectedIds.size}
        campaigns={campaigns}
      />
    </>
  );
}
