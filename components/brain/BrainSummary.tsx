"use client";

import { useEffect, useState } from "react";
import {
  FileText, Link as LinkIcon, Type, CheckCircle,
  AlertCircle, Loader2, Layers, Hash, Calendar,
  TrendingUp, BookOpen, RefreshCw, Mic,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BrainSource {
  id: string;
  title: string;
  source_type: "pdf" | "url" | "text" | "audio";
  status: "processing" | "ready" | "error";
  chunk_count: number | null;
  content_preview: string | null;
  source_url: string | null;
  created_at: string;
  error_msg: string | null;
}

interface Props {
  brainType: "cubo" | "brand";
  brandId?: string | null;
}

const TYPE_CONFIG = {
  pdf:   { icon: FileText, label: "PDFs",         color: "text-red-500",    bg: "bg-red-50",    border: "border-red-100"    },
  url:   { icon: LinkIcon, label: "URLs",          color: "text-blue-500",   bg: "bg-blue-50",   border: "border-blue-100"   },
  text:  { icon: Type,     label: "Textos",        color: "text-gray-500",   bg: "bg-gray-50",   border: "border-gray-100"   },
  audio: { icon: Mic,      label: "Audio/Video",   color: "text-violet-500", bg: "bg-violet-50", border: "border-violet-100" },
};

const MONTHS_ES = [
  "enero","febrero","marzo","abril","mayo","junio",
  "julio","agosto","septiembre","octubre","noviembre","diciembre",
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function groupByMonth(sources: BrainSource[]) {
  const groups: Record<string, BrainSource[]> = {};
  for (const s of sources) {
    const d     = new Date(s.created_at);
    const key   = `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  }
  return groups;
}

export function BrainSummary({ brainType, brandId = null }: Props) {
  const [sources, setSources] = useState<BrainSource[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({ brain_type: brainType });
    if (brandId) params.set("brand_id", brandId);
    const res  = await fetch(`/api/brain/sources?${params}`);
    const json = await res.json();
    setSources(json.sources ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [brainType, brandId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  const ready      = sources.filter((s) => s.status === "ready");
  const processing = sources.filter((s) => s.status === "processing");
  const errored    = sources.filter((s) => s.status === "error");
  const totalChunks = ready.reduce((sum, s) => sum + (s.chunk_count ?? 0), 0);

  const byType = {
    pdf:   ready.filter((s) => s.source_type === "pdf"),
    url:   ready.filter((s) => s.source_type === "url"),
    text:  ready.filter((s) => s.source_type === "text"),
    audio: ready.filter((s) => s.source_type === "audio"),
  };

  const grouped = groupByMonth([...sources].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ));

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-violet-300" />
        </div>
        <p className="text-sm font-medium text-gray-500">El cerebro aún no ha aprendido nada</p>
        <p className="text-xs text-gray-400 mt-1">Añade fuentes en la pestaña "Fuentes" para empezar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Stats row ── */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          icon={<Layers className="w-4 h-4 text-violet-500" />}
          label="Fuentes listas"
          value={ready.length}
          bg="bg-violet-50"
        />
        <StatCard
          icon={<Hash className="w-4 h-4 text-indigo-500" />}
          label="Fragmentos totales"
          value={totalChunks}
          bg="bg-indigo-50"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4 text-emerald-500" />}
          label="Procesando"
          value={processing.length}
          bg="bg-emerald-50"
        />
        <StatCard
          icon={<AlertCircle className="w-4 h-4 text-red-400" />}
          label="Con error"
          value={errored.length}
          bg="bg-red-50"
        />
      </div>

      {/* ── Type breakdown ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Conocimiento por tipo de fuente
          </h3>
          <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["pdf", "url", "text", "audio"] as const).map((type) => {
            const cfg   = TYPE_CONFIG[type];
            const items = byType[type];
            const Icon  = cfg.icon;
            if (items.length === 0) return null;
            return (
              <div key={type} className={cn("rounded-xl border p-4", cfg.bg, cfg.border)}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                  <span className={cn("text-xs font-semibold", cfg.color)}>{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {items.reduce((s, i) => s + (i.chunk_count ?? 0), 0)} fragmentos
                </p>
                <div className="mt-3 space-y-1">
                  {items.slice(0, 3).map((s) => (
                    <p key={s.id} className="text-[11px] text-gray-600 truncate">· {s.title}</p>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[11px] text-gray-400">+ {items.length - 3} más</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Timeline of learning ── */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Lo que el cerebro ha aprendido
        </h3>
        <div className="space-y-6">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              {/* Month header */}
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full">
                  <Calendar className="w-3 h-3" />
                  {month}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-400">{items.length} fuente{items.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Source cards */}
              <div className="grid grid-cols-2 gap-3">
                {items.map((src) => {
                  const cfg  = TYPE_CONFIG[src.source_type];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={src.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 hover:border-violet-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                          <Icon className={cn("w-4 h-4", cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2">
                            {src.title}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(src.created_at)}</p>
                        </div>
                        <StatusDot status={src.status} chunks={src.chunk_count} />
                      </div>

                      {src.content_preview && (
                        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3 border-t border-gray-50 pt-2">
                          {src.content_preview}
                        </p>
                      )}

                      {src.source_url && (
                        <a
                          href={src.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-500 hover:underline mt-2 block truncate"
                        >
                          {src.source_url}
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function StatCard({ icon, label, value, bg }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  bg: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", bg)}>
        {icon}
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function StatusDot({ status, chunks }: { status: string; chunks: number | null }) {
  if (status === "ready") return (
    <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium whitespace-nowrap">
      <CheckCircle className="w-3 h-3" /> {chunks} frags.
    </span>
  );
  if (status === "processing") return (
    <span className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
      <Loader2 className="w-3 h-3 animate-spin" /> Procesando
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-[10px] text-red-500 font-medium">
      <AlertCircle className="w-3 h-3" /> Error
    </span>
  );
}
