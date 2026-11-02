"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, ChevronDown, ChevronRight, Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PnLData {
  month: number; year: number; company: string; exchange_rate: number;
  ingresos: { usd: number; dop: number; total_dop: number; detail: any[] };
  gastos: { total_dop: number; by_category: any[] };
  utilidad_dop: number; margen_pct: number | null;
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const COMPANIES = [{ v: "all", l: "Todas las empresas" }, { v: "CUBO", l: "CUBO" }, { v: "DEX", l: "DEX" }, { v: "YEHISSON", l: "YEHISSON" }];

function fmt(n: number, cur = "DOP") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
}

function exportCSV(data: PnLData) {
  const rows: string[] = [
    `P&L — ${MONTHS[data.month - 1]} ${data.year}`,
    `Tasa USD/DOP,${data.exchange_rate}`,
    "",
    "INGRESOS",
    "Fecha,Factura,Cliente,Monto,Moneda",
    ...data.ingresos.detail.map(r =>
      `${r.date},${r.invoice_number ?? ""},${r.client ?? ""},${r.amount},${r.currency}`
    ),
    `,,Total ingresos DOP,${data.ingresos.total_dop.toFixed(2)},`,
    "",
    "GASTOS POR CATEGORÍA",
    "Categoría,Total DOP",
    ...data.gastos.by_category.map(c =>
      `${c.category_name},${c.total_dop.toFixed(2)}`
    ),
    `Total gastos DOP,${data.gastos.total_dop.toFixed(2)}`,
    "",
    `UTILIDAD DOP,${data.utilidad_dop.toFixed(2)}`,
    `MARGEN,${data.margen_pct ?? 0}%`,
  ];
  const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = `PnL_${data.year}_${String(data.month).padStart(2,"0")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export function PnLView() {
  const now = new Date();
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [company, setCompany] = useState("all");
  const [data,    setData]    = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(false);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finanzas/pnl?month=${month}&year=${year}&company=${company}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [month, year, company]);

  useEffect(() => { load(); }, [load]);

  const toggleCat = (id: string) => setOpenCats(p => ({ ...p, [id]: !p[id] }));

  if (loading && !data) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={month} onChange={e => setMonth(+e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-violet-400">
          {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-violet-400">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={company} onChange={e => setCompany(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-violet-400">
          {COMPANIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
        </select>
        {data && (
          <button onClick={() => exportCSV(data)}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 border border-gray-200 hover:border-violet-300 rounded-lg px-3 py-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </button>
        )}
      </div>

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs text-emerald-600 font-medium mb-1">Ingresos cobrados</p>
              <p className="text-2xl font-bold text-emerald-700">{fmt(data.ingresos.total_dop)}</p>
              {data.ingresos.usd > 0 && (
                <p className="text-xs text-emerald-500 mt-1">{fmt(data.ingresos.usd, "USD")} USD + {fmt(data.ingresos.dop)} DOP</p>
              )}
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs text-red-500 font-medium mb-1">Gastos</p>
              <p className="text-2xl font-bold text-red-600">{fmt(data.gastos.total_dop)}</p>
            </div>
            <div className={cn("border rounded-xl p-4",
              data.utilidad_dop >= 0 ? "bg-violet-50 border-violet-200" : "bg-orange-50 border-orange-200")}>
              <p className={cn("text-xs font-medium mb-1", data.utilidad_dop >= 0 ? "text-violet-600" : "text-orange-600")}>
                Utilidad neta {data.margen_pct !== null && `· ${data.margen_pct}%`}
              </p>
              <div className="flex items-center gap-2">
                {data.utilidad_dop >= 0
                  ? <TrendingUp className="w-5 h-5 text-violet-500 shrink-0" />
                  : <TrendingDown className="w-5 h-5 text-orange-500 shrink-0" />}
                <p className={cn("text-2xl font-bold", data.utilidad_dop >= 0 ? "text-violet-700" : "text-orange-600")}>
                  {fmt(Math.abs(data.utilidad_dop))}
                </p>
              </div>
            </div>
          </div>

          {/* Margen visual */}
          {data.ingresos.total_dop > 0 && (
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Gastos</span><span>Utilidad</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="bg-red-400 h-full transition-all"
                  style={{ width: `${Math.min(100, (data.gastos.total_dop / data.ingresos.total_dop) * 100)}%` }} />
                <div className="bg-emerald-400 h-full flex-1 transition-all" />
              </div>
            </div>
          )}

          {/* Sección Ingresos */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ingresos</h3>
              <span className="text-xs font-semibold text-emerald-600">{fmt(data.ingresos.total_dop)}</span>
            </div>
            {data.ingresos.detail.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">Sin pagos recibidos este mes</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Fecha</th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Cliente</th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Factura</th>
                    <th className="text-right px-4 py-2 text-gray-400 font-medium">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ingresos.detail.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{fmtDate(r.date)}</td>
                      <td className="px-4 py-2 text-gray-700 font-medium">{r.client ?? "—"}</td>
                      <td className="px-4 py-2 text-gray-400">{r.invoice_number ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-emerald-600 font-medium">
                        {fmt(r.amount, r.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Sección Gastos */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Gastos por categoría</h3>
              <span className="text-xs font-semibold text-red-500">{fmt(data.gastos.total_dop)}</span>
            </div>
            {data.gastos.by_category.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">Sin gastos registrados este mes</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.gastos.by_category.map((cat, i) => (
                  <div key={i}>
                    <button
                      onClick={() => toggleCat(cat.category_id ?? "none")}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
                    >
                      {openCats[cat.category_id ?? "none"]
                        ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.category_color }} />
                      <span className="text-xs text-gray-700 flex-1 font-medium">{cat.category_name}</span>
                      <span className="text-xs text-red-500 font-medium">{fmt(cat.total_dop)}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {data.gastos.total_dop > 0
                          ? `${Math.round((cat.total_dop / data.gastos.total_dop) * 100)}%`
                          : ""}
                      </span>
                    </button>
                    {openCats[cat.category_id ?? "none"] && (
                      <div className="pl-8 pb-2">
                        <table className="w-full text-xs">
                          <tbody>
                            {(cat.detail ?? []).map((d: any, j: number) => (
                              <tr key={j} className="border-b border-gray-50">
                                <td className="px-4 py-1.5 text-gray-400">{fmtDate(d.date)}</td>
                                <td className="px-4 py-1.5 text-gray-600">{d.description}</td>
                                <td className="px-4 py-1.5 text-right text-red-400">{fmt(d.amount, d.currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-300 text-right">
            Tasa: 1 USD = {data.exchange_rate} DOP · Todos los montos convertidos a DOP
          </p>
        </>
      )}
    </div>
  );
}
