"use client";

import { useState, useRef } from "react";
import { Plus, Trash2, X, FileText, ArrowRight, Pencil, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export interface QuoteClient {
  id: string; name: string; color?: string; email?: string; company?: string;
}
export interface QuoteItem {
  id?: string; description: string; quantity: number; unit_price: number; total: number; service_id?: string | null;
}
export interface Quote {
  id: string; quote_number: string; status: string; currency: string;
  issue_date: string; expiry_date?: string | null; notes?: string | null;
  subtotal: number; tax_rate: number; tax_amount: number; total: number;
  company?: string | null; client?: QuoteClient | null;
  converted_to_invoice_id?: string | null;
  items?: QuoteItem[];
}
export interface ServiceSimple { id: string; name: string; price?: number | null; currency?: string | null }

const COMPANIES = ["CUBO", "DEX", "YEHISSON"] as const;
const STATUS_OPTIONS = [
  { value: "draft",    label: "Borrador",  color: "#6b7280", bg: "bg-gray-100 text-gray-600" },
  { value: "sent",     label: "Enviada",   color: "#3b82f6", bg: "bg-blue-100 text-blue-700" },
  { value: "approved", label: "Aprobada",  color: "#10b981", bg: "bg-emerald-100 text-emerald-700" },
  { value: "rejected", label: "Rechazada", color: "#ef4444", bg: "bg-red-100 text-red-600" },
  { value: "expired",  label: "Expirada",  color: "#9ca3af", bg: "bg-gray-100 text-gray-500" },
] as const;

function getStatus(s: string) {
  return STATUS_OPTIONS.find(o => o.value === s) ?? STATUS_OPTIONS[0];
}
function fmt(n: number | string, currency = "USD") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency }).format(Number(n));
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

export function QuotesView({
  initialQuotes, clients, services,
}: {
  initialQuotes: Quote[];
  clients: QuoteClient[];
  services: ServiceSimple[];
}) {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>(initialQuotes);
  const [showForm, setShowForm] = useState(false);
  const [editQuote, setEditQuote] = useState<Quote | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [converting, setConverting] = useState<string | null>(null);

  const filtered = quotes.filter(q => !filterStatus || q.status === filterStatus);

  async function deleteQuote(id: string) {
    if (!confirm("¿Eliminar esta cotización?")) return;
    const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
    if (res.ok) { setQuotes(p => p.filter(q => q.id !== id)); toast.success("Cotización eliminada"); }
  }

  async function changeStatus(id: string, status: string) {
    const res = await fetch(`/api/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { setQuotes(p => p.map(q => q.id === id ? { ...q, status } : q)); }
  }

  async function convertToInvoice(q: Quote) {
    if (!confirm(`¿Convertir ${q.quote_number} a factura?`)) return;
    setConverting(q.id);
    const res = await fetch(`/api/quotes/${q.id}/convert`, { method: "POST" });
    setConverting(null);
    if (res.ok) {
      const { invoice_number } = await res.json();
      setQuotes(p => p.map(x => x.id === q.id ? { ...x, status: "approved", converted_to_invoice_id: "yes" } : x));
      toast.success(`Factura ${invoice_number} creada`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Error al convertir");
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="flex gap-3 flex-wrap mb-6">
        {[
          { label: "Total cotizaciones", val: quotes.length, color: "text-violet-600", unit: "" },
          { label: "Monto total", val: fmt(quotes.reduce((s, q) => s + Number(q.total), 0), "USD"), color: "text-emerald-600", unit: "" },
          { label: "Aprobadas", val: quotes.filter(q => q.status === "approved").length, color: "text-blue-600", unit: "" },
          { label: "Pendientes", val: quotes.filter(q => ["draft","sent"].includes(q.status)).length, color: "text-amber-600", unit: "" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl px-5 py-3 min-w-[150px]">
            <p className="text-xs text-gray-500 mb-1 font-medium">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Filters + actions */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-violet-400 bg-white">
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={() => setShowForm(true)}
          className="ml-auto flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nueva cotización
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No hay cotizaciones</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Número","Cliente","Empresa","Emisión","Vence","Total","Estado",""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => {
                const st = getStatus(q.status);
                return (
                  <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-semibold text-violet-700">{q.quote_number}</span>
                      {q.converted_to_invoice_id && (
                        <span className="ml-1.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">→ FAC</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{q.client?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{q.company ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(q.issue_date)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(q.expiry_date)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800 whitespace-nowrap">{fmt(q.total, q.currency)}</td>
                    <td className="px-4 py-3">
                      <StatusDropdown status={q.status} onChange={s => changeStatus(q.id, s)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {/* PDF */}
                        <a href={`/api/quotes/${q.id}/pdf`} target="_blank" rel="noopener noreferrer"
                          title="Ver PDF"
                          className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors">
                          <FileText className="w-3.5 h-3.5" />
                        </a>
                        {/* Convert */}
                        {!q.converted_to_invoice_id && (
                          <button onClick={() => convertToInvoice(q)} disabled={converting === q.id}
                            title="Convertir a factura"
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-40">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Edit */}
                        <button onClick={() => setEditQuote(q)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete */}
                        <button onClick={() => deleteQuote(q.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* New quote form */}
      {showForm && (
        <QuoteForm
          clients={clients} services={services}
          onClose={() => setShowForm(false)}
          onSaved={q => { setQuotes(p => [q, ...p]); setShowForm(false); toast.success(`${q.quote_number} creada`); }}
        />
      )}

      {/* Edit quote form */}
      {editQuote && (
        <QuoteForm
          clients={clients} services={services}
          quote={editQuote}
          onClose={() => setEditQuote(null)}
          onSaved={q => {
            setQuotes(p => p.map(x => x.id === q.id ? { ...q, client: x.client } : x));
            setEditQuote(null);
            toast.success("Cotización actualizada");
          }}
        />
      )}
    </div>
  );
}

// ─── StatusDropdown ───────────────────────────────────────────────────────────
function StatusDropdown({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const st = getStatus(status);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full cursor-pointer", st.bg)}>
        {st.label} <ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-lg py-1 left-0">
            {STATUS_OPTIONS.map(o => (
              <button key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors", status === o.value && "font-semibold")}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: o.color }} />
                {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── QuoteForm ────────────────────────────────────────────────────────────────
function QuoteForm({ clients, services, quote, onClose, onSaved }: {
  clients: QuoteClient[];
  services: ServiceSimple[];
  quote?: Quote;
  onClose: () => void;
  onSaved: (q: Quote) => void;
}) {
  const isEdit = !!quote;
  const [clientId,   setClientId]   = useState(quote?.client?.id ?? "");
  const [company,    setCompany]    = useState(quote?.company ?? "DEX");
  const [issueDate,  setIssueDate]  = useState(quote?.issue_date ?? new Date().toISOString().slice(0,10));
  const [expiryDate, setExpiryDate] = useState(quote?.expiry_date ?? "");
  const [notes,      setNotes]      = useState(quote?.notes ?? "");
  const [taxRate,    setTaxRate]    = useState(String(quote?.tax_rate ?? 18));
  const [currency,   setCurrency]   = useState(quote?.currency ?? "USD");
  const [items,      setItems]      = useState<QuoteItem[]>(
    quote?.items?.length ? quote.items : [{ description: "", quantity: 1, unit_price: 0, total: 0 }]
  );
  const [saving, setSaving] = useState(false);

  function updateItem(i: number, field: keyof QuoteItem, value: string | number) {
    setItems(prev => {
      const next = [...prev];
      const it = { ...next[i], [field]: value };
      if (field === "quantity" || field === "unit_price") {
        it.total = Number(it.quantity) * Number(it.unit_price);
      }
      next[i] = it;
      return next;
    });
  }
  function addItem() {
    setItems(p => [...p, { description: "", quantity: 1, unit_price: 0, total: 0 }]);
  }
  function removeItem(i: number) {
    setItems(p => p.filter((_, idx) => idx !== i));
  }
  function applyService(i: number, svcId: string) {
    const svc = services.find(s => s.id === svcId);
    if (!svc) return;
    updateItem(i, "description", svc.name);
    const price = Number(svc.price ?? 0);
    setItems(prev => {
      const next = [...prev];
      next[i] = { ...next[i], description: svc.name, unit_price: price, total: price * next[i].quantity, service_id: svc.id };
      return next;
    });
  }

  const subtotal = items.reduce((s, it) => s + Number(it.total), 0);
  const tax = subtotal * (Number(taxRate) / 100);
  const total = subtotal + tax;

  async function save() {
    if (!issueDate) { toast.error("Fecha de emisión requerida"); return; }
    setSaving(true);
    const body = {
      client_id: clientId || null, company: company || null,
      issue_date: issueDate, expiry_date: expiryDate || null,
      notes: notes || null, tax_rate: Number(taxRate), currency,
      items: items.map(it => ({
        description: it.description, quantity: Number(it.quantity),
        unit_price: Number(it.unit_price), service_id: it.service_id ?? null,
      })),
    };
    const res = await fetch(isEdit ? `/api/quotes/${quote!.id}` : "/api/quotes", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) {
      const saved = isEdit ? { ...quote!, ...body, subtotal, tax_amount: tax, total } : await res.json();
      onSaved(saved as Quote);
    } else {
      toast.error("Error al guardar cotización");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? `Editar ${quote!.quote_number}` : "Nueva cotización"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Client + Company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cliente</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 bg-white">
                <option value="">Sin cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Empresa emisora</label>
              <select value={company} onChange={e => setCompany(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 bg-white">
                {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha de emisión *</label>
              <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 [color-scheme:light]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Válida hasta</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 [color-scheme:light]" />
            </div>
          </div>

          {/* Currency + Tax */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Moneda</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 bg-white">
                <option value="USD">USD</option>
                <option value="DOP">DOP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ITBIS (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={taxRate} onChange={e => setTaxRate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ítems</label>
              <button onClick={addItem} className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Agregar ítem
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50/50">
                  <div className="flex gap-2">
                    <select
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-violet-400"
                      onChange={e => e.target.value && applyService(i, e.target.value)}
                      value="">
                      <option value="">Seleccionar servicio…</option>
                      {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="p-1.5 text-gray-400 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    value={it.description}
                    onChange={e => updateItem(i, "description", e.target.value)}
                    placeholder="Descripción del servicio…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Cantidad</label>
                      <input type="number" min="0" step="0.01" value={it.quantity}
                        onChange={e => updateItem(i, "quantity", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Precio unit.</label>
                      <input type="number" min="0" step="0.01" value={it.unit_price}
                        onChange={e => updateItem(i, "unit_price", e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-0.5">Total</label>
                      <div className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white text-gray-500 font-medium">
                        {fmt(it.total, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals preview */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{fmt(subtotal, currency)}</span></div>
            {Number(taxRate) > 0 && (
              <div className="flex justify-between text-gray-500"><span>ITBIS ({taxRate}%)</span><span>{fmt(tax, currency)}</span></div>
            )}
            <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1.5">
              <span>Total</span><span className="text-violet-700">{fmt(total, currency)}</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notas y condiciones</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Condiciones de pago, tiempo de entrega, validez de la oferta…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear cotización"}
          </button>
        </div>
      </div>
    </div>
  );
}
