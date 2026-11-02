"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, Loader2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonthData {
  key: string; label: string;
  is_past: boolean; is_current: boolean; is_future: boolean;
  ingresos: number; proyectado_ingresos: number;
  gastos_reales: number; gastos_proyectados: number;
  neto: number;
}

function fmt(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000)     return `${(n/1_000).toFixed(0)}K`;
  return n.toFixed(0);
}
function fmtFull(n: number) {
  return new Intl.NumberFormat("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 }).format(n);
}

function exportCSV(months: MonthData[]) {
  const rows = [
    "Mes,Ingresos reales,Ingresos proyectados,Gastos reales,Gastos proyectados,Neto",
    ...months.map(m =>
      `${m.key},${m.ingresos.toFixed(2)},${m.proyectado_ingresos.toFixed(2)},${m.gastos_reales.toFixed(2)},${m.gastos_proyectados.toFixed(2)},${m.neto.toFixed(2)}`
    ),
  ];
  const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href = url;
  a.download = `FlujoCaja_${new Date().getFullYear()}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export function CashFlowView() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(false);
  const [monthCount, setMonthCount] = useState(6);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finanzas/cashflow?months=${monthCount}`);
      const d = await res.json();
      setMonths(d.months ?? []);
    } finally { setLoading(false); }
  }, [monthCount]);

  useEffect(() => { load(); }, [load]);

  const maxVal = Math.max(...months.map(m =>
    Math.max(m.ingresos + m.proyectado_ingresos, m.gastos_reales + m.gastos_proyectados, 1)
  ));

  if (loading && months.length === 0) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={monthCount} onChange={e => setMonthCount(+e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-violet-400">
          <option value={4}>4 meses</option>
          <option value={6}>6 meses</option>
          <option value={9}>9 meses</option>
          <option value={12}>12 meses</option>
        </select>
        <div className="flex items-center gap-4 ml-auto">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded bg-emerald-400 inline-block" /> Ingresos reales
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded bg-emerald-200 border border-dashed border-emerald-400 inline-block" /> Por cobrar
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-3 h-3 rounded bg-red-400 inline-block" /> Gastos
          </span>
          <button onClick={() => exportCSV(months)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 border border-gray-200 hover:border-violet-300 rounded-lg px-3 py-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-end gap-3" style={{ height: 200 }}>
          {months.map(m => {
            const ingHeight   = ((m.ingresos / maxVal) * 180);
            const projHeight  = ((m.proyectado_ingresos / maxVal) * 180);
            const gastHeight  = (((m.gastos_reales + m.gastos_proyectados) / maxVal) * 180);
            return (
              <div key={m.key} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col gap-1 bg-gray-900 text-white text-[10px] rounded-lg p-2 whitespace-nowrap z-10 shadow-lg">
                  <span className="font-semibold">{m.key}</span>
                  {m.ingresos > 0    && <span className="text-emerald-300">↑ {fmtFull(m.ingresos)}</span>}
                  {m.proyectado_ingresos > 0 && <span className="text-emerald-200">↑ {fmtFull(m.proyectado_ingresos)} proyectado</span>}
                  {(m.gastos_reales + m.gastos_proyectados) > 0 && <span className="text-red-300">↓ {fmtFull(m.gastos_reales + m.gastos_proyectados)}</span>}
                  <span className={m.neto >= 0 ? "text-violet-300" : "text-orange-300"}>
                    = {fmtFull(m.neto)}
                  </span>
                </div>
                {/* Barras */}
                <div className="flex gap-0.5 items-end w-full">
                  {/* Ingresos (real + proyectado stacked) */}
                  <div className="flex-1 flex flex-col justify-end" style={{ height: 180 }}>
                    {m.proyectado_ingresos > 0 && (
                      <div className="bg-emerald-200 border border-dashed border-emerald-400 rounded-t"
                        style={{ height: projHeight }} />
                    )}
                    {m.ingresos > 0 && (
                      <div className={cn("rounded", m.proyectado_ingresos > 0 ? "bg-emerald-400" : "bg-emerald-400 rounded-t")}
                        style={{ height: ingHeight }} />
                    )}
                  </div>
                  {/* Gastos */}
                  <div className="flex-1 flex flex-col justify-end" style={{ height: 180 }}>
                    {(m.gastos_reales + m.gastos_proyectados) > 0 && (
                      <div className="bg-red-400 rounded-t" style={{ height: gastHeight }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Labels */}
        <div className="flex gap-3 mt-2">
          {months.map(m => (
            <div key={m.key} className={cn(
              "flex-1 text-center text-[10px] font-medium",
              m.is_current ? "text-violet-500" : "text-gray-400"
            )}>
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Mes</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Ingresos reales</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Por cobrar</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Gastos</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Neto</th>
            </tr>
          </thead>
          <tbody>
            {months.map(m => (
              <tr key={m.key} className={cn(
                "border-b border-gray-50",
                m.is_current && "bg-violet-50/50",
                m.is_future && "opacity-70"
              )}>
                <td className="px-4 py-2.5 font-medium text-gray-700 flex items-center gap-1.5">
                  {m.key}
                  {m.is_current && <span className="text-[9px] bg-violet-100 text-violet-600 px-1.5 rounded-full">Hoy</span>}
                  {m.is_future  && <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 rounded-full">Proyectado</span>}
                </td>
                <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">
                  {m.ingresos > 0 ? fmtFull(m.ingresos) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right text-emerald-400">
                  {m.proyectado_ingresos > 0 ? fmtFull(m.proyectado_ingresos) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right text-red-500">
                  {(m.gastos_reales + m.gastos_proyectados) > 0
                    ? fmtFull(m.gastos_reales + m.gastos_proyectados)
                    : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <span className={cn("font-semibold flex items-center justify-end gap-1",
                    m.neto > 0 ? "text-emerald-600" : m.neto < 0 ? "text-red-500" : "text-gray-400")}>
                    {m.neto > 0 && <TrendingUp className="w-3 h-3" />}
                    {m.neto < 0 && <TrendingDown className="w-3 h-3" />}
                    {m.neto === 0 && <Minus className="w-3 h-3" />}
                    {fmtFull(m.neto)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
