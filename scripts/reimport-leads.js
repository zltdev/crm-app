const XLSX = require("xlsx");
const https = require("https");

const SUPABASE_URL = "https://ydtipyfbbcvhqyzodsno.supabase.co";
const SUPABASE_KEY = "sb_publishable_OVWIEZXXJH_Ppqx31pMwTg_ZgkwEApB";
const EXCEL = "C:/Users/ClaudioIA/Downloads/Reporte_Leads_v3 1.xlsx";

const wb = XLSX.readFile(EXCEL);
const ws = wb.Sheets["Lead ZLT"];
const rows = XLSX.utils.sheet_to_json(ws);

console.log(`Read ${rows.length} rows from Lead ZLT`);

function normalizePhone(raw) {
  if (!raw) return null;
  return String(raw).replace(/[^0-9]/g, "") || null;
}

function excelDate(v) {
  if (!v) return null;
  if (typeof v === "string") {
    if (/^\d{4}-\d{2}/.test(v)) return v;
    return null;
  }
  if (typeof v === "number") {
    const d = new Date((v - 25569) * 86400000);
    return d.toISOString();
  }
  return null;
}

function normalizeStatus(raw, row) {
  if (!raw) return { status: "nuevo", broker: null };
  const s = raw.trim();
  const lower = s.toLowerCase();

  // Derivado + broker extraction
  const derivMatch = s.match(/^Derivado\s+(.+)$/i);
  if (derivMatch) {
    let broker = derivMatch[1].trim();
    // Normalize broker names
    const bl = broker.toLowerCase();
    if (bl.includes("qala")) broker = "Qala";
    else if (bl.includes("crestale")) broker = "Crestale";
    else if (bl.includes("spiaggi")) broker = "Marco Spiaggi";
    else if (bl === "zejda" || bl.includes("marcos zejda") || bl.includes("marcos sejda")) broker = "Zejda";
    else if (bl === "manu turner" || bl === "manuel turner") broker = "Manuel Turner";
    else if (bl === "gino zavanella" || bl === "gino") broker = "Gino Zavanella";
    else if (bl === "rinesi") broker = "Rinesi";
    return { status: "derivado", broker };
  }

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
  if (!raw) return null;
  const p = raw.trim();
  const lower = p.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (lower.includes("alamos") || lower.includes("álamos")) return "Alamos";
  if (lower === "pivm" || lower.includes("parque industrial") || lower.includes("vaca muerta")) return "PIVM";
  if (lower.includes("nodo")) return "Nodo Flex";
  if (lower.includes("lumina")) return "Lumina Funes";
  if (lower.includes("onix")) return "Onix";
  if (lower.includes("condo")) return "Condo Funes";
  if (lower === "zlt") return "ZLT";
  if (p.length > 30) return "Otro";
  return p;
}

function normalizeFeedback(raw) {
  if (!raw) return null;
  const f = raw.trim();
  if (!f || f === "Sin feedback") return null;
  return f;
}

const leads = [];
for (const row of rows) {
  const name = row["Nombre"];
  if (!name) continue;

  const phone = String(row["Teléfono"] || "").trim() || null;
  const phoneNorm = normalizePhone(phone);
  const { status, broker } = normalizeStatus(row["Estado del Lead"], row);
  const project = normalizeProject(row["Proyecto"]);
  const feedback = normalizeFeedback(row["Feedback"]);
  const month = row["Mes"] || null;
  const isDup = String(row["Duplicado"] || "").toLowerCase() === "sí";

  leads.push({
    name: String(name).trim(),
    phone: phone,
    phone_normalized: phoneNorm,
    email: row["Mail"] ? String(row["Mail"]).trim() : null,
    locality: row["Localidad"] ? String(row["Localidad"]).trim() : null,
    contacted_at: excelDate(row["Fecha contacto"]) || new Date().toISOString(),
    reception: row["Recepción"] ? String(row["Recepción"]).trim() : null,
    contact_medium: row["Medio Contacto"] ? String(row["Medio Contacto"]).trim() : null,
    lead_source: row["Fuente del Lead"] ? String(row["Fuente del Lead"]).trim() : null,
    interest: row["Interés"] ? String(row["Interés"]).trim() : null,
    project,
    status,
    broker_name: broker || (row["Inmobiliaria"] ? String(row["Inmobiliaria"]).trim() : null),
    broker_email: row["Inmobiliaria Email"] ? String(row["Inmobiliaria Email"]).trim() : null,
    derived_at: excelDate(row["Fecha derivación"]),
    accepted_at: excelDate(row["Fecha Aceptación"]),
    followup_3d: row["Seguimiento 3 días"] ? String(row["Seguimiento 3 días"]).trim() : null,
    feedback,
    feedback_at: excelDate(row["Feedback Fecha"]),
    request_summary: row["Solicitó"] ? String(row["Solicitó"]).trim().substring(0, 2000) : null,
    progress: row["Avance"] ? String(row["Avance"]).trim() : null,
    is_duplicate: isDup,
    data_source: row["Fuente"] ? String(row["Fuente"]).trim() : null,
    month,
  });
}

console.log(`Normalized ${leads.length} leads`);

// Stats
const statCounts = {};
leads.forEach(l => { statCounts[l.status] = (statCounts[l.status] || 0) + 1; });
console.log("Status breakdown:", statCounts);
const projCounts = {};
leads.forEach(l => { projCounts[l.project || "null"] = (projCounts[l.project || "null"] || 0) + 1; });
console.log("Project breakdown:", projCounts);
const brokerCounts = {};
leads.filter(l => l.broker_name).forEach(l => { brokerCounts[l.broker_name] = (brokerCounts[l.broker_name] || 0) + 1; });
console.log("Broker breakdown:", brokerCounts);

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
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${out}`));
        else resolve(out);
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  // Step 1: Delete all existing leads
  console.log("Deleting existing leads...");
  await supabaseRequest("DELETE", "/rest/v1/leads?id=not.is.null");
  console.log("Deleted all leads.");

  // Step 2: Insert in batches
  const BATCH = 50;
  let inserted = 0;
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    await supabaseRequest("POST", "/rest/v1/leads", batch);
    inserted += batch.length;
    process.stdout.write(`\rInserted ${inserted}/${leads.length}`);
  }
  console.log("\nDone! Total:", inserted);
}

run().catch(console.error);
