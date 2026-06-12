"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, FileText, Printer, Trash2, CheckCircle2,
  Send, XCircle, ChevronDown, X, Search, Package, Pencil, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Client  { id: string; name: string; color: string; email?: string; company?: string }
interface Service { id: string; name: string; description?: string; unit_price: number; unit?: string }
interface InvoiceItem { id?: string; description: string; quantity: number; unit_price: number; total: number; service_id?: string | null }
interface Invoice {
  id: string; invoice_number: string; status: string; issue_date: string; due_date?: string;
  subtotal: number; tax_rate: number; tax_amount: number; total: number; currency: string;
  notes?: string; client?: Client; items?: InvoiceItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency }).format(n);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Borrador",   color: "#6b7280", bg: "bg-gray-100 text-gray-600" },
  sent:      { label: "Enviada",    color: "#3b82f6", bg: "bg-blue-100 text-blue-700" },
  paid:      { label: "Pagada",     color: "#10b981", bg: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelada",  color: "#ef4444", bg: "bg-red-100 text-red-600" },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export function FinanzasClient({
  initialInvoices, clients, initialServices,
}: { initialInvoices: Invoice[]; clients: Client[]; initialServices: Service[] }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [view, setView] = useState<"invoices" | "services">("invoices");
  const [showForm, setShowForm] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [search, setSearch] = useState("");

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return inv.invoice_number.toLowerCase().includes(q) ||
      inv.client?.name?.toLowerCase().includes(q) || "";
  });

  async function deleteInvoice(id: string) {
    if (!confirm("¿Eliminar esta factura? Esta acción no se puede deshacer.")) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (res.ok) {
      setInvoices((prev) => prev.filter((i) => i.id !== id));
      toast.success("Factura eliminada");
    }
  }

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setInvoices((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
      toast.success("Estado actualizado");
    }
  }

  function openPdf(id: string) {
    window.open(`/api/invoices/${id}/pdf`, "_blank");
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView("invoices")}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === "invoices" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1.5" />Facturas
          </button>
          <button
            onClick={() => setView("services")}
            className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
              view === "services" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
          >
            <Package className="w-3.5 h-3.5 inline mr-1.5" />Servicios
          </button>
        </div>

        <button
          onClick={() => view === "invoices" ? setShowForm(true) : setShowServiceForm(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          {view === "invoices" ? "Nueva factura" : "Nuevo servicio"}
        </button>
      </div>

      {/* ── VISTA FACTURAS ── */}
      {view === "invoices" && (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar factura o cliente…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">
              {search ? "Sin resultados" : "No hay facturas — crea la primera"}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Factura</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cliente</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => {
                    const sc = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
                    return (
                      <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-gray-800">{inv.invoice_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          {inv.client ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: inv.client.color }} />
                              <span className="text-sm text-gray-700">{inv.client.name}</span>
                            </div>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{fmtDate(inv.issue_date)}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">{fmt(inv.total, inv.currency)}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusDropdown status={inv.status} onChange={(s) => updateStatus(inv.id, s)} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={() => openPdf(inv.id)} title="Ver / Imprimir PDF"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 text-xs font-medium transition-colors">
                              <Printer className="w-3.5 h-3.5" />
                              Ver PDF
                            </button>
                            <button onClick={() => setEditingInvoice(inv)} title="Editar factura"
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <button onClick={() => deleteInvoice(inv.id)} title="Eliminar"
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

          {/* Totales resumen */}
          {invoices.length > 0 && (
            <div className="mt-4 flex gap-4 flex-wrap">
              {[
                { label: "Total facturado", value: invoices.reduce((s, i) => s + Number(i.total), 0) },
                { label: "Pagado", value: invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0) },
                { label: "Pendiente", value: invoices.filter(i => ["draft","sent"].includes(i.status)).reduce((s, i) => s + Number(i.total), 0) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white border border-gray-200 rounded-xl px-5 py-3">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-lg font-bold text-gray-900">{fmt(value)}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── VISTA SERVICIOS ── */}
      {view === "services" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
          {services.length === 0 && (
            <div className="col-span-3 text-center py-20 text-gray-400 text-sm">
              No hay servicios — crea el primero para usarlos en facturas
            </div>
          )}
          {services.map((svc) => (
            <div key={svc.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">{svc.name}</h3>
                <span className="text-sm font-bold text-violet-600">{fmt(svc.unit_price)}</span>
              </div>
              {svc.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{svc.description}</p>}
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{svc.unit ?? "servicio"}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL NUEVA FACTURA ── */}
      {showForm && (
        <InvoiceForm
          clients={clients}
          services={services}
          onClose={() => setShowForm(false)}
          onCreated={(inv) => { setInvoices((prev) => [inv, ...prev]); setShowForm(false); toast.success(`Factura ${inv.invoice_number} creada`); }}
        />
      )}

      {/* ── MODAL NUEVO SERVICIO ── */}
      {showServiceForm && (
        <ServiceForm
          onClose={() => setShowServiceForm(false)}
          onCreated={(svc) => { setServices((prev) => [...prev, svc].sort((a, b) => a.name.localeCompare(b.name))); setShowServiceForm(false); toast.success("Servicio guardado"); }}
        />
      )}

      {/* ── MODAL EDITAR FACTURA ── */}
      {editingInvoice && (
        <EditInvoiceForm
          invoice={editingInvoice}
          clients={clients}
          services={services}
          onClose={() => setEditingInvoice(null)}
          onSaved={(updated) => {
            setInvoices((prev) => prev.map((i) => i.id === updated.id ? { ...i, ...updated } : i));
            setEditingInvoice(null);
            toast.success("Factura actualizada");
          }}
        />
      )}
    </div>
  );
}

// ─── StatusDropdown ───────────────────────────────────────────────────────────
function StatusDropdown({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const sc = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const icons: Record<string, React.ReactNode> = {
    draft: <FileText className="w-3 h-3" />, sent: <Send className="w-3 h-3" />,
    paid: <CheckCircle2 className="w-3 h-3" />, cancelled: <XCircle className="w-3 h-3" />,
  };
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen((v) => !v)}
        className={cn("flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full", sc.bg)}>
        {icons[status]}{sc.label}<ChevronDown className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute top-7 left-1/2 -translate-x-1/2 z-30 w-36 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => { onChange(key); setOpen(false); }}
              className={cn("w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors", status === key && "bg-gray-50 font-medium")}>
              {icons[key]}<span>{cfg.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── InvoiceForm ──────────────────────────────────────────────────────────────
function InvoiceForm({ clients, services, onClose, onCreated }: {
  clients: Client[]; services: Service[];
  onClose: () => void; onCreated: (inv: Invoice) => void;
}) {
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unit_price: 0, total: 0, service_id: null }]);
  const [saving, setSaving] = useState(false);
  const [serviceSearch, setServiceSearch] = useState<number | null>(null);

  function setItem(i: number, patch: Partial<InvoiceItem>) {
    setItems((prev) => prev.map((it, idx) => {
      if (idx !== i) return it;
      const next = { ...it, ...patch };
      next.total = Number(next.quantity) * Number(next.unit_price);
      return next;
    }));
  }

  function applyService(i: number, svc: Service) {
    setItem(i, { description: svc.name, unit_price: svc.unit_price, service_id: svc.id });
    setServiceSearch(null);
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, total: 0, service_id: null }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  const subtotal = items.reduce((s, it) => s + Number(it.total), 0);
  const taxAmt   = subtotal * (taxRate / 100);
  const total    = subtotal + taxAmt;

  async function save() {
    if (!clientId) { toast.error("Selecciona un cliente"); return; }
    if (items.some((it) => !it.description.trim())) { toast.error("Todos los ítems deben tener descripción"); return; }
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, issue_date: issueDate, due_date: dueDate || null, notes, tax_rate: taxRate, currency, items }),
    });
    setSaving(false);
    if (res.ok) {
      const inv = await res.json();
      onCreated({ ...inv, client: clients.find((c) => c.id === clientId) });
    } else {
      toast.error("Error al crear la factura");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Nueva factura</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cliente *</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-violet-400">
              <option value="">Seleccionar cliente…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
            </select>
          </div>

          {/* Fechas + moneda */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Fecha emisión</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 [color-scheme:light]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vencimiento</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 [color-scheme:light]" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Moneda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                <option value="USD">USD</option>
                <option value="DOP">DOP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Ítems */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Servicios / Ítems</label>
            </div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 relative">
                  {items.length > 1 && (
                    <button onClick={() => removeItem(i)}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Descripción + selector de servicio */}
                  <div className="relative">
                    <input
                      value={it.description}
                      onChange={(e) => setItem(i, { description: e.target.value })}
                      onFocus={() => setServiceSearch(i)}
                      placeholder="Descripción del servicio…"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 pr-8"
                    />
                    {serviceSearch === i && services.length > 0 && (
                      <div className="absolute top-10 left-0 z-20 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        <div className="px-3 py-1.5 text-[10px] text-gray-400 font-medium uppercase tracking-wide border-b">Servicios guardados</div>
                        {services.filter((s) => !it.description || s.name.toLowerCase().includes(it.description.toLowerCase())).map((svc) => (
                          <button key={svc.id} onMouseDown={() => applyService(i, svc)}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-sm text-left">
                            <div>
                              <p className="font-medium text-gray-800">{svc.name}</p>
                              {svc.description && <p className="text-xs text-gray-400 truncate">{svc.description}</p>}
                            </div>
                            <span className="text-xs font-semibold text-violet-600 shrink-0 ml-3">{fmt(svc.unit_price, currency)}</span>
                          </button>
                        ))}
                        <button onMouseDown={() => setServiceSearch(null)} className="w-full text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 text-left">↩ Escribir manualmente</button>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Cant.</label>
                      <input type="number" min="0.01" step="0.01" value={it.quantity}
                        onChange={(e) => setItem(i, { quantity: Number(e.target.value) })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Precio unit.</label>
                      <input type="number" min="0" step="0.01" value={it.unit_price}
                        onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Total</label>
                      <div className="w-full border border-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-gray-50">{fmt(it.total, currency)}</div>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addItem}
                className="w-full text-xs text-gray-400 hover:text-violet-600 border border-dashed border-gray-200 hover:border-violet-300 rounded-lg py-2 transition-colors">
                + Agregar ítem
              </button>
            </div>
          </div>

          {/* ITBIS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ITBIS / Impuesto (%)</label>
              <input type="number" min="0" max="100" step="0.5" value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
            </div>
            <div className="flex flex-col justify-end">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 space-y-1">
                <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(subtotal, currency)}</span></div>
                {taxRate > 0 && <div className="flex justify-between text-xs text-gray-500"><span>ITBIS ({taxRate}%)</span><span>{fmt(taxAmt, currency)}</span></div>}
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span className="text-violet-600">{fmt(total, currency)}</span></div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notas (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              placeholder="Términos de pago, condiciones, mensaje al cliente…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            <FileText className="w-4 h-4" />{saving ? "Guardando…" : "Crear factura"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EditInvoiceForm ──────────────────────────────────────────────────────────
function EditInvoiceForm({ invoice, clients, services, onClose, onSaved }: {
  invoice: Invoice; clients: Client[]; services: Service[];
  onClose: () => void; onSaved: (inv: Invoice) => void;
}) {
  const [clientId, setClientId]   = useState(invoice.client?.id ?? "");
  const [issueDate, setIssueDate] = useState(invoice.issue_date?.slice(0, 10) ?? "");
  const [dueDate, setDueDate]     = useState(invoice.due_date?.slice(0, 10) ?? "");
  const [notes, setNotes]         = useState(invoice.notes ?? "");
  const [taxRate, setTaxRate]     = useState(Number(invoice.tax_rate ?? 0));
  const [currency, setCurrency]   = useState(invoice.currency ?? "USD");
  const [status, setStatus]       = useState(invoice.status ?? "draft");
  const [saving, setSaving]       = useState(false);
  const [loadingItems, setLoadingItems] = useState(true);
  const [items, setItems]         = useState<InvoiceItem[]>([]);
  const [serviceSearch, setServiceSearch] = useState<number | null>(null);

  // Cargar ítems actuales
  useEffect(() => {
    fetch(`/api/invoices/${invoice.id}`)
      .then((r) => r.json())
      .then((data) => {
        const loaded = (data.items ?? []).map((it: any) => ({
          description: it.description, quantity: Number(it.quantity),
          unit_price: Number(it.unit_price), total: Number(it.total), service_id: it.service_id ?? null,
        }));
        setItems(loaded.length ? loaded : [{ description: "", quantity: 1, unit_price: 0, total: 0, service_id: null }]);
        setLoadingItems(false);
      })
      .catch(() => { setItems([{ description: "", quantity: 1, unit_price: 0, total: 0, service_id: null }]); setLoadingItems(false); });
  }, [invoice.id]);

  function setItem(i: number, patch: Partial<InvoiceItem>) {
    setItems((prev) => prev.map((it, idx) => {
      if (idx !== i) return it;
      const next = { ...it, ...patch };
      next.total = Number(next.quantity) * Number(next.unit_price);
      return next;
    }));
  }

  function applyService(i: number, svc: Service) {
    setItem(i, { description: svc.name, unit_price: svc.unit_price, service_id: svc.id });
    setServiceSearch(null);
  }

  function addItem() { setItems((p) => [...p, { description: "", quantity: 1, unit_price: 0, total: 0, service_id: null }]); }
  function removeItem(i: number) { setItems((p) => p.filter((_, idx) => idx !== i)); }

  const subtotal = items.reduce((s, it) => s + Number(it.total), 0);
  const taxAmt   = subtotal * (taxRate / 100);
  const total    = subtotal + taxAmt;

  async function save() {
    if (items.some((it) => !it.description.trim())) { toast.error("Todos los ítems deben tener descripción"); return; }
    setSaving(true);
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId || null, issue_date: issueDate, due_date: dueDate || null, notes, tax_rate: taxRate, currency, status, items }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved({ ...invoice, client: clients.find((c) => c.id === clientId) ?? invoice.client, issue_date: issueDate, due_date: dueDate || undefined, notes, tax_rate: taxRate, currency, status, subtotal, total });
    } else {
      toast.error("Error al guardar");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Editar {invoice.invoice_number}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Los cambios reemplazarán la factura actual</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loadingItems ? (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm gap-2">
              <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              Cargando datos…
            </div>
          ) : (
            <>
              {/* Cliente + estado */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Cliente</label>
                  <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                    <option value="">Sin cliente</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Estado</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                    <option value="draft">Borrador</option>
                    <option value="sent">Enviada</option>
                    <option value="paid">Pagada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Fechas + moneda */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Emisión</label>
                  <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 [color-scheme:light]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Vencimiento</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 [color-scheme:light]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Moneda</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400">
                    <option value="USD">USD</option><option value="DOP">DOP</option><option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Ítems */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Servicios / Ítems</label>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2 relative">
                      {items.length > 1 && (
                        <button onClick={() => removeItem(i)} className="absolute top-2 right-2 text-gray-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                      )}
                      <div className="relative">
                        <input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })}
                          onFocus={() => setServiceSearch(i)}
                          placeholder="Descripción…"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
                        {serviceSearch === i && services.length > 0 && (
                          <div className="absolute top-10 left-0 z-20 w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                            {services.filter((s) => !it.description || s.name.toLowerCase().includes(it.description.toLowerCase())).map((svc) => (
                              <button key={svc.id} onMouseDown={() => applyService(i, svc)}
                                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 text-sm text-left">
                                <span className="font-medium text-gray-800">{svc.name}</span>
                                <span className="text-xs font-semibold text-violet-600 ml-3">{fmt(svc.unit_price, currency)}</span>
                              </button>
                            ))}
                            <button onMouseDown={() => setServiceSearch(null)} className="w-full text-xs text-gray-400 px-3 py-1.5 text-left hover:text-gray-600">↩ Escribir manualmente</button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Cant.</label>
                          <input type="number" min="0.01" step="0.01" value={it.quantity}
                            onChange={(e) => setItem(i, { quantity: Number(e.target.value) })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Precio unit.</label>
                          <input type="number" min="0" step="0.01" value={it.unit_price}
                            onChange={(e) => setItem(i, { unit_price: Number(e.target.value) })}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400" />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Total</label>
                          <div className="w-full border border-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-gray-50">{fmt(it.total, currency)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addItem}
                    className="w-full text-xs text-gray-400 hover:text-violet-600 border border-dashed border-gray-200 hover:border-violet-300 rounded-lg py-2 transition-colors">
                    + Agregar ítem
                  </button>
                </div>
              </div>

              {/* ITBIS + Totales */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">ITBIS (%)</label>
                  <input type="number" min="0" max="100" step="0.5" value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
                </div>
                <div className="flex flex-col justify-end">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 space-y-1">
                    <div className="flex justify-between text-xs text-gray-500"><span>Subtotal</span><span>{fmt(subtotal, currency)}</span></div>
                    {taxRate > 0 && <div className="flex justify-between text-xs text-gray-500"><span>ITBIS ({taxRate}%)</span><span>{fmt(taxAmt, currency)}</span></div>}
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span className="text-violet-600">{fmt(total, currency)}</span></div>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notas</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                  placeholder="Términos de pago, condiciones…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 resize-none" />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={save} disabled={saving || loadingItems}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            <Pencil className="w-4 h-4" />{saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ServiceForm ──────────────────────────────────────────────────────────────
function ServiceForm({ onClose, onCreated }: { onClose: () => void; onCreated: (s: Service) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState(0);
  const [unit, setUnit] = useState("servicio");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);
    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description || null, unit_price: unitPrice, unit }),
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
          <h2 className="text-base font-semibold text-gray-900">Nuevo servicio</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Gestión de redes sociales"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descripción</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              placeholder="Descripción breve del servicio…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Precio (USD)</label>
              <input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Unidad</label>
              <input value={unit} onChange={(e) => setUnit(e.target.value)}
                placeholder="servicio, mes, hora…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
            {saving ? "Guardando…" : "Guardar servicio"}
          </button>
        </div>
      </div>
    </div>
  );
}
