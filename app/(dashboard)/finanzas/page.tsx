import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { FinanzasClient } from "@/components/finanzas/FinanzasClient";

export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/proyectos");

  const [invoices, clients, services, wsRows, banks, categories, prospects, quotes, expenses] = await Promise.all([
    sql`
      SELECT
        i.id, i.invoice_number, i.status, i.currency, i.notes,
        i.tax_rate, i.tax_amount, i.subtotal, i.total, i.client_id,
        i.company, i.bank_account_id,
        to_char(i.issue_date, 'YYYY-MM-DD') AS issue_date,
        to_char(i.due_date,   'YYYY-MM-DD') AS due_date,
        CASE WHEN c.id IS NOT NULL THEN json_build_object('id',c.id,'name',c.name,'color',c.color) END AS client
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
      ORDER BY i.created_at DESC
    `,
    sql`SELECT id, name, color, email, company FROM clients ORDER BY name`,
    sql`SELECT * FROM services ORDER BY name`,
    sql`SELECT usd_to_dop_rate FROM workspace_settings LIMIT 1`,
    sql`
      SELECT ba.id, ba.name, ba.type, ba.currency, ba.color, ba.is_active,
        COALESCE(ba.initial_balance, 0) AS initial_balance,
        COALESCE(SUM(CASE WHEN ip.currency='USD' THEN ip.amount ELSE 0 END),0) AS received_usd,
        COALESCE(SUM(CASE WHEN ip.currency='DOP' THEN ip.amount ELSE 0 END),0) AS received_dop
      FROM bank_accounts ba
      LEFT JOIN invoice_payments ip ON ip.bank_account_id = ba.id
      WHERE ba.is_active = true
      GROUP BY ba.id ORDER BY ba.name
    `.catch(() => []),
    sql`SELECT * FROM expense_categories ORDER BY name`.catch(() => []),
    sql`SELECT id, name, company, stage, value, currency FROM prospects ORDER BY created_at DESC`.catch(() => []),
    sql`
      SELECT
        q.id, q.quote_number, q.status, q.currency, q.company,
        q.tax_rate, q.tax_amount, q.subtotal, q.total,
        q.converted_to_invoice_id,
        to_char(q.issue_date,  'YYYY-MM-DD') AS issue_date,
        to_char(q.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        CASE WHEN c.id IS NOT NULL THEN json_build_object('id',c.id,'name',c.name,'color',c.color) END AS client
      FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
      ORDER BY q.created_at DESC
    `.catch(() => []),
    sql`
      SELECT e.id, e.company, e.description, e.amount, e.currency, e.type,
        e.attachment_url, e.attachment_name, e.notes, e.category_id, e.bank_account_id,
        to_char(e.date,'YYYY-MM-DD') AS date,
        CASE WHEN ec.id IS NOT NULL THEN json_build_object('id',ec.id,'name',ec.name,'color',ec.color) END AS category,
        CASE WHEN ba.id IS NOT NULL THEN json_build_object('id',ba.id,'name',ba.name,'type',ba.type) END AS bank_account
      FROM expenses e
      LEFT JOIN expense_categories ec ON ec.id = e.category_id
      LEFT JOIN bank_accounts ba ON ba.id = e.bank_account_id
      ORDER BY e.date DESC, e.created_at DESC
    `.catch(() => []),
  ]);

  const exchangeRate = Number((wsRows[0] as any)?.usd_to_dop_rate ?? 60.50);

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Finanzas" subtitle="Facturación y servicios" />
      <FinanzasClient
        initialInvoices={invoices as any[]}
        clients={clients as any[]}
        initialServices={services as any[]}
        exchangeRate={exchangeRate}
        initialBanks={banks as any[]}
        initialCategories={categories as any[]}
        initialExpenses={expenses as any[]}
        initialProspects={prospects as any[]}
        initialQuotes={quotes as any[]}
      />
    </div>
  );
}
