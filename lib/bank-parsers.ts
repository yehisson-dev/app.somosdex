import * as XLSX from "xlsx";

export interface RawTransaction {
  date: string;        // YYYY-MM-DD
  description: string;
  amount: number;      // always positive
  type: "credit" | "debit";
  reference?: string;
  balance?: number;
}

// ─── Normalize date ────────────────────────────────────────────────────────────
function parseDate(raw: string): string {
  if (!raw) return "";
  raw = String(raw).trim();
  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("/");
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  // DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split("-");
    return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // Excel serial number
  const n = Number(raw);
  if (!isNaN(n) && n > 40000 && n < 60000) {
    const d = XLSX.SSF.parse_date_code(n);
    return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  return raw;
}

function cleanAmount(raw: string | number): number {
  if (typeof raw === "number") return Math.abs(raw);
  const s = String(raw).replace(/["']/g, "").replace(/,/g, "").trim();
  return Math.abs(parseFloat(s) || 0);
}

// ─── Banco Popular CSV ─────────────────────────────────────────────────────────
// Two sections separated by blank line; first = créditos, second = débitos
// Headers: Fecha Posteo,Descripción Corta,Monto Transacción,Balance ,No. Referencia,No. Serial,Descripción
function parsePopularCSV(text: string): RawTransaction[] {
  const lines = text.split(/\r?\n/);
  const txns: RawTransaction[] = [];
  let currentType: "credit" | "debit" = "credit";
  let inData = false;

  for (const line of lines) {
    const raw = line.trim();
    if (!raw) { inData = false; continue; }

    // Section header line (contains the column headers)
    if (raw.startsWith("Fecha Posteo,")) {
      inData = true;
      continue;
    }
    if (!inData) continue;

    const cols = raw.split(",");
    if (cols.length < 3) continue;

    const dateStr = cols[0]?.trim();
    const shortDesc = cols[1]?.trim() ?? "";
    const amountStr = cols[2]?.trim() ?? "0";
    const balance = parseFloat((cols[3] ?? "0").trim()) || 0;
    const reference = cols[4]?.trim() ?? "";
    const longDesc = cols[6]?.trim() ?? "";

    if (!dateStr || !dateStr.includes("/")) continue;

    // Determine type from description
    if (shortDesc.toLowerCase().includes("crédito") || shortDesc.toLowerCase().includes("credito")) {
      currentType = "credit";
    } else {
      currentType = "debit";
    }

    txns.push({
      date: parseDate(dateStr),
      description: longDesc || shortDesc,
      amount: cleanAmount(amountStr),
      type: currentType,
      reference,
      balance,
    });
  }
  return txns;
}

// ─── Banreservas XLS ──────────────────────────────────────────────────────────
// Columns: Fecha | Descripción | (empty) | Débito | (empty) | Crédito | (empty) | Balance
// Amounts as strings: "-11,464.68" for debits, "60,000.00" for credits
function parseBanreservasXLS(rows: any[][]): RawTransaction[] {
  const txns: RawTransaction[] = [];
  // Find header row: contains "Fecha" and ("Débito" or "Crédito")
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(c => String(c ?? "").trim());
    if (row.some(c => /^fecha$/i.test(c)) && row.some(c => /débito|credito|crédito/i.test(c))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return txns;

  const headers = rows[headerIdx].map(c => String(c ?? "").trim().toLowerCase());
  const fechaIdx   = headers.findIndex(h => h === "fecha");
  const descIdx    = headers.findIndex(h => /descripción|descripcion/i.test(h));
  const debitoIdx  = headers.findIndex(h => /débito$|debito$/i.test(h));
  const creditoIdx = headers.findIndex(h => /crédito$|credito$/i.test(h));
  const balanceIdx = headers.findIndex(h => /balance/i.test(h));

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const dateRaw = String(row[fechaIdx] ?? "").trim();
    if (!dateRaw || dateRaw === "") continue;
    const date = parseDate(dateRaw);
    if (!date) continue;

    const description = String(row[descIdx] ?? "").trim();
    const debitoRaw  = String(row[debitoIdx]  ?? "").trim();
    const creditoRaw = String(row[creditoIdx] ?? "").trim();
    const balance    = cleanAmount(row[balanceIdx] ?? 0);

    const debitoAmt  = cleanAmount(debitoRaw);
    const creditoAmt = cleanAmount(creditoRaw);

    if (creditoAmt > 0) {
      txns.push({ date, description, amount: creditoAmt, type: "credit", balance });
    } else if (debitoAmt > 0) {
      txns.push({ date, description, amount: debitoAmt, type: "debit", balance });
    }
  }
  return txns;
}

// ─── BHD / Generic XLSX ───────────────────────────────────────────────────────
// Columns: Fecha | Número de Referencia | (empty) | Descripción | Débitos | Créditos | Balance
function parseBHDXLSX(rows: any[][]): RawTransaction[] {
  const txns: RawTransaction[] = [];
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(c => String(c ?? "").trim().toLowerCase());
    if (row.some(c => /^fecha$/.test(c)) && row.some(c => /débit|debit/i.test(c))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return txns;

  const headers    = rows[headerIdx].map(c => String(c ?? "").trim().toLowerCase());
  const fechaIdx   = headers.findIndex(h => h === "fecha");
  const descIdx    = headers.findIndex(h => /descripción|descripcion/i.test(h));
  const refIdx     = headers.findIndex(h => /referencia|referenc/i.test(h));
  const debitoIdx  = headers.findIndex(h => /^débit|^debit/i.test(h));
  const creditoIdx = headers.findIndex(h => /^crédit|^credit/i.test(h));
  const balanceIdx = headers.findIndex(h => /balance/i.test(h));

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const dateRaw = String(row[fechaIdx] ?? "").trim();
    if (!dateRaw) continue;
    const date = parseDate(dateRaw);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const description = String(row[descIdx] ?? "").trim();
    const reference   = refIdx >= 0 ? String(row[refIdx] ?? "").trim() : undefined;
    const debitoAmt  = cleanAmount(row[debitoIdx]  ?? 0);
    const creditoAmt = cleanAmount(row[creditoIdx] ?? 0);
    const balance    = cleanAmount(row[balanceIdx]  ?? 0);

    if (creditoAmt > 0) {
      txns.push({ date, description, amount: creditoAmt, type: "credit", reference, balance });
    } else if (debitoAmt > 0) {
      txns.push({ date, description, amount: debitoAmt, type: "debit", reference, balance });
    }
  }
  return txns;
}

// ─── Main entry point ─────────────────────────────────────────────────────────
export function parseStatement(buffer: Buffer, filename: string): RawTransaction[] {
  const name = filename.toLowerCase();

  // CSV → Banco Popular
  if (name.endsWith(".csv")) {
    return parsePopularCSV(buffer.toString("utf-8"));
  }

  // XLS / XLSX → parse with xlsx library
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // Detect by sheet name or column structure
  if (sheetName === "AccountMovements") return parseBanreservasXLS(rows);
  if (sheetName === "Movements")        return parseBHDXLSX(rows);

  // Fallback: try both parsers
  const r1 = parseBanreservasXLS(rows);
  if (r1.length > 0) return r1;
  return parseBHDXLSX(rows);
}
