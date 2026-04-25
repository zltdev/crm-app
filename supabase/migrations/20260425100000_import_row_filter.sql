-- Filtro opcional por valor de columna a nivel de batch.
-- Si el batch tiene row_filter, en commit se descartan las filas que no
-- matchean (se marcan como skipped con reason=filtered_out).
alter table public.import_batches
  add column if not exists row_filter jsonb;

comment on column public.import_batches.row_filter is
  'Filtro opcional aplicado en commit: { column: text, operator: "in"|"not_in", values: text[] }. Si no matchea, la fila se marca como skipped con reason=filtered_out.';
