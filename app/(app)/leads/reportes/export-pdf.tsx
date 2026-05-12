"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types (mirrors the server page types)                              */
/* ------------------------------------------------------------------ */

type MetaTotals = {
  budget: number;
  impressions: number;
  reach: number;
  clicks: number;
  messages: number;
  campaigns: number;
  cpm: number;
  cpc: number;
  cost_per_message: number;
};
type MetaCampaign = {
  name: string;
  project: string;
  month: string;
  budget: number;
  impressions: number;
  reach: number;
  clicks: number;
  messages: number;
};
type MetaSummary = {
  totals: MetaTotals;
  by_month: Array<{ month: string; budget: number; messages: number }>;
  by_project: Array<{ project: string; budget: number; messages: number }>;
  campaigns: MetaCampaign[];
};

type FunnelMonth = {
  month: string;
  inversion: number;
  mensajes_ads: number;
  contactos: number;
  leads_calificados: number;
  derivados: number;
  en_negociacion: number;
  vendidos: number;
  costo_por_lead: number;
  costo_por_derivado: number;
};
type FunnelTotals = {
  inversion: number;
  mensajes_ads: number;
  contactos: number;
  leads_calificados: number;
  derivados: number;
  en_negociacion: number;
  vendidos: number;
};
type FunnelData = { by_month: FunnelMonth[]; totals: FunnelTotals };

type BrokerDetail = {
  broker: string;
  total: number;
  derivados: number;
  en_negociacion: number;
  vendidos: number;
  con_feedback: number;
  sin_feedback: number;
  rechazados: number;
  efectividad: number;
};
type BrokerMonthlyData = { brokers: BrokerDetail[]; months: string[] };

type SummaryStats = {
  total: number;
  by_status: Array<{ status: string; count: number }>;
  by_project: Array<{ project: string; count: number }>;
  by_source: Array<{ source: string; count: number }>;
  by_feedback: Array<{ feedback: string; count: number }>;
};

export type ReportPdfData = {
  selectedMonths: string[];
  meta: MetaSummary;
  funnel: FunnelData;
  brokerData: BrokerMonthlyData;
  stats: SummaryStats;
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MONTH_LABELS: Record<string, string> = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre",
};

function fmtMonthFull(m: string) {
  const [y, mm] = m.split("-");
  return `${MONTH_LABELS[mm] ?? mm} ${y}`;
}

function fmtMonthShort(m: string) {
  const shorts: Record<string, string> = {
    "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr",
    "05": "May", "06": "Jun", "07": "Jul", "08": "Ago",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic",
  };
  const [y, mm] = m.split("-");
  return `${shorts[mm] ?? mm} ${y}`;
}

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

function fmtNum(n: number) {
  return n.toLocaleString("es-AR");
}

const STATUS_LABELS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Calificado",
  derivado: "Derivado",
  no_derivar: "No derivar",
  rechazado: "Rechazado",
};

/* ------------------------------------------------------------------ */
/*  PDF generation                                                     */
/* ------------------------------------------------------------------ */

async function generatePdf(data: ReportPdfData) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR;
  let y = 14;

  const { selectedMonths, meta, funnel, brokerData, stats } = data;
  const mt = meta.totals;
  const ft = funnel.totals;

  // Colors
  const darkBlue: [number, number, number] = [30, 58, 95];
  const medBlue: [number, number, number] = [59, 130, 246];
  const lightBg: [number, number, number] = [248, 250, 252];
  const borderColor: [number, number, number] = [226, 232, 240];

  // --- Title ---
  doc.setFillColor(...darkBlue);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("Dashboard de Leads — ZLT Desarrollos", marginL, 13);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Ads Meta  ·  Agente IA  ·  Derivación & Seguimiento", marginL, 20);

  const now = new Date();
  doc.setFontSize(8);
  doc.text(
    `Generado: ${now.toLocaleDateString("es-AR")} ${now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`,
    pageW - marginR,
    20,
    { align: "right" },
  );

  y = 34;

  // --- Context paragraph ---
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  const periodText =
    selectedMonths.length === 0
      ? "todos los meses disponibles"
      : selectedMonths.length <= 3
        ? selectedMonths.map(fmtMonthFull).join(", ")
        : `${selectedMonths.length} meses (${fmtMonthShort(selectedMonths[0])} a ${fmtMonthShort(selectedMonths[selectedMonths.length - 1])})`;

  const contextLines = doc.splitTextToSize(
    `Este reporte presenta un resumen integral del pipeline de leads de ZLT Desarrollos para el periodo: ${periodText}. ` +
    `Se analiza la inversión en pauta de Meta Ads, la conversión del agente de inteligencia artificial, y el desempeño ` +
    `de cada inmobiliaria en la derivación y seguimiento de prospectos. ` +
    `Total de leads en el periodo: ${fmtNum(stats.total)}. Inversión total en Meta: ${fmtMoney(ft.inversion)}.`,
    contentW,
  );
  doc.text(contextLines, marginL, y);
  y += contextLines.length * 4 + 4;

  // ------------------------------------------------------------------
  // SECTION 1: ADS META
  // ------------------------------------------------------------------
  doc.setDrawColor(...medBlue);
  doc.setLineWidth(0.8);
  doc.line(marginL, y, marginL + 40, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...darkBlue);
  doc.text("1. Ads Meta", marginL, y);
  y += 7;

  // KPIs row
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  const kpis = [
    ["Inversión", fmtMoney(mt.budget)],
    ["Impresiones", fmtNum(mt.impressions)],
    ["Alcance", fmtNum(mt.reach)],
    ["Clicks", fmtNum(mt.clicks)],
    ["Mensajes", fmtNum(mt.messages)],
    ["CPM", fmtMoney(mt.cpm)],
    ["CPC", fmtMoney(mt.cpc)],
    ["$/Mensaje", fmtMoney(mt.cost_per_message)],
  ];
  const kpiW = contentW / kpis.length;
  for (let i = 0; i < kpis.length; i++) {
    const x = marginL + i * kpiW;
    doc.setFillColor(...lightBg);
    doc.roundedRect(x, y, kpiW - 2, 14, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(kpis[i][0], x + 3, y + 5);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(kpis[i][1], x + 3, y + 11);
    doc.setFont("helvetica", "normal");
  }
  y += 18;

  // Campaigns table
  if (meta.campaigns.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      head: [["Campaña", "Proyecto", "Mes", "Inversión", "Impresiones", "Alcance", "Clicks", "Mensajes", "CPM"]],
      body: [
        ...meta.campaigns.map((c) => [
          c.name,
          c.project,
          fmtMonthShort(c.month),
          fmtMoney(c.budget),
          fmtNum(c.impressions),
          fmtNum(c.reach),
          fmtNum(c.clicks),
          fmtNum(c.messages),
          c.impressions > 0 ? fmtMoney((c.budget / c.impressions) * 1000) : "—",
        ]),
        ...(meta.campaigns.length > 1
          ? [
              [
                "TOTAL", "", "",
                fmtMoney(mt.budget),
                fmtNum(mt.impressions),
                fmtNum(mt.reach),
                fmtNum(mt.clicks),
                fmtNum(mt.messages),
                fmtMoney(mt.cpm),
              ],
            ]
          : []),
      ],
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: darkBlue, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 55 },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
        7: { halign: "right" },
        8: { halign: "right" },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // ------------------------------------------------------------------
  // SECTION 2: AGENTE IA & CONVERSION
  // ------------------------------------------------------------------
  if (y > 170) { doc.addPage(); y = 14; }

  doc.setDrawColor(147, 51, 234);
  doc.setLineWidth(0.8);
  doc.line(marginL, y, marginL + 40, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...darkBlue);
  doc.text("2. Agente IA & Conversión", marginL, y);
  y += 7;

  // Funnel KPIs
  const funnelKpis = [
    ["Contactos", fmtNum(ft.contactos)],
    ["Calificados", fmtNum(ft.leads_calificados)],
    ["Derivados", fmtNum(ft.derivados)],
    ["En negociación", fmtNum(ft.en_negociacion)],
    ["Vendidos", fmtNum(ft.vendidos)],
    ["$/Lead", ft.contactos > 0 ? fmtMoney(ft.inversion / ft.contactos) : "$0"],
    ["$/Derivado", ft.derivados > 0 ? fmtMoney(ft.inversion / ft.derivados) : "$0"],
  ];
  const fkpiW = contentW / funnelKpis.length;
  for (let i = 0; i < funnelKpis.length; i++) {
    const x = marginL + i * fkpiW;
    doc.setFillColor(...lightBg);
    doc.roundedRect(x, y, fkpiW - 2, 14, 1.5, 1.5, "F");
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(funnelKpis[i][0], x + 3, y + 5);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(funnelKpis[i][1], x + 3, y + 11);
    doc.setFont("helvetica", "normal");
  }
  y += 18;

  // Funnel visual (simple horizontal bars)
  const funnelSteps = [
    { label: "Mensajes Ads", value: ft.mensajes_ads, color: medBlue },
    { label: "Contactos", value: ft.contactos, color: [147, 51, 234] as [number, number, number] },
    { label: "Calificados", value: ft.leads_calificados, color: [99, 102, 241] as [number, number, number] },
    { label: "Derivados", value: ft.derivados, color: [6, 182, 212] as [number, number, number] },
    { label: "En negociación", value: ft.en_negociacion, color: [245, 158, 11] as [number, number, number] },
    { label: "Vendidos", value: ft.vendidos, color: [34, 197, 94] as [number, number, number] },
  ];
  const maxFunnel = Math.max(...funnelSteps.map((s) => s.value), 1);
  const barAreaW = contentW - 60;
  for (const step of funnelSteps) {
    const barW = Math.max(4, (step.value / maxFunnel) * barAreaW);
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(step.label, marginL, y + 4);
    doc.setFillColor(235, 238, 242);
    doc.roundedRect(marginL + 38, y, barAreaW, 6, 1, 1, "F");
    doc.setFillColor(...step.color);
    doc.roundedRect(marginL + 38, y, barW, 6, 1, 1, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(fmtNum(step.value), marginL + 38 + barAreaW + 2, y + 4.5);
    doc.setFont("helvetica", "normal");
    y += 8;
  }
  y += 4;

  // Gastos vs Leads table
  if (funnel.by_month.length > 0) {
    if (y > 150) { doc.addPage(); y = 14; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...darkBlue);
    doc.text("Gastos vs Leads por mes", marginL, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      head: [["Mes", "Inversión", "Msgs Ads", "Contactos", "Calificados", "Derivados", "Negociación", "Vendidos", "$/Lead", "$/Derivado"]],
      body: [
        ...funnel.by_month.map((r) => [
          fmtMonthShort(r.month),
          fmtMoney(r.inversion),
          fmtNum(r.mensajes_ads),
          fmtNum(r.contactos),
          fmtNum(r.leads_calificados),
          fmtNum(r.derivados),
          fmtNum(r.en_negociacion),
          fmtNum(r.vendidos),
          r.costo_por_lead > 0 ? fmtMoney(r.costo_por_lead) : "—",
          r.costo_por_derivado > 0 ? fmtMoney(r.costo_por_derivado) : "—",
        ]),
        ...(funnel.by_month.length > 1
          ? [[
              "TOTAL",
              fmtMoney(ft.inversion),
              fmtNum(ft.mensajes_ads),
              fmtNum(ft.contactos),
              fmtNum(ft.leads_calificados),
              fmtNum(ft.derivados),
              fmtNum(ft.en_negociacion),
              fmtNum(ft.vendidos),
              ft.contactos > 0 ? fmtMoney(ft.inversion / ft.contactos) : "—",
              ft.derivados > 0 ? fmtMoney(ft.inversion / ft.derivados) : "—",
            ]]
          : []),
      ],
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: darkBlue, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
        4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" },
        7: { halign: "right" }, 8: { halign: "right" }, 9: { halign: "right" },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Leads by status & project (side by side)
  if (y > 150) { doc.addPage(); y = 14; }
  const halfW = contentW / 2 - 4;

  if (stats.by_status.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...darkBlue);
    doc.text("Leads por estado", marginL, y);

    autoTable(doc, {
      startY: y + 3,
      margin: { left: marginL, right: pageW - marginL - halfW },
      head: [["Estado", "Cantidad"]],
      body: stats.by_status.map((s) => [STATUS_LABELS[s.status] ?? s.status, fmtNum(s.count)]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: darkBlue, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 1: { halign: "right" } },
    });
  }

  if (stats.by_project.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...darkBlue);
    doc.text("Leads por proyecto", marginL + halfW + 8, y);

    autoTable(doc, {
      startY: y + 3,
      margin: { left: marginL + halfW + 8, right: marginR },
      head: [["Proyecto", "Cantidad"]],
      body: stats.by_project.map((p) => [p.project, fmtNum(p.count)]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: darkBlue, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 1: { halign: "right" } },
    });
  }

  const tbl1Y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  y = tbl1Y + 8;

  // ------------------------------------------------------------------
  // SECTION 3: DERIVACION & SEGUIMIENTO
  // ------------------------------------------------------------------
  if (y > 140) { doc.addPage(); y = 14; }

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(marginL, y, marginL + 40, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...darkBlue);
  doc.text("3. Derivación & Seguimiento", marginL, y);
  y += 6;

  // Broker summary table
  if (brokerData.brokers.length > 0) {
    const brokerTotalD = brokerData.brokers.reduce((a, b) => a + b.derivados, 0);
    const brokerTotalVN = brokerData.brokers.reduce((a, b) => a + b.vendidos + b.en_negociacion, 0);

    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      head: [["Inmobiliaria", "Total", "Derivados", "Negociación", "Vendidos", "Rechazados", "Sin feedback", "Con feedback", "% Efectividad"]],
      body: [
        ...brokerData.brokers.map((b) => [
          b.broker,
          String(b.total),
          String(b.derivados),
          String(b.en_negociacion),
          String(b.vendidos),
          String(b.rechazados),
          String(b.sin_feedback),
          String(b.con_feedback),
          `${b.efectividad}%`,
        ]),
        ...(brokerData.brokers.length > 1
          ? [[
              "TOTAL",
              String(brokerData.brokers.reduce((a, b) => a + b.total, 0)),
              String(brokerTotalD),
              String(brokerData.brokers.reduce((a, b) => a + b.en_negociacion, 0)),
              String(brokerData.brokers.reduce((a, b) => a + b.vendidos, 0)),
              String(brokerData.brokers.reduce((a, b) => a + b.rechazados, 0)),
              String(brokerData.brokers.reduce((a, b) => a + b.sin_feedback, 0)),
              String(brokerData.brokers.reduce((a, b) => a + b.con_feedback, 0)),
              brokerTotalD > 0 ? `${((brokerTotalVN / brokerTotalD) * 100).toFixed(1)}%` : "0%",
            ]]
          : []),
      ],
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: darkBlue, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
        4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" },
        7: { halign: "right" }, 8: { halign: "right" },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  // Leads by source & feedback side by side
  if (y > 140) { doc.addPage(); y = 14; }

  if (stats.by_source.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...darkBlue);
    doc.text("Leads por fuente", marginL, y);

    autoTable(doc, {
      startY: y + 3,
      margin: { left: marginL, right: pageW - marginL - halfW },
      head: [["Fuente", "Cantidad"]],
      body: stats.by_source.slice(0, 10).map((s) => [s.source, fmtNum(s.count)]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: darkBlue, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 1: { halign: "right" } },
    });
  }

  if (stats.by_feedback.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...darkBlue);
    doc.text("Feedback de leads", marginL + halfW + 8, y);

    autoTable(doc, {
      startY: y + 3,
      margin: { left: marginL + halfW + 8, right: marginR },
      head: [["Feedback", "Cantidad"]],
      body: stats.by_feedback.map((f) => [f.feedback, fmtNum(f.count)]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: darkBlue, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 1: { halign: "right" } },
    });
  }

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // ------------------------------------------------------------------
  // GLOSSARY
  // ------------------------------------------------------------------
  if (y > 150) { doc.addPage(); y = 14; }

  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkBlue);
  doc.text("Glosario", marginL, y);
  y += 5;

  const glossary: [string, string][] = [
    ["Lead", "Persona que muestra interés en un producto/proyecto inmobiliario. Llega a través de pauta, formulario, WhatsApp, etc."],
    ["Contacto", "Lead registrado en el CRM con datos básicos verificados (nombre, teléfono y/o email)."],
    ["Calificado", "Lead que pasó el filtro del agente IA o del equipo comercial y cumple criterios mínimos de interés real."],
    ["Derivado", "Lead asignado a una inmobiliaria o broker para su gestión comercial directa."],
    ["En negociación", "Lead que el broker confirmó está en proceso activo de negociación (visita, cotización, etc.)."],
    ["Vendido", "Lead que concretó la compra o reserva de una unidad."],
    ["No derivar", "Lead descartado por el agente IA o el equipo, no cumple los criterios para derivación."],
    ["Rechazado", "Lead que la inmobiliaria rechazó o marcó como no viable."],
    ["CPM", "Costo por mil impresiones. Métrica estándar de pauta digital: (inversión / impresiones) × 1000."],
    ["CPC", "Costo por click. Inversión dividida por la cantidad de clicks generados."],
    ["$/Mensaje", "Costo por mensaje recibido en la plataforma (WhatsApp/Messenger) desde la pauta de Meta Ads."],
    ["$/Lead", "Costo por lead generado. Inversión total dividida por la cantidad de contactos registrados."],
    ["$/Derivado", "Costo por lead derivado. Inversión total dividida por la cantidad de leads asignados a brokers."],
    ["% Efectividad", "Porcentaje de leads derivados a un broker que terminan en negociación o venta: (vendidos + en negociación) / derivados."],
    ["Feedback", "Respuesta del broker sobre el estado del lead (vendido, en negociación, no interesado, sin feedback, etc.)."],
    ["Sin feedback", "Leads derivados que el broker aún no ha actualizado con un estado o comentario."],
    ["Agente IA", "Bot de inteligencia artificial que atiende y califica leads automáticamente por WhatsApp antes de derivarlos."],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [["Término", "Descripción"]],
    body: glossary,
    styles: { fontSize: 7, cellPadding: 2.5 },
    headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold" },
      1: { cellWidth: contentW - 30 },
    },
  });

  // Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text("ZLT Desarrollos — Marketing CRM", marginL, pH - 6);
    doc.text(`Página ${i} de ${totalPages}`, pageW - marginR, pH - 6, { align: "right" });
  }

  // Save
  const monthStr = selectedMonths.length > 0
    ? `${selectedMonths[0]}_${selectedMonths[selectedMonths.length - 1]}`
    : "todos";
  doc.save(`reporte-leads-${monthStr}.pdf`);
}

/* ------------------------------------------------------------------ */
/*  Button component                                                   */
/* ------------------------------------------------------------------ */

export function ExportPdfButton({ data }: { data: ReportPdfData }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await generatePdf(data);
    } catch (e) {
      console.error("Error generating PDF:", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Exportar PDF
    </Button>
  );
}
