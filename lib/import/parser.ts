import "server-only";
import * as XLSX from "xlsx";

export type SheetPreview = {
  name: string;
  totalRows: number;
  totalCols: number;
  headerRow: number; // 1-based
  headers: string[];
  sampleRows: Record<string, unknown>[]; // primeras 5 filas a partir del header
};

export function parseWorkbook(buffer: ArrayBuffer | Uint8Array) {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return XLSX.read(data, { type: "array", raw: true, cellDates: false });
}

export function previewSheets(
  wb: XLSX.WorkBook,
  desiredHeaderRow?: Record<string, number>,
): SheetPreview[] {
  return wb.SheetNames.map((name) => {
    const headerRow = desiredHeaderRow?.[name] ?? autoDetectHeaderRow(wb.Sheets[name]);
    return buildSheetPreview(name, wb.Sheets[name], headerRow);
  });
}

export function buildSheetPreview(
  name: string,
  ws: XLSX.WorkSheet,
  headerRow: number,
): SheetPreview {
  const ref = ws["!ref"];
  if (!ref) {
    return {
      name,
      totalRows: 0,
      totalCols: 0,
      headerRow,
      headers: [],
      sampleRows: [],
    };
  }
  const range = XLSX.utils.decode_range(ref);
  const totalRows = range.e.r + 1;
  const totalCols = range.e.c + 1;

  const headers = readRow(ws, headerRow - 1, range).map((v, i) =>
    v == null || String(v).trim() === "" ? `col_${i + 1}` : String(v).trim(),
  );

  const sampleRows: Record<string, unknown>[] = [];
  const sampleStart = headerRow; // row después del header, 0-based = headerRow
  const sampleEnd = Math.min(sampleStart + 5, range.e.r);
  for (let r = sampleStart; r <= sampleEnd; r++) {
    const row = readRow(ws, r, range);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? null;
    });
    sampleRows.push(obj);
  }

  return { name, totalRows, totalCols, headerRow, headers, sampleRows };
}

export function sheetToObjects(
  ws: XLSX.WorkSheet,
  headerRow: number,
): Record<string, unknown>[] {
  const ref = ws["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const headers = readRow(ws, headerRow - 1, range).map((v, i) =>
    v == null || String(v).trim() === "" ? `col_${i + 1}` : String(v).trim(),
  );
  const rows: Record<string, unknown>[] = [];
  for (let r = headerRow; r <= range.e.r; r++) {
    const row = readRow(ws, r, range);
    if (row.every((v) => v === null || v === "" || v === undefined)) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = normalizeCell(row[i]);
    });
    rows.push(obj);
  }
  return rows;
}

function readRow(
  ws: XLSX.WorkSheet,
  r: number,
  range: XLSX.Range,
): unknown[] {
  const out: unknown[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    out.push(cell ? cell.v : null);
  }
  return out;
}

// Si el teléfono vino como número científico (5.492E+12) lo guardamos como string entero.
function normalizeCell(v: unknown): unknown {
  if (v == null) return null;
  if (typeof v === "number") {
    // Heurística: números con más de 10 dígitos probablemente son teléfonos/ids mal tipados.
    const abs = Math.abs(v);
    if (Number.isInteger(v) || abs >= 1e10) {
      return String(Math.round(v));
    }
    return v;
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  }
  if (v instanceof Date) {
    return v.toISOString();
  }
  return v;
}

// Heurística simple: si la fila 1 tiene < 3 strings y la fila 3 tiene >= 3 strings,
// asumimos que el header real está en la fila 3 (como en las hojas de Detalle).
function autoDetectHeaderRow(ws: XLSX.WorkSheet): number {
  const ref = ws["!ref"];
  if (!ref) return 1;
  const range = XLSX.utils.decode_range(ref);
  const maxScan = Math.min(range.e.r, 5);
  let bestRow = 1;
  let bestCount = 0;
  for (let r = 0; r <= maxScan; r++) {
    const row = readRow(ws, r, range);
    const stringCount = row.filter(
      (v) => typeof v === "string" && v.trim().length > 0,
    ).length;
    if (stringCount > bestCount) {
      bestCount = stringCount;
      bestRow = r + 1; // 1-based
    }
  }
  return bestRow;
}
