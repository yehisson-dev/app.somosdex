"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  invoice_number: string;
  total: number;
  currency: string;
  status: string;
  due_date?: string | null;
  issue_date?: string | null;
  client?: { id: string; name: string } | null;
}

function fmt(n: number, cur = "USD") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: cur }).format(Number(n));
}
function daysDue(due?: string | null): number {
  if (!due) return 0;
  const d = new Date(due.slice(0, 10) + "T00:00:00");
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d.slice(0, 10) + "T00:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" });
}

const BUCKETS = [
  { label: "Al día",     min: -Infinity, max: 0,  color: "emerald", bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  { label: "1–30 días",  min: 1,  max: 30, color: "amber",   bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700",   badge: "bg-amber-100 text-amber-700" },
  { label: "31–60 días", min: 31, max: 60, color: "orange",  bg: "bg-orange-50",  border: "border-orange-200",  text: "text-orange-700",  badge: "bg-orange-100 text-orange-700" },
  { label: "61–90 días", min: 61, max: 90, color: "red",     bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700",     badge: "bg-red-100 text-red-700" },
  { label: "+90 días",   min: 91, max: Infinity, color: "rose", bg: "bg-rose-50",  border: "border-rose-200",    text: "text-rose-800",    badge: "bg-rose-100 text-rose-800" },
] as const;

function getBucket(days: number) {
  return BUCKETS.find(b => days >= b.min && days <= b.max) ?? BUCKETS[0];
}

export function AgingView({
  invoices,
  onOpenPayments,
}: {
  invoices: Invoice[];
  onOpenPayments?: (inv: Invoice) => void;
}) {
  const [currency, setCurrency] = useState<"USD" | "DOP">("USD");

  const unpaid = useMemo(() =>
    invoices
      .filter(inv => ["sent", "partially_paid"].includes(inv.status))
      .map(inv => ({ ...inv, days: daysDue(inv.due_date) }))
      .sort((a, b) => b.days - a.days),
    [invoices]
  );

  const bucketData = useMemo(() =>
    BUCKETS.map(b => {
      const items = unpaid.filter(inv => inv.days >= b.min && inv.days <= b.max);
      const total = items.reduce((s, i) => s + Number(i.total), 0);
      return { ...b, items, total };
    }),
    [unpaid]
  );

  const grandTotal = unpaid.reduce((s, i) => s + Number(i.total), 0);

  if (unpaid.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        <p className="text-base font-medium text-gray-500">No hay facturas pendientes de cobro</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Aging de cartera</h2>
          <p className="text-sm text-gray-400 mt-0.5">{unpaid.length} facturas pendientes</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total por cobrar</p>
          <p className="text-xl font-bold text-gray-900">{fmt(grandTotal, currency)}</p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="flex rounded-xl overflow-hidden h-3 gap-0.5">
        {bucketData.map(b =>
          b.total > 0 ? (
            <div
              key={b.label}
              title={`${b.label}: ${fmt(b.total, currency)}`}
              className={cn("transition-all", {
                "bg-emerald-400": b.color === "emerald",
                "bg-amber-400":   b.color === "amber",
                "bg-orange-400":  b.color === "orange",
                "bg-red-400":     b.color === "red",
                "bg-rose-500":    b.color === "rose",
              })}
              style={{ flex: b.total / grandTotal }}
            />
          ) : null
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {bucketData.map(b => (
          <div key={b.label} className={cn("flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border", b.bg, b.border, b.text)}>
            <span className={cn("w-2 h-2 rounded-full", {
              "bg-emerald-400": b.color === "emerald",
              "bg-amber-400":   b.color === "amber",
              "bg-orange-400":  b.color === "orange",
              "bg-red-400":     b.color === "red",
              "bg-rose-500":    b.color === "rose",
            })} />
            {b.label}
            {b.items.length > 0 && (
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", b.badge)}>
                {b.items.length}
              </span>
            )}
            {b.total > 0 && <span className="opacity-70">{fmt(b.total, currency)}</span>}
          </div>
        ))}
      </div>

      {/* Buckets */}
      <div className="space-y-4">
        {bucketData.map(b => {
          if (b.items.length === 0) return null;
          return (
            <div key={b.label} className={cn("border rounded-2xl overflow-hidden", b.border)}>
              <div className={cn("flex items-center justify-between px-4 py-3", b.bg)}>
                <div className="flex items-center gap-2">
                  {b.color === "emerald" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : b.color === "rose" || b.color === "red" ? (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Clock className="w-4 h-4 text-amber-500" />
                  )}
                  <span className={cn("text-sm font-semibold", b.text)}>{b.label}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", b.badge)}>
                    {b.items.length} factura{b.items.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className={cn("text-sm font-bold", b.text)}>{fmt(b.total, currency)}</span>
              </div>

              <div className="divide-y divide-gray-100 bg-white">
                {b.items.map(inv => (
                  <div key={inv.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{inv.invoice_number}</span>
                        {inv.status === "partially_paid" && (
                          <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Pago parcial
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">{inv.client?.name ?? "Sin cliente"}</span>
                        {inv.due_date && (
                          <span className="text-xs text-gray-400">
                            Vence: {fmtDate(inv.due_date)}
                            {inv.days > 0 && (
                              <span className={cn("ml-1 font-medium", b.text)}>({inv.days}d)</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{fmt(inv.total, inv.currency)}</p>
                    </div>
                    {onOpenPayments && (
                      <button
                        onClick={() => onOpenPayments(inv)}
                        className="opacity-0 group-hover:opacity-100 text-xs font-medium text-violet-600 hover:text-violet-700 border border-violet-200 hover:bg-violet-50 px-2.5 py-1.5 rounded-lg transition-all whitespace-nowrap"
                      >
                        Registrar pago
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer tip */}
      {unpaid.some(i => i.days > 60) && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <TrendingDown className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600">
            <strong>{unpaid.filter(i => i.days > 60).length} facturas</strong> llevan más de 60 días sin cobrar.
            Considera contactar a los clientes o aplicar recargos por mora.
          </p>
        </div>
      )}
    </div>
  );
}
