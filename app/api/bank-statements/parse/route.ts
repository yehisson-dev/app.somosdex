import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { parseStatement, type RawTransaction } from "@/lib/bank-parsers";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ClassifiedTransaction extends RawTransaction {
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  suggested_invoice_id: string | null;
  suggested_invoice_number: string | null;
  suggested_transfer_account_id: string | null;
  suggested_company: string;
  ai_note: string;
  action: "expense" | "income" | "transfer" | "ignore";
  confirmed: boolean;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const bankAccountId = formData.get("bank_account_id") as string | null;

  if (!file) return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  let transactions: RawTransaction[];

  try {
    transactions = parseStatement(buffer, file.name);
  } catch (e: any) {
    return NextResponse.json({ error: "Error al parsear el archivo: " + e.message }, { status: 400 });
  }

  if (transactions.length === 0) {
    return NextResponse.json({ error: "No se encontraron transacciones en el archivo" }, { status: 400 });
  }

  // Load context for AI: categories, invoices, company names
  const [categories, invoices] = await Promise.all([
    sql`SELECT id, name FROM expense_categories ORDER BY name`,
    sql`
      SELECT i.id, i.invoice_number, i.total, i.currency, i.status,
        to_char(i.issue_date,'YYYY-MM-DD') AS issue_date,
        c.name AS client_name
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
      WHERE i.status IN ('sent','draft')
      ORDER BY i.created_at DESC LIMIT 50
    `.catch(() => []),
  ]);

  // Load bank accounts for transfer matching
  const bankAccounts = await sql`SELECT id, name FROM bank_accounts WHERE is_active = true ORDER BY name`.catch(() => []);

  // AI classification
  const classified = await classifyWithAI(transactions, categories as any[], invoices as any[], bankAccounts as any[]);

  return NextResponse.json({
    transactions: classified,
    categories,
    invoices,
    bankAccounts,
  });
}

async function classifyWithAI(
  txns: RawTransaction[],
  categories: { id: string; name: string }[],
  invoices: { id: string; invoice_number: string; total: number; currency: string; client_name: string; status: string }[],
  bankAccounts: { id: string; name: string }[]
): Promise<ClassifiedTransaction[]> {

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return txns.map(t => ({
      ...t,
      suggested_category_id: null,
      suggested_category_name: null,
      suggested_invoice_id: null,
      suggested_invoice_number: null,
      suggested_transfer_account_id: null,
      suggested_company: "DEX",
      ai_note: "Clasificación manual requerida (sin clave AI configurada)",
      action: t.type === "credit" ? "income" : "expense",
      confirmed: false,
    }));
  }

  const client = new Anthropic({ apiKey });

  const catList  = categories.map(c => `- ${c.id}: ${c.name}`).join("\n");
  const invList  = invoices.map(i =>
    `- ${i.id}: ${i.invoice_number} | ${i.client_name} | ${i.total} ${i.currency} | ${i.status}`
  ).join("\n");
  const bankList = bankAccounts.map(b => `- ${b.id}: ${b.name}`).join("\n");

  const txnList = txns.map((t, i) =>
    `${i}: [${t.type.toUpperCase()}] ${t.date} | ${t.amount} DOP | ${t.description}`
  ).join("\n");

  const prompt = `Eres un asistente contable para una agencia de marketing digital dominicana llamada DEX/CUBO/YEHISSON.
Analiza estas transacciones bancarias y clasifícalas.

CATEGORÍAS DE GASTOS DISPONIBLES:
${catList || "Sin categorías configuradas"}

FACTURAS PENDIENTES DE COBRO:
${invList || "Sin facturas pendientes"}

CUENTAS BANCARIAS PROPIAS:
${bankList || "Sin cuentas registradas"}

TRANSACCIONES A CLASIFICAR:
${txnList}

Para cada transacción retorna un JSON array con este formato exacto:
[
  {
    "idx": 0,
    "action": "expense"|"income"|"transfer"|"ignore",
    "suggested_category_id": "uuid o null",
    "suggested_category_name": "nombre o null",
    "suggested_invoice_id": "uuid o null",
    "suggested_invoice_number": "INV-XXXX o null",
    "suggested_transfer_account_id": "uuid de cuenta bancaria propia o null",
    "suggested_company": "DEX"|"CUBO"|"YEHISSON",
    "ai_note": "breve razón de la clasificación"
  }
]

Reglas:
- TRANSFERENCIAS INTERNAS (action="transfer"): Cuando el dinero se mueve entre cuentas propias del mismo dueño. Señales: mención de "ahorros", "prestamos", "fiduciario", "PENALO", "YEHISSON" como destinatario/origen en la descripción, o retiros de cajero para depositar en otra cuenta. En suggested_transfer_account_id pon el id de la cuenta contraparte si la puedes identificar por nombre, sino null.
- Créditos (ingresos, action="income"): pagos de clientes. Si el monto coincide aproximadamente con una factura pendiente, sugiere vincularla.
- Débitos (gastos, action="expense"): pagos a terceros. Clasifica en la categoría más apropiada.
- Impuestos DGII, comisiones bancarias → categoría de impuestos/comisiones si existe.
- Nómina/pagos a personas (JEAN, AMIRLA, nombres propios) → categoría de nómina/personal si existe.
- Pagos de servicios digitales (Facebook, PayPal, GoDaddy, Meta Ads, FACEBK) → categoría de publicidad/marketing si existe.
- Comidas/supermercados (SM, BRAVO, VENTANIA, CAFETERIA) → categoría de alimentación si existe.
- action="ignore": solo para duplicados obvios o errores de banco.
- suggested_company: si la descripción menciona "CUBO" usa CUBO, si menciona "DEX" usa DEX, sino usa DEX por defecto.
- Responde SOLO el JSON array, sin texto adicional.`;

  try {
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const content = (msg.content[0] as any).text as string;
    // Extract JSON array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("No JSON in response");
    const aiResults: any[] = JSON.parse(match[0]);

    return txns.map((t, i) => {
      const ai = aiResults.find(r => r.idx === i) ?? {};
      return {
        ...t,
        suggested_category_id:        ai.suggested_category_id        ?? null,
        suggested_category_name:      ai.suggested_category_name      ?? null,
        suggested_invoice_id:         ai.suggested_invoice_id         ?? null,
        suggested_invoice_number:     ai.suggested_invoice_number     ?? null,
        suggested_transfer_account_id: ai.suggested_transfer_account_id ?? null,
        suggested_company:            ai.suggested_company            ?? "DEX",
        ai_note:                      ai.ai_note                      ?? "",
        action:                       ai.action                       ?? (t.type === "credit" ? "income" : "expense"),
        confirmed:                    false,
      };
    });
  } catch (err) {
    console.error("AI classification error:", err);
    // Fallback to rule-based
    return txns.map(t => ({
      ...t,
      suggested_category_id: null,
      suggested_category_name: null,
      suggested_invoice_id: null,
      suggested_invoice_number: null,
      suggested_transfer_account_id: null,
      suggested_company: "DEX",
      ai_note: "Error en clasificación AI — revisa manualmente",
      action: t.type === "credit" ? "income" : "expense",
      confirmed: false,
    }));
  }
}
