"use client";

import { useEffect, useState, useRef } from "react";
import {
  Plus, Trash2, RefreshCw, FileText, Link as LinkIcon,
  Type, CheckCircle, AlertCircle, Loader2, BookOpen, X,
  ChevronDown, Mic,
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

interface BrainPanelProps {
  /** "cubo" = agencia shared | "brand" = per-client */
  brainType: "cubo" | "brand";
  /** Required only when brainType === "brand" */
  brandId?: string | null;
  /** Display label for the header */
  title?: string;
  /** accent colour class (tailwind bg-*) */
  accentClass?: string;
}

type SourceTab = "url" | "pdf" | "text" | "audio";

export function BrainPanel({
  brainType,
  brandId = null,
  title = "Cubo Brain",
  accentClass = "bg-violet-600",
}: BrainPanelProps) {
  const [sources, setSources]       = useState<BrainSource[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [tab, setTab]               = useState<SourceTab>("url");
  const [inputTitle, setInputTitle] = useState("");
  const [inputUrl, setInputUrl]     = useState("");
  const [inputText, setInputText]   = useState("");
  const [pdfFile, setPdfFile]       = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr]   = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function loadSources() {
    setLoading(true);
    const params = new URLSearchParams({ brain_type: brainType });
    if (brandId) params.set("brand_id", brandId);
    const res = await fetch(`/api/brain/sources?${params}`);
    const json = await res.json();
    setSources(json.sources ?? []);
    setLoading(false);
  }

  useEffect(() => { loadSources(); }, [brainType, brandId]);

  // Poll processing sources
  useEffect(() => {
    const processing = sources.some((s) => s.status === "processing");
    if (!processing) return;
    const t = setTimeout(loadSources, 4000);
    return () => clearTimeout(t);
  }, [sources]);

  async function handleSubmit() {
    if (!inputTitle.trim()) { setSubmitErr("El título es obligatorio"); return; }
    if (tab === "url"   && !inputUrl.trim()) { setSubmitErr("Ingresa una URL"); return; }
    if (tab === "pdf"   && !pdfFile)         { setSubmitErr("Selecciona un archivo PDF"); return; }
    if (tab === "audio" && !pdfFile)         { setSubmitErr("Selecciona un archivo de audio o video"); return; }
    if (tab === "text"  && inputText.trim().length < 50) { setSubmitErr("El texto es muy corto (mínimo 50 caracteres)"); return; }

    setSubmitErr("");
    setSubmitting(true);

    const fd = new FormData();
    fd.append("brain_type", brainType);
    if (brandId) fd.append("brand_id", brandId);
    fd.append("source_type", tab);
    fd.append("title", inputTitle.trim());
    if (tab === "url")                        fd.append("url", inputUrl.trim());
    if (tab === "text")                       fd.append("text", inputText.trim());
    if ((tab === "pdf" || tab === "audio") && pdfFile) fd.append("file", pdfFile);

    try {
      const res = await fetch("/api/brain/ingest", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error al ingestar");
      // reset modal
      setShowModal(false);
      setInputTitle(""); setInputUrl(""); setInputText(""); setPdfFile(null);
      await loadSources();
    } catch (e: any) {
      setSubmitErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta fuente y todos sus embeddings?")) return;
    await fetch("/api/brain/sources", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  function statusBadge(s: BrainSource) {
    if (s.status === "ready") return (
      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
        <CheckCircle className="w-3 h-3" /> Listo · {s.chunk_count} fragmentos
      </span>
    );
    if (s.status === "processing") return (
      <span className="flex items-center gap-1 text-amber-500 text-xs font-medium">
        <Loader2 className="w-3 h-3 animate-spin" /> Procesando…
      </span>
    );
    return (
      <span className="flex items-center gap-1 text-red-500 text-xs font-medium" title={s.error_msg ?? ""}>
        <AlertCircle className="w-3 h-3" /> Error
      </span>
    );
  }

  function sourceIcon(type: SourceTab) {
    if (type === "url")   return <LinkIcon className="w-3.5 h-3.5 text-blue-500" />;
    if (type === "pdf")   return <FileText className="w-3.5 h-3.5 text-red-500" />;
    if (type === "audio") return <Mic className="w-3.5 h-3.5 text-violet-500" />;
    return <Type className="w-3.5 h-3.5 text-gray-500" />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", accentClass)}>
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            <p className="text-[11px] text-gray-400">{sources.length} fuente{sources.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={loadSources}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white transition-colors", accentClass, "hover:opacity-90")}
          >
            <Plus className="w-3.5 h-3.5" />
            Añadir fuente
          </button>
        </div>
      </div>

      {/* Source list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {loading && (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}

        {!loading && sources.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-500 font-medium">Sin fuentes de conocimiento</p>
            <p className="text-xs text-gray-400 mt-1">Añade URLs, PDFs o texto para empezar</p>
          </div>
        )}

        {sources.map((src) => (
          <div
            key={src.id}
            className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors"
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="shrink-0">{sourceIcon(src.source_type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{src.title}</p>
                {statusBadge(src)}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {src.content_preview && (
                  <button
                    onClick={() => setExpanded(expanded === src.id ? null : src.id)}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors"
                    title="Ver preview"
                  >
                    <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", expanded === src.id && "rotate-180")} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(src.id)}
                  className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {expanded === src.id && src.content_preview && (
              <div className="px-4 pb-3 border-t border-gray-100 pt-2">
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-4">{src.content_preview}</p>
                {src.source_url && (
                  <a
                    href={src.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-500 hover:underline mt-1 inline-block truncate max-w-full"
                  >
                    {src.source_url}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Source Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Añadir fuente de conocimiento</h3>
              <button
                onClick={() => { setShowModal(false); setSubmitErr(""); }}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1.5">Título *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                  placeholder="Ej: Guía de metodología Cubo"
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                />
              </div>

              {/* Tabs */}
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-2">Tipo de fuente</label>
                <div className="grid grid-cols-4 gap-1 bg-gray-100 p-1 rounded-lg">
                  {(["url", "pdf", "text", "audio"] as SourceTab[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setPdfFile(null); }}
                      className={cn(
                        "py-1.5 rounded-md text-xs font-medium transition-colors",
                        tab === t
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      )}
                    >
                      {t === "url" ? "🔗 URL" : t === "pdf" ? "📄 PDF" : t === "audio" ? "🎙️ Audio" : "📝 Texto"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              {tab === "url" && (
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">URL *</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                    placeholder="https://..."
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    type="url"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Se descargará y procesará el contenido de la página.</p>
                </div>
              )}

              {tab === "pdf" && (
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Archivo PDF *</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
                  >
                    {pdfFile ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                        <FileText className="w-4 h-4 text-red-500" />
                        <span className="truncate max-w-xs">{pdfFile.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPdfFile(null); }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Haz clic para seleccionar PDF</p>
                        <p className="text-xs text-gray-400 mt-1">Máximo recomendado: 10 MB</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {tab === "audio" && (
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Archivo de audio o video *</label>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50/30 transition-colors"
                  >
                    {pdfFile ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                        <Mic className="w-4 h-4 text-violet-500" />
                        <span className="truncate max-w-xs">{pdfFile.name}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setPdfFile(null); }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Mic className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Haz clic para seleccionar audio o video</p>
                        <p className="text-xs text-gray-400 mt-1">MP3, MP4, WAV, M4A, OGG, WebM</p>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    El archivo se transcribirá automáticamente con Whisper. La duración del proceso depende del tamaño.
                  </p>
                </div>
              )}

              {/* Hidden file input — shared by pdf and audio tabs */}
              {(tab === "pdf" || tab === "audio") && (
                <input
                  ref={fileRef}
                  type="file"
                  accept={tab === "audio"
                    ? ".mp3,.mp4,.wav,.m4a,.ogg,.webm,.mpeg,audio/*,video/*"
                    : ".pdf,application/pdf"}
                  className="hidden"
                  onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                />
              )}

              {tab === "text" && (
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1.5">Contenido *</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none"
                    rows={7}
                    placeholder="Pega aquí el texto que quieres agregar al cerebro…"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <p className="text-[11px] text-gray-400 mt-1">{inputText.length} caracteres</p>
                </div>
              )}

              {submitErr && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-3 py-2 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {submitErr}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => { setShowModal(false); setSubmitErr(""); }}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                disabled={submitting}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors",
                  accentClass, "hover:opacity-90 disabled:opacity-50"
                )}
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Procesando…" : "Añadir fuente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
