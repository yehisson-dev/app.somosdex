"use client";

import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Landmark, Receipt, FileText, Users, DollarSign, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Invoice {
  id: string; status: string; currency: string; total: number;
  company?: string; issue_date?: string;
}
interface BankAccount {
  id: string; name: string; type: string; currency: string; color: string;
  initial_balance: number; received_usd: number; received_dop: number;
}
interface Expense {
  id: string; type: "projected" | "real"; amount: number; currency: string;
  company?: string; category_id?: string | null;
  category?: { id: string; name: string; color: string } | null;
}
interface ExpenseCategory { id: string; name: string; color: string }
interface Prospect {
  id: string; name: string; company?: string; stage: string;
  value: number; currency: string;
}

const STAGES: Record<string, { label: string; color: string; order: number }> = {
  contacto:    { label: "Contacto",    color: "#94a3b8", order: 1 },
  calificado:  { label: "Calificado",  color: "#60a5fa", order: 2 },
  propuesta:   { label: "Propuesta",   color: "#a78bfa", order: 3 },
  negociacion: { label: "Negociación", color: "#f59e0b", order: 4 },
  ganado:      { label: "Ganado",      color: "#10b981", order: 5 },
  perdido:     { label: "Perdido",     color: "#ef4444", order: 6 },
};

const COMPANY_COLOR: Record<string, string> = {
  CUBO: "#6366f1", DEX: "#8b5cf6", YEHISSON: "#ec4899",
};
const COMPANIES = ["CUBO", "DEX", "YEHISSON"] as const;

const STATUS_COLOR: Record<string, string> = {
  draft: "#94a3b8", sent: "#60a5fa", paid: "#10b981", cancelled: "#ef4444",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador", sent: "Enviada", paid: "Pagada", cancelled: "Cancelada",
};

function fmtCur(n: number, cur = "DOP") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}
function fmtShort(n: number, cur = "DOP") {
  if (n >= 1_000_000) return `${fmtCur(n / 1_000_000, cur).replace(/\D+$/, "")}M`;
  if (n >= 1_000) return `${fmtCur(n / 1_000, cur).replace(/\D+$/, "")}K`;
  return fmtCur(n, cur);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DashboardView({
  invoices, banks, expenses, categories, prospects, exchangeRate,
}: {
  invoices: Invoice[];
  banks: BankAccount[];
  expenses: Expense[];
  categories: ExpenseCategory[];
  prospects: Prospect[];
  exchangeRate: number;
}) {
  const [filterCompany, setFilterCompany] = useState<string>("");

  function toDOP(amount: number, currency: string) {
    if (currency === "USD") return amount * exchangeRate;
    return amount;
  }
  function toUSD(amount: number, currency: string) {
    if (currency === "DOP") return amount / exchangeRate;
    return amount;
  }

  // Apply company filter to invoices + expenses
  const filtInvoices = filterCompany
    ? invoices.filter(i => (i.company ?? "DEX") === filterCompany)
    : invoices;
  const filtExpenses = filterCompany
    ? expenses.filter(e => (e.company ?? "DEX") === filterCompany)
    : expenses;

  // ── Invoice metrics ────────────────────────────────────────────────────────
  const usdInvoices = filtInvoices.filter(i => i.currency === "USD");
  const dopInvoices = filtInvoices.filter(i => i.currency === "DOP");

  const facturadoUSD = usdInvoices.reduce((s, i) => s + Number(i.total), 0);
  const facturadoDOP = dopInvoices.reduce((s, i) => s + Number(i.total), 0);

  const cobradoUSD = usdInvoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
  const cobradoDOP = dopInvoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);

  const porCobrarUSD = usdInvoices.filter(i => ["draft","sent"].includes(i.status)).reduce((s,i) => s + Number(i.total), 0);
  const porCobrarDOP = dopInvoices.filter(i => ["draft","sent"].includes(i.status)).reduce((s,i) => s + Number(i.total), 0);

  // By status for the funnel
  const statusGroups = Object.fromEntries(
    ["draft","sent","paid","cancelled"].map(s => [
      s,
      {
        count: filtInvoices.filter(i => i.status === s).length,
        usd: filtInvoices.filter(i => i.status === s && i.currency === "USD").reduce((a,i)=>a+Number(i.total),0),
        dop: filtInvoices.filter(i => i.status === s && i.currency === "DOP").reduce((a,i)=>a+Number(i.total),0),
      }
    ])
  );

  // ── Bank balances ──────────────────────────────────────────────────────────
  const filtBanks = banks; // banks not filtered by company
  const bankTotalUSD = filtBanks
    .filter(b => b.currency === "USD")
    .reduce((s,b) => s + Number(b.initial_balance) + Number(b.received_usd), 0);
  const bankTotalDOP = filtBanks
    .filter(b => b.currency === "DOP")
    .reduce((s,b) => s + Number(b.initial_balance) + Number(b.received_dop), 0);
  // Also add USD bank's DOP received and vice versa (edge case, usually 0)
  const bankDOPFromUSDBank = filtBanks.filter(b=>b.currency==="USD").reduce((s,b)=>s+Number(b.received_dop),0);
  const bankUSDFromDOPBank = filtBanks.filter(b=>b.currency==="DOP").reduce((s,b)=>s+Number(b.received_usd),0);

  // ── Expense metrics ────────────────────────────────────────────────────────
  const realExpensesDOP  = filtExpenses.filter(e => e.type === "real")     .reduce((s,e) => s + toDOP(Number(e.amount),e.currency), 0);
  const projExpensesDOP  = filtExpenses.filter(e => e.type === "projected") .reduce((s,e) => s + toDOP(Number(e.amount),e.currency), 0);

  // ── Resultado neto ─────────────────────────────────────────────────────────
  const cobradoDOP_total = cobradoDOP + cobradoUSD * exchangeRate;
  const resultadoNeto    = cobradoDOP_total - realExpensesDOP;

  // ── Ingresos by company (paid invoices) ────────────────────────────────────
  const incomeByCompany = COMPANIES.map(co => {
    const invs = invoices.filter(i => i.status === "paid" && (i.company ?? "DEX") === co);
    const dop = invs.reduce((s,i) => s + toDOP(Number(i.total), i.currency), 0);
    return { company: co, dop };
  });
  const maxCompanyDOP = Math.max(...incomeByCompany.map(c => c.dop), 1);

  // ── Gastos vs Proyectado by category ──────────────────────────────────────
  const catComparison = categories.map(cat => {
    const real = filtExpenses.filter(e=>e.type==="real"      && e.category_id===cat.id).reduce((s,e)=>s+toDOP(Number(e.amount),e.currency),0);
    const proj = filtExpenses.filter(e=>e.type==="projected" && e.category_id===cat.id).reduce((s,e)=>s+toDOP(Number(e.amount),e.currency),0);
    return { cat, real, proj };
  }).filter(r => r.real > 0 || r.proj > 0);
  const maxCatVal = Math.max(...catComparison.flatMap(r=>[r.real,r.proj]), 1);

  // ── CRM Pipeline ──────────────────────────────────────────────────────────
  const activeProspects = prospects.filter(p => !["ganado","perdido"].includes(p.stage));
  const pipelineUSD = activeProspects.filter(p=>p.currency==="USD").reduce((s,p)=>s+Number(p.value),0);
  const pipelineDOP = activeProspects.filter(p=>p.currency==="DOP").reduce((s,p)=>s+Number(p.value),0);

  const pipelineByStage = ["contacto","calificado","propuesta","negociacion","ganado","perdido"].map(st => {
    const ps = prospects.filter(p => p.stage === st);
    const val = ps.reduce((s,p) => s + toDOP(Number(p.value), p.currency), 0);
    return { stage: st, count: ps.length, val };
  }).filter(r => r.count > 0);
  const maxStageVal = Math.max(...pipelineByStage.map(r => r.val), 1);

  // ── Top bank list ──────────────────────────────────────────────────────────
  const bankList = banks.map(b => ({
    ...b,
    totalBalance: b.currency === "USD"
      ? Number(b.initial_balance) + Number(b.received_usd)
      : Number(b.initial_balance) + Number(b.received_dop),
  })).sort((a,b) => toDOP(b.totalBalance, b.currency) - toDOP(a.totalBalance, a.currency));

  // ── Total facturado equivalent ─────────────────────────────────────────────
  const totalFacDOP = facturadoDOP + facturadoUSD * exchangeRate;

  return (
    <div className="space-y-6">

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-medium">Filtrar por empresa:</span>
        {(["", ...COMPANIES] as const).map(c => (
          <button key={c} onClick={() => setFilterCompany(c as string)}
            className={cn("px-3 py-1 rounded-full text-xs font-semibold transition-colors border",
              filterCompany === c
                ? "text-white border-transparent"
                : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
            )}
            style={filterCompany === c && c
              ? { backgroundColor: COMPANY_COLOR[c], borderColor: COMPANY_COLOR[c] }
              : filterCompany === c ? { backgroundColor: "#6b7280" } : {}}>
            {c || "Todas"}
          </button>
        ))}
      </div>

      {/* ── Row 1 — Main KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Facturación Total"
          icon={<FileText className="w-4 h-4" />}
          iconColor="text-violet-600" iconBg="bg-violet-50"
          lines={[
            facturadoUSD > 0 && { value: fmtCur(facturadoUSD,"USD"), sub: "USD" },
            facturadoDOP > 0 && { value: fmtCur(facturadoDOP,"DOP"), sub: "DOP" },
          ].filter(Boolean) as any[]}
          footer={`${filtInvoices.length} facturas`}
        />
        <KPICard
          label="Ingresos Cobrados"
          icon={<TrendingUp className="w-4 h-4" />}
          iconColor="text-emerald-600" iconBg="bg-emerald-50"
          lines={[
            cobradoUSD > 0 && { value: fmtCur(cobradoUSD,"USD"), sub: "USD", color: "text-emerald-700" },
            cobradoDOP > 0 && { value: fmtCur(cobradoDOP,"DOP"), sub: "DOP", color: "text-emerald-700" },
            cobradoUSD === 0 && cobradoDOP === 0 && { value: "Sin cobros", sub: "", color: "text-gray-400" },
          ].filter(Boolean) as any[]}
          footer={totalFacDOP > 0 ? `${Math.round(cobradoDOP_total/totalFacDOP*100)}% cobrado` : "0% cobrado"}
          footerColor={cobradoDOP_total > 0 ? "text-emerald-600" : "text-gray-400"}
        />
        <KPICard
          label="Por Cobrar"
          icon={<AlertCircle className="w-4 h-4" />}
          iconColor="text-amber-600" iconBg="bg-amber-50"
          lines={[
            porCobrarUSD > 0 && { value: fmtCur(porCobrarUSD,"USD"), sub: "USD", color: "text-amber-700" },
            porCobrarDOP > 0 && { value: fmtCur(porCobrarDOP,"DOP"), sub: "DOP", color: "text-amber-700" },
            porCobrarUSD === 0 && porCobrarDOP === 0 && { value: "Al día", sub: "", color: "text-gray-400" },
          ].filter(Boolean) as any[]}
          footer={`${statusGroups.draft?.count ?? 0} borradores · ${statusGroups.sent?.count ?? 0} enviadas`}
        />
        <KPICard
          label="Balance en Bancos"
          icon={<Landmark className="w-4 h-4" />}
          iconColor="text-blue-600" iconBg="bg-blue-50"
          lines={[
            bankTotalUSD + bankUSDFromDOPBank > 0 && { value: fmtCur(bankTotalUSD + bankUSDFromDOPBank,"USD"), sub: "USD", color: "text-blue-700" },
            bankTotalDOP + bankDOPFromUSDBank > 0 && { value: fmtCur(bankTotalDOP + bankDOPFromUSDBank,"DOP"), sub: "DOP", color: "text-blue-700" },
            bankTotalUSD + bankTotalDOP === 0 && { value: "Sin cuentas", sub: "", color: "text-gray-400" },
          ].filter(Boolean) as any[]}
          footer={`${banks.length} cuenta${banks.length !== 1 ? "s" : ""}`}
        />
      </div>

      {/* ── Row 2 — Operations KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          label="Gasto Real"
          icon={<TrendingDown className="w-4 h-4" />}
          iconColor="text-red-600" iconBg="bg-red-50"
          lines={[{ value: fmtCur(realExpensesDOP), sub: "DOP equiv.", color: "text-red-700" }]}
          footer={projExpensesDOP > 0 ? `${Math.round(realExpensesDOP/projExpensesDOP*100)}% del presupuesto` : "Sin presupuesto"}
          footerColor={realExpensesDOP > projExpensesDOP ? "text-red-600" : "text-gray-500"}
        />
        <KPICard
          label="Presupuesto"
          icon={<Receipt className="w-4 h-4" />}
          iconColor="text-indigo-600" iconBg="bg-indigo-50"
          lines={[{ value: fmtCur(projExpensesDOP), sub: "DOP equiv.", color: "text-indigo-700" }]}
          footer={realExpensesDOP > projExpensesDOP
            ? `Exceso: ${fmtCur(realExpensesDOP - projExpensesDOP)}`
            : projExpensesDOP > 0 ? `Disponible: ${fmtCur(projExpensesDOP - realExpensesDOP)}` : "Sin proyecciones"}
          footerColor={realExpensesDOP > projExpensesDOP ? "text-red-500" : "text-emerald-600"}
        />
        <KPICard
          label="Pipeline CRM"
          icon={<Users className="w-4 h-4" />}
          iconColor="text-pink-600" iconBg="bg-pink-50"
          lines={[
            pipelineUSD > 0 && { value: fmtCur(pipelineUSD,"USD"), sub: "USD activo", color: "text-pink-700" },
            pipelineDOP > 0 && { value: fmtCur(pipelineDOP,"DOP"), sub: "DOP activo", color: "text-pink-700" },
            pipelineUSD === 0 && pipelineDOP === 0 && { value: "Sin pipeline", sub: "", color: "text-gray-400" },
          ].filter(Boolean) as any[]}
          footer={`${activeProspects.length} prospectos activos`}
        />
        <KPICard
          label="Resultado Neto"
          icon={<DollarSign className="w-4 h-4" />}
          iconColor={resultadoNeto >= 0 ? "text-emerald-600" : "text-red-600"}
          iconBg={resultadoNeto >= 0 ? "bg-emerald-50" : "bg-red-50"}
          lines={[{
            value: fmtCur(Math.abs(resultadoNeto)),
            sub: resultadoNeto >= 0 ? "ganancia (DOP)" : "pérdida (DOP)",
            color: resultadoNeto >= 0 ? "text-emerald-700" : "text-red-700",
          }]}
          footer="Cobrado − Gastos reales"
          footerColor={resultadoNeto >= 0 ? "text-emerald-600" : "text-red-600"}
        />
      </div>

      {/* ── Row 3 — Two columns ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Estado de facturas */}
        <ChartCard title="Estado de Facturas">
          <div className="space-y-3">
            {["paid","sent","draft","cancelled"].map(st => {
              const g = statusGroups[st] ?? { count: 0, usd: 0, dop: 0 };
              const totalDOP = g.dop + g.usd * exchangeRate;
              const pct = totalFacDOP > 0 ? totalDOP / totalFacDOP * 100 : 0;
              return (
                <div key={st}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[st] }} />
                      <span className="text-xs text-gray-600">{STATUS_LABEL[st]}</span>
                      <span className="text-[10px] text-gray-400">({g.count})</span>
                    </div>
                    <div className="text-right text-xs">
                      {g.usd > 0 && <span className="text-gray-600 mr-2">{fmtCur(g.usd,"USD")}</span>}
                      {g.dop > 0 && <span className="text-gray-600">{fmtCur(g.dop,"DOP")}</span>}
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: STATUS_COLOR[st] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Ingresos por empresa */}
        <ChartCard title="Ingresos por Empresa (cobrado)">
          {cobradoDOP + cobradoUSD === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin ingresos cobrados aún</p>
          ) : (
            <div className="space-y-4">
              {incomeByCompany.filter(c => c.dop > 0).map(({ company, dop }) => (
                <div key={company}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COMPANY_COLOR[company] }} />
                      <span className="text-sm font-semibold text-gray-700">{company}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: COMPANY_COLOR[company] }}>
                      {fmtCur(dop)}
                    </span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${dop / maxCompanyDOP * 100}%`, backgroundColor: COMPANY_COLOR[company] }} />
                  </div>
                </div>
              ))}
              {incomeByCompany.every(c => c.dop === 0) && (
                <p className="text-sm text-gray-400 text-center py-8">Sin cobros asignados a empresas</p>
              )}
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Row 4 — Gastos vs Proyectado ── */}
      {catComparison.length > 0 && (
        <ChartCard title="Gastos: Real vs Proyectado por Categoría">
          <div className="space-y-4">
            {catComparison.map(({ cat, real, proj }) => (
              <div key={cat.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm text-gray-700">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-amber-600 font-semibold">Real: {fmtCur(real)}</span>
                    <span className="text-blue-600">Proy: {fmtCur(proj)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-amber-500 shrink-0">Real</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${real / maxCatVal * 100}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-12 text-[10px] text-blue-500 shrink-0">Proy.</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-400 transition-all"
                        style={{ width: `${proj / maxCatVal * 100}%` }} />
                    </div>
                  </div>
                </div>
                {real > proj && proj > 0 && (
                  <p className="text-[10px] text-red-500 mt-1 text-right">
                    ↑ {fmtCur(real - proj)} sobre presupuesto
                  </p>
                )}
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* ── Row 5 — Two columns: Banks + CRM ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Balance por banco */}
        <ChartCard title="Balance por Cuenta">
          {bankList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay cuentas creadas</p>
          ) : (
            <div className="space-y-3">
              {bankList.map(b => {
                const ICONS: Record<string,string> = { bank:"🏦", cash:"💵", paypal:"🅿️", stripe:"💳", other:"💰" };
                const valDOP = toDOP(b.totalBalance, b.currency);
                const maxDOP = Math.max(...bankList.map(x => toDOP(x.totalBalance, x.currency)), 1);
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span>{ICONS[b.type] ?? "💰"}</span>
                        <span className="text-sm text-gray-700">{b.name}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-700">
                        {fmtCur(b.totalBalance, b.currency)}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${valDOP / maxDOP * 100}%`, backgroundColor: b.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        {/* Pipeline CRM por etapa */}
        <ChartCard title="Pipeline CRM por Etapa">
          {pipelineByStage.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay prospectos en el CRM</p>
          ) : (
            <div className="space-y-3">
              {pipelineByStage.map(({ stage, count, val }) => {
                const cfg = STAGES[stage] ?? { label: stage, color: "#6b7280" };
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                        <span className="text-sm text-gray-700">{cfg.label}</span>
                        <span className="text-[10px] text-gray-400">({count})</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: cfg.color }}>
                        {val > 0 ? fmtCur(val) : "—"}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${val > 0 ? val / maxStageVal * 100 : 8}%`, backgroundColor: cfg.color }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-gray-100 flex justify-between text-xs text-gray-500 mt-2">
                <span>Pipeline activo</span>
                <span className="font-semibold">
                  {pipelineUSD > 0 && fmtCur(pipelineUSD,"USD")}
                  {pipelineUSD > 0 && pipelineDOP > 0 && " · "}
                  {pipelineDOP > 0 && fmtCur(pipelineDOP,"DOP")}
                </span>
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ── Footer note ── */}
      <p className="text-[11px] text-gray-400 text-center pb-2">
        Tipo de cambio: RD$ {exchangeRate.toFixed(2)} por USD · Gastos y comparativos en DOP equivalente
      </p>
    </div>
  );
}

// ─── Shared UI components ─────────────────────────────────────────────────────
function KPICard({ label, icon, iconColor, iconBg, lines, footer, footerColor }: {
  label: string;
  icon: React.ReactNode;
  iconColor: string; iconBg: string;
  lines: { value: string; sub: string; color?: string }[];
  footer?: string;
  footerColor?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconBg, iconColor)}>
          {icon}
        </div>
        <p className="text-xs font-semibold text-gray-500">{label}</p>
      </div>
      <div className="space-y-0.5">
        {lines.map((l, i) => (
          <div key={i} className="flex items-baseline gap-1.5">
            <span className={cn("text-lg font-bold", l.color ?? "text-gray-900")}>{l.value}</span>
            {l.sub && <span className="text-[10px] text-gray-400">{l.sub}</span>}
          </div>
        ))}
      </div>
      {footer && (
        <p className={cn("text-[11px] mt-auto", footerColor ?? "text-gray-400")}>{footer}</p>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}
