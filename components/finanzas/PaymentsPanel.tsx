"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, X, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  payment_date: string;
  reference?: string;
  notes?: string;
  bank_account?: { id: string; name: string } | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  currency: string;
  status: string;
  due_date?: string;
}

function fmt(n: number, cur = "USD") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: cur }).format(Number(n));
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:          { label: "Borrador",          color: "bg-gray-100 text-gray-600",       icon: <Clock className="w-3 h-3" /> },
  sent:           { label: "Enviada",           color: "bg-blue-100 text-blue-700",       icon: <Clock className="w-3 h-3" /> },
  partially_paid: { label: "Pago parcial",      color: "bg-amber-100 text-amber-700",     icon: <AlertCircle className="w-3 h-3" /> },
  paid:           { label: "Pagada",            color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelled:      { label: "Cancelada",         color: "bg-red-100 text-red-600",         icon: <X className="w-3 h-3" /> },
};

export function PaymentsPanel({
  invoice,
  bankAccounts,
  onStatusChange,
  onClose,
}: {
  invoice: Invoice;
  bankAccounts: { id: string; name: string }[];
  onStatusChange: (id: string, status: string) => void;
  onClose: () => void;
}) {
  const [payments, setPayments]   = useState<Payment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);

  const totalPaid    = payments.reduce((s, p) => s + Number(p.amount), 0);
  const totalDue     = Number(invoice.total);
  const balance      = totalDue - totalPaid;
  const pct          = totalDue > 0 ? Math.min(100, (totalPaid / totalDue) * 100) : 0;
  const st           = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.sent;

  useEffect(() => {
    fetch(`/api/invoices/${invoice.id}/payments`)
      .then(r => r.json())
      .then(data => { setPayments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [invoice.id]);

  async function deletePayment(paymentId: string) {
    if (!confirm("¿Eliminar este pago?")) return;
    const res = await fetch(`/api/invoice-payments/${paymentId}`, { method: "DELETE" });
    if (res.ok) {
      const { newStatus } = await res.json();
      setPayments(p => p.filter(x => x.id !== paymentId));
      onStatusChange(invoice.id, newStatus);
      toast.success("Pago eliminado");
    }
  }

  function onPaymentAdded(p: Payment, newStatus: string) {
    setPayments(prev => [p, ...prev]);
    onStatusChange(invoice.id, newStatus);
    setShowForm(false);
    toast.success("Pago registrado");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Pagos</p>
            <h2 className="text-base font-semibold text-gray-900">{invoice.invoice_number}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* Summary */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full", st.color)}>
                {st.icon} {st.label}
              </span>
              {invoice.due_date && (
                <span className="text-xs text-gray-400">Vence {fmtDate(invoice.due_date)}</span>
              )}
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Cobrado</span>
                <span>{pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", pct >= 100 ? "bg-emerald-500" : "bg-violet-500")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Total</p>
                <p className="text-sm font-bold text-gray-900">{fmt(totalDue, invoice.currency)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3">
                <p className="text-[10px] text-emerald-600 uppercase tracking-wide mb-1">Cobrado</p>
                <p className="text-sm font-bold text-emerald-700">{fmt(totalPaid, invoice.currency)}</p>
              </div>
              <div className={cn("rounded-xl p-3", balance > 0 ? "bg-red-50" : "bg-gray-50")}>
                <p className={cn("text-[10px] uppercase tracking-wide mb-1", balance > 0 ? "text-red-500" : "text-gray-400")}>Pendiente</p>
                <p className={cn("text-sm font-bold", balance > 0 ? "text-red-600" : "text-gray-400")}>{fmt(Math.max(0, balance), invoice.currency)}</p>
              </div>
            </div>
          </div>

          {/* Payment history */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Historial de pagos</h3>
              {balance > 0 && (
                <button onClick={() => setShowForm(v => !v)}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 border border-violet-200 hover:bg-violet-50 px-2.5 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-3 h-3" /> Registrar pago
                </button>
              )}
            </div>

            {/* Inline form */}
            {showForm && (
              <PaymentForm
                invoice={invoice}
                bankAccounts={bankAccounts}
                remaining={balance}
                onSaved={onPaymentAdded}
                onCancel={() => setShowForm(false)}
              />
            )}

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Sin pagos registrados</p>
            ) : (
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-start justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-emerald-600">{fmt(p.amount, p.currency)}</span>
                        <span className="text-xs text-gray-400">{fmtDate(p.payment_date)}</span>
                      </div>
                      {p.bank_account && (
                        <p className="text-xs text-gray-500 mt-0.5">{p.bank_account.name}</p>
                      )}
                      {p.reference && (
                        <p className="text-xs text-gray-400">Ref: {p.reference}</p>
                      )}
                      {p.notes && (
                        <p className="text-xs text-gray-400 truncate">{p.notes}</p>
                      )}
                    </div>
                    <button onClick={() => deletePayment(p.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all ml-2 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PaymentForm ───────────────────────────────────────────────────────────────
function PaymentForm({ invoice, bankAccounts, remaining, onSaved, onCancel }: {
  invoice: Invoice;
  bankAccounts: { id: string; name: string }[];
  remaining: number;
  onSaved: (p: Payment, newStatus: string) => void;
  onCancel: () => void;
}) {
  const [amount,        setAmount]        = useState(remaining > 0 ? String(remaining.toFixed(2)) : "");
  const [date,          setDate]          = useState(new Date().toISOString().slice(0, 10));
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? "");
  const [reference,     setReference]     = useState("");
  const [notes,         setNotes]         = useState("");
  const [saving,        setSaving]        = useState(false);

  async function save() {
    if (!amount || Number(amount) <= 0) { toast.error("Ingresa el monto"); return; }
    setSaving(true);
    const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        currency: invoice.currency,
        payment_date: date,
        bank_account_id: bankAccountId || null,
        reference: reference || null,
        notes: notes || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const payment = await res.json();
      // Recalc status client-side
      const newPaid  = remaining - Number(amount) <= 0.01;
      const newStatus = newPaid ? "paid" : "partially_paid";
      onSaved({ ...payment, bank_account: bankAccounts.find(b => b.id === bankAccountId) ?? null }, newStatus);
    } else {
      toast.error("Error al registrar pago");
    }
  }

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4 space-y-3">
      <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Nuevo pago</p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Monto ({invoice.currency})</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fecha</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400 [color-scheme:light]" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Cuenta bancaria</label>
        <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400 bg-white">
          <option value="">Sin asignar</option>
          {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Referencia (opcional)</label>
        <input value={reference} onChange={e => setReference(e.target.value)}
          placeholder="No. transferencia, cheque…"
          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
          Cancelar
        </button>
        <button onClick={save} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium py-1.5 rounded-lg transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Guardar
        </button>
      </div>
    </div>
  );
}
