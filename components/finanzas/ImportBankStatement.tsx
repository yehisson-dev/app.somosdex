"use client";

import { useState, useRef } from "react";
import {
  X, Upload, Loader2, CheckCircle2, ChevronDown,
  Sparkles, ArrowRight, Ban, DollarSign, Receipt, ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RawTxn {
  date: string;
  description: string;
  amount: number;
  type: "credit" | "debit";
  reference?: string;
  // AI suggestions
  suggested_category_id: string | null;
  suggested_category_name: string | null;
  suggested_invoice_id: string | null;
  suggested_transfer_account_id: string | null;
  suggested_invoice_number: string | null;
  suggested_company: string;
  ai_note: string;
  // User decisions
  action: "expense" | "income" | "transfer" | "ignore";
  category_id: string | null;
  category_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  transfer_account_id: string | null;
  company: string;
  confirmed: boolean;
}

interface Category { id: string; name: string }
interface Invoice  { id: string; invoice_number: string; total: number; currency: string; client_name: string; status: string }

const ACTION_CONFIG = {
  expense:  { label: "Gasto",        icon: Receipt,         color: "bg-red-50 text-red-700 border-red-200" },
  income:   { label: "Ingreso",      icon: DollarSign,      color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  transfer: { label: "Transferencia",icon: ArrowLeftRight,  color: "bg-blue-50 text-blue-700 border-blue-200" },
  ignore:   { label: "Ignorar",      icon: Ban,             color: "bg-gray-50 text-gray-500 border-gray-200" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP" }).format(n);
}
function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
}

export function ImportBankStatement({
  bankAccounts,
  onClose,
  onImported,
}: {
  bankAccounts: { id: string; name: string }[];
  onClose: () => void;
  onImported: () => void;
}) {
  const [step, setStep] = useState<"upload" | "review" | "done">("upload");
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? "");
  const [file, setFile]         = useState<File | null>(null);
  const [loading, setLoading]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [txns, setTxns]         = useState<RawTxn[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [result, setResult]     = useState<{ expensesCreated: number; invoicesMarked: number; ignored: number } | null>(null);
  const [filter, setFilter]     = useState<"all" | "expense" | "income" | "transfer" | "ignore">("all");
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Parse file with AI ─────────────────────────────────────────────────────
  async function handleUpload() {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    if (bankAccountId) fd.append("bank_account_id", bankAccountId);

    const res = await fetch("/api/bank-statements/parse", { method: "POST", body: fd });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Error al parsear el archivo");
      return;
    }
    const data = await res.json();
    setCategories(data.categories ?? []);
    setInvoices(data.invoices ?? []);

    // Copy AI suggestions → user decisions (pre-filled)
    const normalized: RawTxn[] = (data.transactions ?? []).map((t: any) => ({
      ...t,
      category_id:          t.suggested_category_id,
      category_name:        t.suggested_category_name,
      invoice_id:           t.suggested_invoice_id,
      invoice_number:       t.suggested_invoice_number,
      transfer_account_id:  t.suggested_transfer_account_id ?? null,
      company:              t.suggested_company ?? "DEX",
      confirmed:            t.action === "ignore" || t.action === "transfer", // auto-confirm these
    }));
    setTxns(normalized);
    setStep("review");
  }

  // ── Per-row updates ────────────────────────────────────────────────────────
  function updateTxn(i: number, patch: Partial<RawTxn>) {
    setTxns(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t));
  }
  function confirmAll() {
    setTxns(prev => prev.map(t => ({ ...t, confirmed: true })));
  }
  function acceptAI(i: number) {
    const t = txns[i];
    updateTxn(i, {
      category_id:   t.suggested_category_id,
      category_name: t.suggested_category_name,
      invoice_id:    t.suggested_invoice_id,
      invoice_number: t.suggested_invoice_number,
      company:       t.suggested_company,
      confirmed: true,
    });
  }

  // ── Import ─────────────────────────────────────────────────────────────────
  async function handleImport() {
    const toImport = txns.filter(t => t.confirmed);
    if (toImport.length === 0) { toast.error("Confirma al menos una transacción"); return; }

    setImporting(true);
    const res = await fetch("/api/bank-statements/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bank_account_id: bankAccountId || null,
        rows: toImport.map(t => ({
          date: t.date, description: t.description, amount: t.amount,
          type: t.type, action: t.action,
          category_id: t.category_id || null,
          invoice_id:  t.invoice_id  || null,
          company:     t.company     || "DEX",
        })),
      }),
    });
    setImporting(false);
    if (res.ok) {
      setResult(await res.json());
      setStep("done");
      onImported();
    } else {
      toast.error("Error al importar");
    }
  }

  const filtered = txns.filter(t => filter === "all" || t.action === filter);
  const confirmedCount = txns.filter(t => t.confirmed).length;
  const totalCount     = txns.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn(
        "relative bg-white rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150 w-full mx-4",
        step === "review" ? "max-w-6xl max-h-[90vh]" : "max-w-lg"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Importar estado de cuenta</h2>
            {step === "review" && (
              <p className="text-xs text-gray-500 mt-0.5">
                {confirmedCount}/{totalCount} confirmadas · {txns.filter(t => t.action === "expense").length} gastos · {txns.filter(t => t.action === "income").length} ingresos
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── STEP 1: Upload ──────────────────────────────────────────────── */}
        {step === "upload" && (
          <div className="p-6 space-y-5">
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-700">
              <p className="font-semibold mb-1">Bancos compatibles</p>
              <p className="text-xs text-violet-600">Banco Popular (CSV) · Banreservas (XLS) · BHD León (XLSX)</p>
            </div>

            {/* Bank account selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Cuenta bancaria
              </label>
              <select value={bankAccountId} onChange={e => setBankAccountId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 bg-white">
                <option value="">Sin asignar</option>
                {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            {/* File drop zone */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Archivo del estado de cuenta
              </label>
              <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <button onClick={() => fileRef.current?.click()}
                className={cn(
                  "w-full border-2 border-dashed rounded-xl py-10 flex flex-col items-center gap-3 transition-colors",
                  file ? "border-violet-400 bg-violet-50" : "border-gray-200 hover:border-violet-300 hover:bg-gray-50"
                )}>
                {file ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-violet-500" />
                    <p className="text-sm font-medium text-violet-700">{file.name}</p>
                    <p className="text-xs text-violet-500">{(file.size / 1024).toFixed(0)} KB · Haz clic para cambiar</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400" />
                    <p className="text-sm text-gray-500">Arrastra tu archivo aquí o haz clic para seleccionar</p>
                    <p className="text-xs text-gray-400">CSV, XLS, XLSX</p>
                  </>
                )}
              </button>
            </div>

            <button onClick={handleUpload} disabled={!file || loading}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors">
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analizando con IA…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Analizar y clasificar</>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: Review ─────────────────────────────────────────────── */}
        {step === "review" && (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0 flex-wrap">
              {/* Filter tabs */}
              <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                {(["all","expense","income","transfer","ignore"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={cn("px-3 py-1 rounded-md text-xs font-medium transition-colors",
                      filter === f ? "bg-violet-600 text-white" : "text-gray-500 hover:text-gray-700")}>
                    {f === "all"      ? `Todos (${txns.length})` :
                     f === "expense"  ? `Gastos (${txns.filter(t=>t.action==="expense").length})` :
                     f === "income"   ? `Ingresos (${txns.filter(t=>t.action==="income").length})` :
                     f === "transfer" ? `Transferencias (${txns.filter(t=>t.action==="transfer").length})` :
                     `Ignorar (${txns.filter(t=>t.action==="ignore").length})`}
                  </button>
                ))}
              </div>

              <div className="ml-auto flex gap-2">
                <button onClick={confirmAll}
                  className="text-xs text-violet-600 hover:text-violet-700 font-medium px-3 py-1.5 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors">
                  Confirmar todo
                </button>
                <button onClick={handleImport} disabled={importing || confirmedCount === 0}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                  Importar {confirmedCount > 0 ? `(${confirmedCount})` : ""}
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Fecha</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Monto</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Acción</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Categoría / Factura</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Empresa</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24">Confirmar</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, rawIdx) => {
                    const i = txns.indexOf(t);
                    const ac = ACTION_CONFIG[t.action];
                    return (
                      <tr key={i} className={cn(
                        "border-b border-gray-50 hover:bg-gray-50/50 transition-colors",
                        t.confirmed && "bg-emerald-50/30"
                      )}>
                        {/* Date */}
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {fmtDate(t.date)}
                        </td>

                        {/* Description + AI note */}
                        <td className="px-4 py-2.5 max-w-xs">
                          <p className="text-sm text-gray-800 truncate" title={t.description}>{t.description}</p>
                          {t.ai_note && (
                            <p className="text-[10px] text-violet-500 flex items-center gap-0.5 mt-0.5">
                              <Sparkles className="w-2.5 h-2.5 shrink-0" />
                              {t.ai_note}
                            </p>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <span className={cn("font-semibold text-sm",
                            t.type === "credit" ? "text-emerald-600" : "text-red-500")}>
                            {t.type === "credit" ? "+" : "-"}{fmt(t.amount)}
                          </span>
                        </td>

                        {/* Action selector */}
                        <td className="px-4 py-2.5">
                          <div className="relative">
                            <select
                              value={t.action}
                              onChange={e => updateTxn(i, { action: e.target.value as any, confirmed: false })}
                              className={cn("w-full text-xs font-medium px-2 py-1 rounded-lg border focus:outline-none appearance-none pr-6", ac.color)}>
                              <option value="expense">💸 Gasto</option>
                              <option value="income">💰 Ingreso</option>
                              <option value="transfer">↔ Transferencia</option>
                              <option value="ignore">⊘ Ignorar</option>
                            </select>
                            <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 pointer-events-none opacity-60" />
                          </div>
                        </td>

                        {/* Category / Invoice */}
                        <td className="px-4 py-2.5">
                          {t.action === "expense" && (
                            <div className="relative">
                              <select
                                value={t.category_id ?? ""}
                                onChange={e => {
                                  const cat = categories.find(c => c.id === e.target.value);
                                  updateTxn(i, { category_id: e.target.value || null, category_name: cat?.name ?? null });
                                }}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400 bg-white appearance-none pr-5">
                                <option value="">Sin categoría</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 pointer-events-none text-gray-400" />
                            </div>
                          )}
                          {t.action === "income" && (
                            <div className="relative">
                              <select
                                value={t.invoice_id ?? ""}
                                onChange={e => {
                                  const inv = invoices.find(x => x.id === e.target.value);
                                  updateTxn(i, { invoice_id: e.target.value || null, invoice_number: inv?.invoice_number ?? null });
                                }}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400 bg-white appearance-none pr-5">
                                <option value="">Sin factura</option>
                                {invoices.map(inv => (
                                  <option key={inv.id} value={inv.id}>
                                    {inv.invoice_number} — {inv.client_name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 pointer-events-none text-gray-400" />
                            </div>
                          )}
                          {t.action === "transfer" && (
                            <div className="relative">
                              <select
                                value={t.transfer_account_id ?? ""}
                                onChange={e => updateTxn(i, { transfer_account_id: e.target.value || null })}
                                className="w-full text-xs border border-blue-200 rounded-lg px-2 py-1 focus:outline-none focus:border-blue-400 bg-blue-50 appearance-none pr-5">
                                <option value="">Cuenta contraparte</option>
                                {bankAccounts
                                  .filter(b => b.id !== bankAccountId)
                                  .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                              <ChevronDown className="absolute right-1.5 top-1.5 w-3 h-3 pointer-events-none text-blue-400" />
                            </div>
                          )}
                          {t.action === "ignore" && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>

                        {/* Company */}
                        <td className="px-4 py-2.5">
                          {t.action !== "ignore" && (
                            <select value={t.company} onChange={e => updateTxn(i, { company: e.target.value })}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-400 bg-white w-full">
                              <option value="DEX">DEX</option>
                              <option value="CUBO">CUBO</option>
                              <option value="YEHISSON">YEHISSON</option>
                            </select>
                          )}
                        </td>

                        {/* Confirm button */}
                        <td className="px-4 py-2.5 text-center">
                          {t.confirmed ? (
                            <button onClick={() => updateTxn(i, { confirmed: false })}
                              className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium hover:text-emerald-700">
                              <CheckCircle2 className="w-4 h-4" /> OK
                            </button>
                          ) : (
                            <button onClick={() => updateTxn(i, { confirmed: true })}
                              className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-violet-600 border border-gray-200 hover:border-violet-400 rounded-lg px-2 py-0.5 transition-colors">
                              Confirmar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">Sin transacciones en este filtro</div>
              )}
            </div>
          </>
        )}

        {/* ── STEP 3: Done ───────────────────────────────────────────────── */}
        {step === "done" && result && (
          <div className="p-8 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-semibold text-gray-900">¡Importación completada!</h3>
            <div className="flex justify-center gap-6 text-sm">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{result.expensesCreated}</p>
                <p className="text-gray-500">gastos registrados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{result.invoicesMarked}</p>
                <p className="text-gray-500">facturas marcadas pagadas</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-400">{result.ignored}</p>
                <p className="text-gray-500">ignoradas</p>
              </div>
            </div>
            <button onClick={onClose}
              className="mt-4 bg-violet-600 hover:bg-violet-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
