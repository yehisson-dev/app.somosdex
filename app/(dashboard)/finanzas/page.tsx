import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { FinanzasClient } from "@/components/finanzas/FinanzasClient";

export const dynamic = "force-dynamic";

export default async function FinanzasPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/proyectos");

  const [invoices, clients, services, wsRows] = await Promise.all([
    sql`
      SELECT
        i.id, i.invoice_number, i.status, i.currency, i.notes,
        i.tax_rate, i.tax_amount, i.subtotal, i.total, i.client_id,
        to_char(i.issue_date, 'YYYY-MM-DD') AS issue_date,
        to_char(i.due_date,   'YYYY-MM-DD') AS due_date,
        CASE WHEN c.id IS NOT NULL THEN json_build_object('id',c.id,'name',c.name,'color',c.color) END AS client
      FROM invoices i LEFT JOIN clients c ON c.id = i.client_id
      ORDER BY i.created_at DESC
    `,
    sql`SELECT id, name, color, email, company FROM clients ORDER BY name`,
    sql`SELECT * FROM services ORDER BY name`,
    sql`SELECT usd_to_dop_rate FROM workspace_settings LIMIT 1`,
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
      />
    </div>
  );
}
