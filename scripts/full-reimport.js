#!/usr/bin/env node
/**
 * full-reimport.js
 *
 * Complete data reimport following the correct architecture:
 *
 * Excel has TWO main data sources:
 *   Lead_Brutos (2,458 rows) = agent conversations (chatbot/WhatsApp)
 *   Lead ZLT    (1,446 rows) = manual tracking / derivation data
 *
 * Import creates:
 *   contacts              <- unified from BOTH sheets, deduped by phone
 *   agent_conversations   <- one per Lead_Brutos entry
 *   contact_touchpoints   <- one per Lead_Brutos entry (source_type='agent')
 *   leads                 <- one per Lead ZLT entry (linked to contact)
 */

const XLSX = require("xlsx");
const https = require("https");
const { randomUUID } = require("crypto");

const SUPABASE_URL = "https://ydtipyfbbcvhqyzodsno.supabase.co";
const SUPABASE_KEY = "sb_publishable_OVWIEZXXJH_Ppqx31pMwTg_ZgkwEApB";
const EXCEL = "C:/Users/ClaudioIA/Downloads/Reporte_Leads_v4 1.xlsx";

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function normalizePhone(raw) {
  if (!raw) return null;
  let d = String(raw).replace(/[^0-9]/g, "");
  if (!d) return null;
  if (d.startsWith("549") && d.length > 10) d = d.slice(3);
  else if (d.startsWith("54") && d.length > 10) d = d.slice(2);
  return d || null;
}

function normalizeEmail(raw) {
  if (!raw) return null;
  const e = String(raw).trim().toLowerCase();
  return e.includes("@") ? e : null;
}

function excelDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}/.test(v)) return new Date(v).toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof v === "number") {
    const d = new Date((v - 25569) * 86400000);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

function monthFromDate(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function str(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function cleanMeta(obj) {
  const r = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v != null && v !== "") r[k] = v;
  }
  return r;
}

// ── Normalization ──

function normalizeBroker(raw) {
  if (raw == null) return null;
  const bl = String(raw).trim().toLowerCase();
  if (bl.includes("qala")) return "Qala";
  if (bl.includes("crestale")) return "Crestale";
  if (bl.includes("spiaggi")) return "Marco Spiaggi";
  if (bl === "zejda" || bl.includes("marcos zejda") || bl.includes("marcos sejda")) return "Zejda";
  if (bl === "manu turner" || bl === "manuel turner") return "Manuel Turner";
  if (bl === "gino zavanella" || bl === "gino") return "Gino Zavanella";
  if (bl === "rinesi") return "Rinesi";
  return raw.trim();
}

function normalizeStatus(raw) {
  if (raw == null || raw === "") return { status: "nuevo", broker: null };
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  const m = s.match(/^Derivado\s+(.+)$/i);
  if (m) return { status: "derivado", broker: normalizeBroker(m[1]) };
  if (lower === "falta derivar") return { status: "falta_derivar", broker: null };
  if (lower === "no derivar" || lower === "no derivado") return { status: "no_derivar", broker: null };
  if (lower === "nuevo" || lower === "new") return { status: "nuevo", broker: null };
  if (lower === "rechazado") return { status: "rechazado", broker: null };
  if (lower === "resuelto") return { status: "resuelto", broker: null };
  if (lower === "no contactado") return { status: "no_contactado", broker: null };
  if (lower === "reclamo") return { status: "reclamo", broker: null };
  if (lower.startsWith("derivado")) return { status: "derivado", broker: null };
  return { status: "nuevo", broker: null };
}

function normalizeProject(raw) {
  if (raw == null || raw === "") return null;
  const p = String(raw).trim();
  const l = p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (l.includes("alamos")) return "Alamos";
  if (l === "pivm" || l.includes("parque industrial") || l.includes("vaca muerta")) return "PIVM";
  if (l.includes("nodo")) return "Nodo Flex";
  if (l.includes("lumina")) return "Lumina Funes";
  if (l.includes("onix")) return "Onix";
  if (l.includes("condo")) return "Condo Funes";
  if (l === "zlt") return "ZLT";
  if (p.length > 30) return "Otro";
  return p;
}

function normalizeLeadSource(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  const l = s.toLowerCase();
  if (l === "form" || l === "formulario web" || l === "form web") return "Formulario Web";
  if (l === "lbre" || l === "libre") return "Libre";
  if (l === "2" || l === "indeterminado") return "Indeterminado";
  if (l === "wpp" || l === "whatsapp") return "WhatsApp";
  return s;
}

function normalizeFeedback(raw) {
  if (raw == null || raw === "") return null;
  const f = String(raw).trim();
  return (!f || f === "Sin feedback") ? null : f;
}

// ═══════════════════════════════════════════════════════
// SUPABASE REST API
// ═══════════════════════════════════════════════════════

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SUPABASE_URL);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
    };
    const req = https.request(opts, (res) => {
      let out = "";
      res.on("data", (c) => (out += c));
      res.on("end", () => {
        if (res.statusCode >= 400) reject(new Error(`${method} ${path} -> ${res.statusCode}: ${out}`));
        else resolve(out);
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function batchInsert(table, rows, batchSize = 50) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await supabaseRequest("POST", `/rest/v1/${table}`, batch);
    inserted += batch.length;
    process.stdout.write(`\r  ${table}: ${inserted}/${rows.length}`);
  }
  console.log();
  return inserted;
}

// ═══════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════

async function run() {
  console.log("=====================================================");
  console.log("  FULL REIMPORT: Lead_Brutos + Lead ZLT -> CRM");
  console.log("=====================================================\n");

  // ── Phase 0: Read Excel ──────────────────────────────
  console.log("Phase 0: Reading Excel...");
  const wb = XLSX.readFile(EXCEL);
  console.log("  Sheets found:", wb.SheetNames.join(", "));

  const wsBrutos = wb.Sheets["Lead_Brutos"];
  if (!wsBrutos) throw new Error("Sheet 'Lead_Brutos' not found!");
  const brutoRows = XLSX.utils.sheet_to_json(wsBrutos);

  const wsZLT = wb.Sheets["Lead ZLT"];
  if (!wsZLT) throw new Error("Sheet 'Lead ZLT' not found!");
  const zltRows = XLSX.utils.sheet_to_json(wsZLT);

  console.log(`  Lead_Brutos raw rows: ${brutoRows.length}`);
  console.log(`  Lead ZLT raw rows:    ${zltRows.length}`);

  // ── Phase 1: Process Lead_Brutos ─────────────────────
  console.log("\nPhase 1: Processing Lead_Brutos...");
  const brutoEntries = [];
  let brutoSkipped = 0;

  for (const row of brutoRows) {
    const name = str(row["name"]);
    const phone = str(row["phone"]);
    if (!name && !phone) { brutoSkipped++; continue; }

    const phoneNorm = normalizePhone(phone);
    const createdOn = excelDate(row["created_on"]);

    brutoEntries.push({
      name,
      phone: phone || "",
      phone_normalized: phoneNorm,
      email: str(row["email"]),
      email_normalized: normalizeEmail(row["email"]),
      created_on: createdOn,
      month: monthFromDate(createdOn),
      origin: str(row["origin"]),
      tags: str(row["tags"]),
      wa_id: str(row["wa_id"]),
      tg_id: str(row["tg_id"]),
      conversation_id: str(row["conversation_id"]),
      fuente: str(row["Fuente"]),
      original_id: str(row["id"]),
    });
  }
  console.log(`  Valid: ${brutoEntries.length}  |  Skipped (empty): ${brutoSkipped}`);

  // ── Phase 2: Process Lead ZLT ────────────────────────
  console.log("\nPhase 2: Processing Lead ZLT...");
  const zltEntries = [];
  let zltSkipped = 0;

  for (const row of zltRows) {
    const name = str(row["Nombre"]);
    if (!name) { zltSkipped++; continue; }

    const phone = str(row["Teléfono"]) || str(row["Telefono"]);
    const phoneNorm = normalizePhone(phone);
    const { status, broker } = normalizeStatus(row["Estado del Lead"]);

    zltEntries.push({
      name,
      phone: phone || "",
      phone_normalized: phoneNorm,
      email: str(row["Mail"]),
      email_normalized: normalizeEmail(row["Mail"]),
      locality: str(row["Localidad"]),
      contacted_at: excelDate(row["Fecha contacto"]) || new Date().toISOString(),
      reception: str(row["Recepción"]) || str(row["Recepcion"]),
      contact_medium: str(row["Medio Contacto"]),
      lead_source: normalizeLeadSource(row["Fuente del Lead"]),
      interest: str(row["Interés"]) || str(row["Interes"]),
      project: normalizeProject(row["Proyecto"]),
      status,
      broker_name: broker || normalizeBroker(str(row["Inmobiliaria"])),
      broker_email: str(row["Inmobiliaria Email"]),
      derived_at: excelDate(row["Fecha derivación"] || row["Fecha derivacion"]),
      accepted_at: excelDate(row["Fecha Aceptación"] || row["Fecha Aceptacion"]),
      followup_3d: str(row["Seguimiento 3 días"] || row["Seguimiento 3 dias"]),
      feedback: normalizeFeedback(row["Feedback"]),
      feedback_at: excelDate(row["Feedback Fecha"]),
      request_summary: str(row["Solicitó"] || row["Solicito"])
        ? String(row["Solicitó"] || row["Solicito"]).trim().substring(0, 2000)
        : null,
      progress: str(row["Avance"]),
      data_source: str(row["Fuente"]),
      month: str(row["Mes"]),
    });
  }
  console.log(`  Valid: ${zltEntries.length}  |  Skipped (empty): ${zltSkipped}`);

  // ── Phase 3: Build unified contact map ───────────────
  console.log("\nPhase 3: Building unified contact map (dedup by phone)...");

  // Map<phone_normalized, ContactRecord>
  const contactMap = new Map();
  const noPhoneContacts = [];

  // Pass 1: Lead_Brutos entries
  for (const be of brutoEntries) {
    if (be.phone_normalized) {
      if (!contactMap.has(be.phone_normalized)) {
        contactMap.set(be.phone_normalized, {
          id: randomUUID(),
          phone: be.phone,
          phone_normalized: be.phone_normalized,
          email: be.email,
          email_normalized: be.email_normalized,
          first_name: be.name,
          source: "Lead_Brutos",
          bruto: [be],
          zlt: [],
        });
      } else {
        contactMap.get(be.phone_normalized).bruto.push(be);
      }
    } else if (be.name) {
      noPhoneContacts.push({
        id: randomUUID(),
        phone: "",
        phone_normalized: null,
        email: be.email,
        email_normalized: be.email_normalized,
        first_name: be.name,
        source: "Lead_Brutos",
        bruto: [be],
        zlt: [],
      });
    }
  }

  // Pass 2: Lead ZLT entries — merge or create
  let merged = 0, zltOnly = 0;
  for (const ze of zltEntries) {
    if (ze.phone_normalized && contactMap.has(ze.phone_normalized)) {
      const c = contactMap.get(ze.phone_normalized);
      // Prefer ZLT name/email (more complete tracking)
      c.first_name = ze.name || c.first_name;
      c.email = ze.email || c.email;
      c.email_normalized = ze.email_normalized || c.email_normalized;
      c.source = "Both";
      c.zlt.push(ze);
      merged++;
    } else if (ze.phone_normalized) {
      contactMap.set(ze.phone_normalized, {
        id: randomUUID(),
        phone: ze.phone,
        phone_normalized: ze.phone_normalized,
        email: ze.email,
        email_normalized: ze.email_normalized,
        first_name: ze.name,
        source: "Lead_ZLT",
        bruto: [],
        zlt: [ze],
      });
      zltOnly++;
    } else {
      noPhoneContacts.push({
        id: randomUUID(),
        phone: "",
        phone_normalized: null,
        email: ze.email,
        email_normalized: ze.email_normalized,
        first_name: ze.name,
        source: "Lead_ZLT",
        bruto: [],
        zlt: [ze],
      });
      zltOnly++;
    }
  }

  const allContacts = [...contactMap.values(), ...noPhoneContacts];

  // Deduplicate email_normalized to avoid unique-index violations
  const seenEmails = new Set();
  for (const c of allContacts) {
    if (c.email_normalized) {
      if (seenEmails.has(c.email_normalized)) {
        c.email_normalized = null; // keep email display, drop normalized
      } else {
        seenEmails.add(c.email_normalized);
      }
    }
  }

  const fromBruto = allContacts.filter((c) => c.source === "Lead_Brutos").length;
  const fromZLT = allContacts.filter((c) => c.source === "Lead_ZLT").length;
  const fromBoth = allContacts.filter((c) => c.source === "Both").length;

  console.log(`  Total unique contacts: ${allContacts.length}`);
  console.log(`    Only in Lead_Brutos: ${fromBruto}`);
  console.log(`    Only in Lead ZLT:    ${fromZLT}`);
  console.log(`    In BOTH sheets:      ${fromBoth}`);
  console.log(`    Without phone:       ${noPhoneContacts.length}`);

  // ── Phase 4: Build agent_conversations + touchpoints ─
  console.log("\nPhase 4: Building agent conversations & touchpoints...");
  const agentConvRows = [];
  const touchpointRows = [];

  for (const c of allContacts) {
    for (const be of c.bruto) {
      const convId = randomUUID();
      const channel = be.wa_id ? "whatsapp" : be.tg_id ? "telegram" : "whatsapp";
      const occurredAt = be.created_on || new Date().toISOString();

      agentConvRows.push({
        id: convId,
        contact_id: c.id,
        channel,
        started_at: occurredAt,
        metadata: cleanMeta({
          original_id: be.original_id,
          origin: be.origin,
          tags: be.tags,
          wa_id: be.wa_id,
          tg_id: be.tg_id,
          external_conversation_id: be.conversation_id,
          fuente: be.fuente,
        }),
      });

      touchpointRows.push({
        id: randomUUID(),
        contact_id: c.id,
        source_type: "agent",
        source_name: "Lead_Brutos",
        agent_conversation_id: convId,
        occurred_at: occurredAt,
        metadata: cleanMeta({
          month: be.month,
          origin: be.origin,
          tags: be.tags,
        }),
      });
    }
  }
  console.log(`  Agent conversations: ${agentConvRows.length}`);
  console.log(`  Touchpoints:         ${touchpointRows.length}`);

  // ── Phase 5: Build leads ─────────────────────────────
  console.log("\nPhase 5: Building leads from Lead ZLT...");
  const leadRows = [];

  for (const c of allContacts) {
    for (const ze of c.zlt) {
      leadRows.push({
        id: randomUUID(),
        contact_id: c.id,
        name: ze.name,
        phone: ze.phone || null,
        phone_normalized: ze.phone_normalized,
        email: ze.email,
        locality: ze.locality,
        contacted_at: ze.contacted_at,
        reception: ze.reception,
        contact_medium: ze.contact_medium,
        lead_source: ze.lead_source,
        project: ze.project,
        status: ze.status,
        broker_name: ze.broker_name,
        broker_email: ze.broker_email,
        derived_at: ze.derived_at,
        accepted_at: ze.accepted_at,
        followup_3d: ze.followup_3d,
        feedback: ze.feedback,
        feedback_at: ze.feedback_at,
        request_summary: ze.request_summary,
        interest: ze.interest,
        progress: ze.progress,
        is_duplicate: false,
        data_source: ze.data_source,
        month: ze.month,
      });
    }
  }
  console.log(`  Leads: ${leadRows.length}`);

  // ── Pre-insert stats ─────────────────────────────────
  console.log("\n--- Pre-insert breakdown ---");

  const statusCt = {};
  leadRows.forEach((l) => (statusCt[l.status] = (statusCt[l.status] || 0) + 1));
  console.log("  Status:", JSON.stringify(statusCt));

  const projCt = {};
  leadRows.forEach((l) => (projCt[l.project || "(null)"] = (projCt[l.project || "(null)"] || 0) + 1));
  console.log("  Project:", JSON.stringify(projCt));

  const brokerCt = {};
  leadRows.filter((l) => l.broker_name).forEach((l) => (brokerCt[l.broker_name] = (brokerCt[l.broker_name] || 0) + 1));
  console.log("  Broker:", JSON.stringify(brokerCt));

  const srcCt = {};
  leadRows.forEach((l) => (srcCt[l.lead_source || "(null)"] = (srcCt[l.lead_source || "(null)"] || 0) + 1));
  console.log("  Source:", JSON.stringify(srcCt));

  const monthCt = {};
  leadRows.forEach((l) => (monthCt[l.month || "(null)"] = (monthCt[l.month || "(null)"] || 0) + 1));
  console.log("  Month:", JSON.stringify(monthCt));

  // ── Phase 6: Clear existing data ─────────────────────
  console.log("\n--- Phase 6: Clearing existing data ---");

  process.stdout.write("  Deleting leads...");
  await supabaseRequest("DELETE", "/rest/v1/leads?id=not.is.null");
  console.log(" OK");

  process.stdout.write("  Deleting contact_touchpoints...");
  await supabaseRequest("DELETE", "/rest/v1/contact_touchpoints?id=not.is.null");
  console.log(" OK");

  process.stdout.write("  Deleting agent_conversations...");
  await supabaseRequest("DELETE", "/rest/v1/agent_conversations?id=not.is.null");
  console.log(" OK");

  process.stdout.write("  Deleting contacts...");
  await supabaseRequest("DELETE", "/rest/v1/contacts?id=not.is.null");
  console.log(" OK");

  // ── Phase 7: Insert data ─────────────────────────────
  console.log("\n--- Phase 7: Inserting data ---");

  const contactInsertRows = allContacts.map((c) => ({
    id: c.id,
    phone: c.phone || "",
    phone_normalized: c.phone_normalized || null,
    email: c.email || null,
    first_name: c.first_name,
    status: "active",
  }));

  console.log("  Inserting contacts...");
  await batchInsert("contacts", contactInsertRows);

  console.log("  Inserting agent_conversations...");
  await batchInsert("agent_conversations", agentConvRows);

  console.log("  Inserting contact_touchpoints...");
  await batchInsert("contact_touchpoints", touchpointRows);

  console.log("  Inserting leads...");
  await batchInsert("leads", leadRows);

  // ── Done ─────────────────────────────────────────────
  console.log("\n=====================================================");
  console.log("  IMPORT COMPLETE");
  console.log("=====================================================");
  console.log(`  Contacts:             ${contactInsertRows.length}`);
  console.log(`  Agent Conversations:  ${agentConvRows.length}`);
  console.log(`  Touchpoints:          ${touchpointRows.length}`);
  console.log(`  Leads:                ${leadRows.length}`);
  console.log("=====================================================\n");
}

run().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
