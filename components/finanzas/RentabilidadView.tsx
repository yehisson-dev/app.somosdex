"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Download, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientData {
  id: string; name: string; color: string;
  paid_dop: number; invoiced_dop: number; pending_dop: number;
  invoice_count: number; pct_of_total: number; collection_rate: number | null;
}
interface Prospect {
  id: string; name: string; company?: string; stage: string;
  value_dop: number; probability: number; weighted_dop: number;
}
interface RentData {
  year: number; exchange_rate: number;
  clients: ClientData[];
  total_paid_dop: number;
  pipeline: { prospects: Prospect[]; weighted_total_dop: number };
}

const STAGE_LABEL: Record<string, string> = {
  contacto: "Contacto", calificado: "Calificado", propuesta: "Propuesta",
  negociacion: "Negociación", ganado: "Ganado",
};
const STAGE_COLOR: Record<string, string> = {
  contacto: "bg-gray-100 text-gray-500", calificado: "bg-blue-100 text-blue-600",
  propuesta: "bg-violet-100 text-violet-600", negociacion: "bg-amber-100 text-amber-600",
  ganado: "bg-emerald-100 text-emerald-700",
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);
}

function exportCSV(data: RentData) {
  const rows = [
    `Rentabilidad por cliente — ${data.year}`,
    "",
    "INGRESOS POR CLIENTE",
    "Cliente,Cobrado DOP,Facturado DOP,Pendiente DOP,Facturas,% del total,Tasa cobro",
    ...data.clients.map(c =>
      `${c.name},${c.paid_dop.toFixed(2)},${c.invoiced_dop.toFixed(2)},${c.pending_dop.toFixed(2)},${c.invoice_count},${c.pct_of_total}%,${c.collection_rate ?? "N/A"}%`
    ),
    "",
    "PIPELINE PONDERADO",
    "Prospect,Empresa,Etapa,Valor DOP,Probabilidad,Valor ponderado",
    ...data.pipeline.prospects.map(p =>
      `${p.name},${p.company ?? ""},${STAGE_LABEL[p.stage] ?? p.stage},${p.value_dop.toFixed(2)},${Math.round(p.probability*100)}%,${p.weighted_dop.toFixed(2)}`
    ),
    `,,,,Total ponderado,${data.pipeline.weighted_total_dop.toFixed(2)}`,
  ];
  const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url;
  a.download = `Rentabilidad_${data.year}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export function RentabilidadView() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<RentData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finanzas/rentabilidad?year=${year}`);
      setData(await res.json());
    } finally { setLoading(false); }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={year} onChange={e => setYear(+e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-violet-400">
          {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
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
          {/* Resumen KPIs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs text-emerald-600 font-medium mb-1">Total cobrado {data.year}</p>
              <p className="text-2xl font-bold text-emerald-700">{fmt(data.total_paid_dop)}</p>
              <p className="text-[11px] text-emerald-500 mt-1">{data.clients.length} clientes activos</p>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <p className="text-xs text-violet-600 font-medium mb-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" /> Pipeline ponderado
              </p>
              <p className="text-2xl font-bold text-violet-700">{fmt(data.pipeline.weighted_total_dop)}</p>
              <p className="text-[11px] text-violet-400 mt-1">{data.pipeline.prospects.length} oportunidades activas</p>
            </div>
          </div>

          {/* Tabla clientes */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Ingresos por cliente</h3>
            </div>
            {data.clients.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">Sin clientes con pagos en {data.year}</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.clients.map((c, i) => (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <span className="text-[11px] text-gray-300 w-4 text-right shrink-0">{i + 1}</span>
                      {/* Dot */}
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      {/* Name */}
                      <span className="text-sm font-medium text-gray-800 flex-1">{c.name}</span>
                      {/* Paid */}
                      <span className="text-sm font-bold text-emerald-600">{fmt(c.paid_dop)}</span>
                      {/* Pct */}
                      <span className="text-xs text-gray-400 w-10 text-right">{c.pct_of_total}%</span>
                    </div>
                    {/* Bar */}
                    <div className="mt-2 ml-8 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400 transition-all"
                          style={{ width: `${c.pct_of_total}%` }} />
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 shrink-0">
                        {c.pending_dop > 0 && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <Clock className="w-3 h-3" /> Pendiente: {fmt(c.pending_dop)}
                          </span>
                        )}
                        {c.collection_rate !== null && (
                          <span className={cn(
                            "px-1.5 py-0.5 rounded-full font-medium",
                            c.collection_rate >= 80 ? "bg-emerald-50 text-emerald-600"
                              : c.collection_rate >= 50 ? "bg-amber-50 text-amber-600"
                              : "bg-red-50 text-red-500"
                          )}>
                            {c.collection_rate}% cobrado
                          </span>
                        )}
                        <span>{c.invoice_count} {c.invoice_count === 1 ? "factura" : "facturas"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline forecast */}
          {data.pipeline.prospects.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Forecast pipeline — {fmt(data.pipeline.weighted_total_dop)} ponderado
                </h3>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Prospect</th>
                    <th className="text-left px-4 py-2 text-gray-400 font-medium">Etapa</th>
                    <th className="text-right px-4 py-2 text-gray-400 font-medium">Valor</th>
                    <th className="text-right px-4 py-2 text-gray-400 font-medium">Prob.</th>
                    <th className="text-right px-4 py-2 text-gray-400 font-medium">Ponderado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.pipeline.prospects.map(p => (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-800">{p.name}</p>
                        {p.company && <p className="text-gray-400">{p.company}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", STAGE_COLOR[p.stage])}>
                          {STAGE_LABEL[p.stage] ?? p.stage}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(p.value_dop)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{Math.round(p.probability * 100)}%</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-violet-600">{fmt(p.weighted_dop)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-violet-50">
                    <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-violet-600">Total ponderado</td>
                    <td className="px-4 py-2 text-right text-xs font-bold text-violet-700">
                      {fmt(data.pipeline.weighted_total_dop)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
