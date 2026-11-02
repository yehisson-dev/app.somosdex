"use client";

import { useState } from "react";
import { Plus, Trash2, X, Pencil, FileUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImportBankStatement } from "./ImportBankStatement";

export interface BankAccount {
  id: string; name: string; type: string; currency: string; color: string;
  initial_balance: number; received_usd: number; received_dop: number;
}
interface Invoice {
  id: string; invoice_number: string; status: string; currency: string;
  total: number; company?: string; bank_account_id?: string | null; issue_date: string;
  client?: { id: string; name: string; color: string };
}
interface Expense {
  id: string; amount: number; currency: string; bank_account_id?: string | null;
}

const BANK_TYPES = [
  { value: "bank",    label: "Banco",    icon: "🏦" },
  { value: "cash",    label: "Efectivo", icon: "💵" },
  { value: "paypal",  label: "PayPal",   icon: "🅿️" },
  { value: "stripe",  label: "Stripe",   icon: "💳" },
  { value: "other",   label: "Otro",     icon: "💰" },
];

const COMPANIES = ["CUBO", "DEX", "YEHISSON"];

const PALETTE = [
  "#6366f1","#8b5cf6","#ec4899","#10b981","#3b82f6",
  "#f59e0b","#ef4444","#0ea5e9","#14b8a6","#6b7280",
];

function fmt(n: number, cur: string) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: cur }).format(n);
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

export function BancosView({
  initialBanks, invoices, expenses, onUpdateInvoice, onImported,
}: {
  initialBanks: BankAccount[];
  invoices: Invoice[];
  expenses: Expense[];
  onUpdateInvoice: (id: string, data: Partial<Invoice>) => void;
  onImported?: () => void;
}) {
  const [banks, setBanks]       = useState<BankAccount[]>(initialBanks);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [tab, setTab]           = useState<"cuentas" | "ingresos">("cuentas");

  const paidInvoices = invoices.filter(i => i.status === "paid");

  async function handleCreate(data: { name: string; type: string; currency: string; color: string }) {
    const res = await fetch("/api/bank-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const bank = await res.json();
      setBanks(prev => [...prev, bank].sort((a, b) => a.name.localeCompare(b.name)));
      setShowForm(false);
      toast.success("Cuenta creada");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta cuenta?")) return;
    const res = await fetch(`/api/bank-accounts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setBanks(prev => prev.filter(b => b.id !== id));
      toast.success("Cuenta eliminada");
    }
  }

  async function handleEdit(id: string, data: Partial<BankAccount>) {
    const res = await fetch(`/api/bank-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setBanks(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
      setEditingBank(null);
      toast.success("Cuenta actualizada");
    }
  }

  async function assignBank(invoiceId: string, bankId: string | null) {
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bank_account_id: bankId }),
    });
    if (res.ok) {
      onUpdateInvoice(invoiceId, { bank_account_id: bankId });
      // recalculate bank balances locally (approximate)
      setBanks(prev => prev.map(b => {
        const inv = invoices.find(i => i.id === invoiceId);
        if (!inv) return b;
        const amount = Number(inv.total);
        const wasAssigned = inv.bank_account_id === b.id;
        const isAssigned  = bankId === b.id;
        if (!wasAssigned && !isAssigned) return b;
        const delta = isAssigned ? amount : wasAssigned ? -amount : 0;
        return {
          ...b,
          received_usd: inv.currency === "USD" ? Number(b.received_usd) + delta : b.received_usd,
          received_dop: inv.currency === "DOP" ? Number(b.received_dop) + delta : b.received_dop,
        };
      }));
    }
  }

  async function assignCompany(invoiceId: string, company: string) {
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company }),
    });
    if (res.ok) onUpdateInvoice(invoiceId, { company });
  }

  // Income totals per company
  const incomeByCompany = COMPANIES.map(co => {
    const coInvs = paidInvoices.filter(i => (i.company ?? "DEX") === co);
    return {
      company: co,
      usd: coInvs.filter(i => i.currency === "USD").reduce((s, i) => s + Number(i.total), 0),
      dop: coInvs.filter(i => i.currency === "DOP").reduce((s, i) => s + Number(i.total), 0),
    };
  });

  const COMPANY_COLOR: Record<string, string> = { CUBO: "#6366f1", DEX: "#8b5cf6", YEHISSON: "#ec4899" };

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        {(["cuentas", "ingresos"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t === "cuentas" ? "Cuentas" : "Ingresos"}
          </button>
        ))}
      </div>

      {/* ── CUENTAS ── */}
      {tab === "cuentas" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">Bancos, efectivo y métodos de pago</p>
            <div className="flex gap-2">
              <button onClick={() => setShowImport(true)}
                className="flex items-center gap-2 border border-violet-300 text-violet-600 hover:bg-violet-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <FileUp className="w-4 h-4" /> Importar estado de cuenta
              </button>
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Nueva cuenta
              </button>
            </div>
          </div>

          {banks.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">No hay cuentas — crea la primera</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {banks.map(bank => {
                const typeInfo = BANK_TYPES.find(t => t.value === bank.type) ?? BANK_TYPES[0];
                const income = bank.currency === "USD" ? Number(bank.received_usd) : Number(bank.received_dop);
                const bankExpenses = expenses.filter(e => e.bank_account_id === bank.id && e.currency === bank.currency);
                const totalExpenses = bankExpenses.reduce((s, e) => s + Number(e.amount), 0);
                const balance = Number(bank.initial_balance) + income - totalExpenses;
                return (
                  <div key={bank.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: bank.color + "20" }}>
                          {typeInfo.icon}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{bank.name}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{typeInfo.label} · {bank.currency}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setEditingBank(bank)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(bank.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 space-y-1.5">
                      {Number(bank.initial_balance) > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">Balance inicial</span>
                          <span className="text-xs text-gray-500">{fmt(Number(bank.initial_balance), bank.currency)}</span>
                        </div>
                      )}
                      {income > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">+ Ingresos</span>
                          <span className="text-xs text-emerald-600">{fmt(income, bank.currency)}</span>
                        </div>
                      )}
                      {totalExpenses > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide">− Gastos</span>
                          <span className="text-xs text-red-400">{fmt(totalExpenses, bank.currency)}</span>
                        </div>
                      )}
                      {(Number(bank.initial_balance) > 0 || income > 0 || totalExpenses > 0) ? (
                        <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                          <span className="text-xs font-semibold text-gray-700">Balance actual</span>
                          <span className={cn("text-sm font-bold", balance >= 0 ? "text-emerald-600" : "text-red-500")}>
                            {fmt(balance, bank.currency)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">Sin movimientos aún</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showImport && (
            <ImportBankStatement
              bankAccounts={banks.map(b => ({ id: b.id, name: b.name }))}
              onClose={() => setShowImport(false)}
              onImported={() => { setShowImport(false); toast.success("Importación completada"); onImported?.(); }}
            />
          )}
          {showForm && <BankForm onClose={() => setShowForm(false)} onCreated={handleCreate} />}
          {editingBank && (
            <BankEditForm
              bank={editingBank}
              onClose={() => setEditingBank(null)}
              onSaved={(data) => handleEdit(editingBank.id, data)}
            />
          )}
        </div>
      )}

      {/* ── INGRESOS ── */}
      {tab === "ingresos" && (
        <div>
          {/* Resumen por empresa */}
          <div className="flex gap-3 flex-wrap mb-6">
            {incomeByCompany.map(({ company, usd, dop }) => (
              <div key={company} className="bg-white border border-gray-200 rounded-xl px-5 py-3 min-w-[180px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COMPANY_COLOR[company] }} />
                  <p className="text-xs font-semibold text-gray-700">{company}</p>
                </div>
                {usd > 0 && <p className="text-sm font-bold text-gray-900">{fmt(usd, "USD")}</p>}
                {dop > 0 && <p className="text-sm font-bold text-gray-900">{fmt(dop, "DOP")}</p>}
                {usd === 0 && dop === 0 && <p className="text-xs text-gray-400">Sin ingresos</p>}
              </div>
            ))}
          </div>

          {paidInvoices.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No hay facturas pagadas aún</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Factura", "Cliente", "Fecha", "Monto", "Empresa", "Banco"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paidInvoices.map(inv => (
                    <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{inv.invoice_number}</td>
                      <td className="px-4 py-3">
                        {inv.client
                          ? <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: inv.client.color }} /><span className="text-sm text-gray-700">{inv.client.name}</span></div>
                          : <span className="text-sm text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{inv.issue_date ? fmtDate(inv.issue_date) : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-bold text-emerald-600">{fmt(Number(inv.total), inv.currency)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <select value={inv.company ?? "DEX"} onChange={e => assignCompany(inv.id, e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-violet-400 bg-white">
                          {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select value={inv.bank_account_id ?? ""} onChange={e => assignBank(inv.id, e.target.value || null)}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:border-violet-400 bg-white">
                          <option value="">Sin asignar</option>
                          {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BankEditForm ─────────────────────────────────────────────────────────────
function BankEditForm({ bank, onClose, onSaved }: {
  bank: BankAccount;
  onClose: () => void;
  onSaved: (d: Partial<BankAccount>) => void;
}) {
  const [name,           setName]           = useState(bank.name);
  const [type,           setType]           = useState(bank.type);
  const [currency,       setCurrency]       = useState(bank.currency);
  const [color,          setColor]          = useState(bank.color);
  const [initialBalance, setInitialBalance] = useState(String(bank.initial_balance ?? 0));
  const [saving,         setSaving]         = useState(false);

  async function save() {
    if (!name.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    await onSaved({
      name: name.trim(), type, currency, color,
      initial_balance: parseFloat(initialBalance) || 0,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Editar cuenta</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                {BANK_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                <option value="DOP">DOP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Balance inicial ({currency})
            </label>
            <input type="number" min="0" step="0.01" value={initialBalance}
              onChange={e => setInitialBalance(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
            <p className="text-[11px] text-gray-400 mt-1">Monto que ya tenías en esta cuenta antes de registrar facturas</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={cn("w-7 h-7 rounded-full border-2 transition-all", color === c ? "border-violet-500 scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BankForm ─────────────────────────────────────────────────────────────────
function BankForm({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (d: { name: string; type: string; currency: string; color: string }) => void;
}) {
  const [name, setName]         = useState("");
  const [type, setType]         = useState("bank");
  const [currency, setCurrency] = useState("DOP");
  const [color, setColor]       = useState(PALETTE[0]);
  const [saving, setSaving]     = useState(false);

  async function save() {
    if (!name.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    await onCreated({ name: name.trim(), type, currency, color });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Nueva cuenta</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Banco Popular, Efectivo USD, Stripe…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                {BANK_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                <option value="DOP">DOP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PALETTE.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={cn("w-7 h-7 rounded-full transition-all border-2", color === c ? "border-violet-500 scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            {saving ? "Guardando…" : "Crear cuenta"}
          </button>
        </div>
      </div>
    </div>
  );
}
