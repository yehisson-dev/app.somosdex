"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, TrendingDown, TrendingUp, Scale } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ExpenseCategory { id: string; name: string; color: string }
export interface BankSimple       { id: string; name: string; type: string }
export interface Expense {
  id: string; date: string; company: string; type: "projected" | "real";
  category_id: string | null; category?: ExpenseCategory | null;
  description: string | null; amount: number; currency: string;
  bank_account_id: string | null; bank_account?: BankSimple | null;
  attachment_url: string | null; attachment_name: string | null; notes: string | null;
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmt(n: number, cur = "DOP") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
}

export function GastosView({
  initialExpenses,
  initialCategories,
  banks,
  exchangeRate,
  invoices,
}: {
  initialExpenses: Expense[];
  initialCategories: ExpenseCategory[];
  banks: BankSimple[];
  exchangeRate: number;
  invoices: any[];
}) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [year,  setYear]  = useState(now.getFullYear());
  const [bankFilter, setBankFilter] = useState("all");
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [categories] = useState<ExpenseCategory[]>(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const prefix = `${year}-${pad(month + 1)}`;

  // Filter by month + bank
  const monthExpenses = expenses.filter(e => {
    if (!e.date.startsWith(prefix)) return false;
    if (bankFilter !== "all" && e.bank_account_id !== bankFilter) return false;
    return true;
  });

  // Income from paid invoices this month (DOP equivalent)
  const monthIncome = invoices
    .filter(inv => {
      const d = inv.issue_date ?? inv.paid_date ?? "";
      return d.startsWith(prefix) && inv.status === "paid";
    })
    .reduce((sum, inv) => {
      const amt = Number(inv.total ?? 0);
      return sum + (inv.currency === "USD" ? amt * exchangeRate : amt);
    }, 0);

  // Total expenses in DOP
  const totalExpenses = monthExpenses.reduce((sum, e) => {
    const amt = Number(e.amount ?? 0);
    return sum + (e.currency === "USD" ? amt * exchangeRate : amt);
  }, 0);

  const balance = monthIncome - totalExpenses;

  // Group by category for breakdown
  const byCategory: Record<string, { name: string; color: string; total: number }> = {};
  for (const e of monthExpenses) {
    const key  = e.category_id ?? "__none__";
    const name = e.category?.name ?? "Sin categoría";
    const color= e.category?.color ?? "#9ca3af";
    const amt  = Number(e.amount ?? 0);
    const dop  = e.currency === "USD" ? amt * exchangeRate : amt;
    if (!byCategory[key]) byCategory[key] = { name, color, total: 0 };
    byCategory[key].total += dop;
  }
  const catBreakdown = Object.values(byCategory).sort((a, b) => b.total - a.total);
  const maxCat = catBreakdown[0]?.total ?? 1;

  async function deleteExpense(id: string) {
    if (!confirm("¿Eliminar este gasto?")) return;
    setDeleting(id);
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success("Gasto eliminado");
    } else {
      toast.error("Error al eliminar");
    }
    setDeleting(null);
  }

  function onCreated(expense: Expense) {
    setExpenses(prev => [expense, ...prev]);
    setShowForm(false);
    toast.success("Gasto registrado");
  }

  return (
    <div className="space-y-5">

      {/* ── Header row ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Month navigator */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Bank filter */}
          <select
            value={bankFilter}
            onChange={e => setBankFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-violet-400 bg-white"
          >
            <option value="all">Todos los bancos</option>
            {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {/* Add expense */}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo gasto
          </button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-gray-500">Ingresos del mes</span>
          </div>
          <p className="text-xl font-bold text-emerald-600">{fmt(monthIncome)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Facturas pagadas</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-gray-500">Gastos del mes</span>
          </div>
          <p className="text-xl font-bold text-red-600">{fmt(totalExpenses)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{monthExpenses.length} movimiento{monthExpenses.length !== 1 ? "s" : ""}</p>
        </div>
        <div className={cn("bg-white border rounded-xl p-4", balance >= 0 ? "border-emerald-200" : "border-red-200")}>
          <div className="flex items-center gap-2 mb-2">
            <Scale className={cn("w-4 h-4", balance >= 0 ? "text-emerald-500" : "text-red-500")} />
            <span className="text-xs font-medium text-gray-500">Balance</span>
          </div>
          <p className={cn("text-xl font-bold", balance >= 0 ? "text-emerald-600" : "text-red-600")}>{fmt(balance)}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{balance >= 0 ? "Superávit" : "Déficit"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">

        {/* ── Category breakdown ── */}
        {catBreakdown.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-1">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Gastos por categoría</h3>
            <div className="space-y-3">
              {catBreakdown.map(cat => (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs text-gray-700 truncate max-w-[130px]">{cat.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900">{fmt(cat.total)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(cat.total / maxCat) * 100}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Expense list ── */}
        <div className={cn("bg-white border border-gray-200 rounded-xl overflow-hidden", catBreakdown.length > 0 ? "col-span-2" : "col-span-3")}>
          {monthExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm gap-2">
              <TrendingDown className="w-8 h-8 text-gray-300" />
              No hay gastos registrados en {MONTHS[month]} {year}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Banco</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monto</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {monthExpenses
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(e => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{e.description ?? "—"}</td>
                      <td className="px-4 py-3">
                        {e.category ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: e.category.color + "20", color: e.category.color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.category.color }} />
                            {e.category.name}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{e.bank_account?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-red-600">
                          -{fmt(Number(e.amount), e.currency)}
                        </span>
                        {e.currency === "USD" && (
                          <div className="text-[11px] text-gray-400">≈ {fmt(Number(e.amount) * exchangeRate)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => deleteExpense(e.id)}
                          disabled={deleting === e.id}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
              {monthExpenses.length > 1 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-red-600">{fmt(totalExpenses)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>

      {/* ── New Expense Modal ── */}
      {showForm && (
        <NewExpenseForm
          categories={categories}
          banks={banks}
          defaultDate={`${year}-${pad(month + 1)}-${pad(now.getDate())}`}
          onClose={() => setShowForm(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

// ─── NewExpenseForm ───────────────────────────────────────────────────────────
function NewExpenseForm({
  categories, banks, defaultDate, onClose, onCreated,
}: {
  categories: ExpenseCategory[];
  banks: BankSimple[];
  defaultDate: string;
  onClose: () => void;
  onCreated: (e: Expense) => void;
}) {
  const [date,        setDate]        = useState(defaultDate);
  const [description, setDescription] = useState("");
  const [amount,      setAmount]      = useState("");
  const [currency,    setCurrency]    = useState("DOP");
  const [categoryId,  setCategoryId]  = useState("");
  const [bankId,      setBankId]      = useState("");
  const [saving,      setSaving]      = useState(false);

  async function save() {
    if (!date || !amount || Number(amount) <= 0) { toast.error("Fecha y monto son requeridos"); return; }
    setSaving(true);
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date, description: description || null, amount: Number(amount), currency,
        category_id: categoryId || null, bank_account_id: bankId || null,
        company: "DEX", type: "real",
      }),
    });
    setSaving(false);
    if (res.ok) onCreated(await res.json());
    else toast.error("Error al guardar");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Nuevo gasto</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 [color-scheme:light]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                <option value="DOP">DOP</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Monto *</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descripción</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Ej: Pago nómina Amirla, Hosting…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Categoría</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Banco</label>
              <select value={bankId} onChange={e => setBankId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                <option value="">Sin banco</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            {saving ? "Guardando…" : "Guardar gasto"}
          </button>
        </div>
      </div>
    </div>
  );
}
