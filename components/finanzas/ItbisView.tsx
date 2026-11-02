"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ItbisData {
  month: number; year: number; exchange_rate: number;
  itbis_cobrado: { total_dop: number; rows: any[] };
  itbis_pagado:  { total_dop: number; rows: any[] };
  itbis_neto_dop: number; balance: "a_pagar" | "a_favor";
}

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const COMPANIES = [{ v: "all", l: "Todas" }, { v: "CUBO", l: "CUBO" }, { v: "DEX", l: "DEX" }, { v: "YEHISSON", l: "YEHISSON" }];

function fmt(n: number, cur = "DOP") {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-DO", { day: "2-digit", month: "short" });
}

function exportCSV(data: ItbisData) {
  const rows: string[] = [
    `Reporte ITBIS — ${MONTHS[data.month - 1]} ${data.year}`,
    `Tasa USD/DOP,${data.exchange_rate}`,
    "",
    "ITBIS COBRADO (ventas)",
    "Fecha pago,Factura,Cliente,Monto pagado,Moneda,ITBIS",
    ...data.itbis_cobrado.rows.map(r =>
      `${r.payment_date},${r.invoice_number},${r.client_name ?? ""},${r.paid_amount},${r.currency},${r.itbis_amount}`
    ),
    `,,,,Total ITBIS cobrado DOP,${data.itbis_cobrado.total_dop.toFixed(2)}`,
    "",
    "ITBIS PAGADO (compras 18%)",
    "Fecha,Descripción,Monto,Moneda,ITBIS 18%",
    ...data.itbis_pagado.rows.map(r =>
      `${r.date},${r.description ?? ""},${r.amount},${r.currency},${r.itbis_amount}`
    ),
    `,,,,Total ITBIS pagado DOP,${data.itbis_pagado.total_dop.toFixed(2)}`,
    "",
    `ITBIS NETO DOP,${data.itbis_neto_dop.toFixed(2)}`,
    `Balance,${data.balance === "a_pagar" ? "A PAGAR" : "A FAVOR"}`,
  ];
  const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url;
  a.download = `ITBIS_${data.year}_${String(data.month).padStart(2,"0")}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export function ItbisView() {
  const now = new Date();
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [company, setCompany] = useState("all");
  const [data,    setData]    = useState<ItbisData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finanzas/itbis?month=${month}&year=${year}&company=${company}`);
      setData(await res.json());
    } finally { setLoading(false); }
  }, [month, year, company]);

  useEffect(() => { load(); }, [load]);

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
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">ITBIS cobrado</p>
              <p className="text-2xl font-bold text-blue-700">{fmt(data.itbis_cobrado.total_dop)}</p>
              <p className="text-[11px] text-blue-400 mt-1">{data.itbis_cobrado.rows.length} facturas</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <p className="text-xs text-orange-600 font-medium mb-1">ITBIS pagado (18% compras)</p>
              <p className="text-2xl font-bold text-orange-600">{fmt(data.itbis_pagado.total_dop)}</p>
              <p className="text-[11px] text-orange-400 mt-1">{data.itbis_pagado.rows.length} gastos</p>
            </div>
            <div className={cn("border rounded-xl p-4",
              data.balance === "a_pagar"
                ? "bg-red-50 border-red-200"
                : "bg-emerald-50 border-emerald-200")}>
              {data.balance === "a_pagar"
                ? <AlertTriangle className="w-4 h-4 text-red-500 mb-1" />
                : <CheckCircle2 className="w-4 h-4 text-emerald-500 mb-1" />}
              <p className={cn("text-xs font-medium",
                data.balance === "a_pagar" ? "text-red-500" : "text-emerald-600")}>
                ITBIS neto — {data.balance === "a_pagar" ? "a pagar" : "a favor"}
              </p>
              <p className={cn("text-2xl font-bold",
                data.balance === "a_pagar" ? "text-red-600" : "text-emerald-700")}>
                {fmt(Math.abs(data.itbis_neto_dop))}
              </p>
            </div>
          </div>

          {/* ITBIS cobrado */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                ITBIS cobrado — ventas ({data.itbis_cobrado.rows.length} registros)
              </h3>
            </div>
            {data.itbis_cobrado.rows.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">Sin cobros con ITBIS este mes</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Fecha</th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Factura</th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Cliente</th>
                    <th className="text-right px-4 py-2 text-gray-400 font-medium">Monto</th>
                    <th className="text-right px-4 py-2 text-gray-400 font-medium">ITBIS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.itbis_cobrado.rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{fmtDate(r.payment_date)}</td>
                      <td className="px-4 py-2 text-gray-600">{r.invoice_number}</td>
                      <td className="px-4 py-2 text-gray-700 font-medium">{r.client_name ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{fmt(r.paid_amount, r.currency)}</td>
                      <td className="px-4 py-2 text-right text-blue-600 font-medium">{fmt(r.itbis_amount, r.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50">
                    <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-blue-600">Total ITBIS cobrado</td>
                    <td className="px-4 py-2 text-right text-xs font-bold text-blue-700">{fmt(data.itbis_cobrado.total_dop)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* ITBIS pagado */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                ITBIS pagado — compras 18% ({data.itbis_pagado.rows.length} registros)
              </h3>
            </div>
            {data.itbis_pagado.rows.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">Sin gastos registrados este mes</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Fecha</th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Descripción</th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Categoría</th>
                    <th className="text-right px-4 py-2 text-gray-400 font-medium">Monto</th>
                    <th className="text-right px-4 py-2 text-gray-400 font-medium">ITBIS 18%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.itbis_pagado.rows.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{fmtDate(r.date)}</td>
                      <td className="px-4 py-2 text-gray-700">{r.description}</td>
                      <td className="px-4 py-2 text-gray-400">{r.category_name ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{fmt(r.amount, r.currency)}</td>
                      <td className="px-4 py-2 text-right text-orange-600 font-medium">{fmt(r.itbis_amount, r.currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-orange-50">
                    <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-orange-600">Total ITBIS pagado</td>
                    <td className="px-4 py-2 text-right text-xs font-bold text-orange-700">{fmt(data.itbis_pagado.total_dop)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          <p className="text-[10px] text-gray-300 text-right">
            Tasa: 1 USD = {data.exchange_rate} DOP · Se asume ITBIS 18% sobre todos los gastos
          </p>
        </>
      )}
    </div>
  );
}
