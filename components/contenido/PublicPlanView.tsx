"use client";

import { useState, useEffect } from "react";
import { toast, Toaster } from "sonner";
import { Check, X, MessageSquare, ChevronLeft, ChevronRight, Calendar, Send, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMediaPreview } from "@/lib/mediaUtils";
import type { ContentPlan, ContentPost } from "@/types/database";

const PLATFORMS: Record<string, { label: string; color: string; emoji: string }> = {
  instagram: { label: "Instagram",   color: "#E1306C", emoji: "📸" },
  facebook:  { label: "Facebook",    color: "#1877F2", emoji: "👥" },
  tiktok:    { label: "TikTok",      color: "#10b981", emoji: "🎵" },
  youtube:   { label: "YouTube",     color: "#FF0000", emoji: "▶️" },
  linkedin:  { label: "LinkedIn",    color: "#0A66C2", emoji: "💼" },
  blog:      { label: "Blog",        color: "#10B981", emoji: "✍️" },
  podcast:   { label: "Podcast",     color: "#8B5CF6", emoji: "🎙️" },
  twitter:   { label: "X / Twitter", color: "#1DA1F2", emoji: "🐦" },
};

interface Props { plan: ContentPlan; token: string; }

export function PublicPlanView({ plan, token }: Props) {
  const client   = plan.client as any;
  const platform = PLATFORMS[plan.platform] ?? PLATFORMS.instagram;

  const [posts, setPosts]           = useState<ContentPost[]>(plan.posts ?? []);
  const [authorName, setAuthorName] = useState("");
  const [nameInput, setNameInput]   = useState("");
  const [nameReady, setNameReady]   = useState(false);
  const [selected, setSelected]     = useState<ContentPost | null>(null);
  const [comment, setComment]       = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [sending, setSending]       = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`plan_author_${token}`);
    if (saved) { setAuthorName(saved); setNameReady(true); }
  }, [token]);

  function submitName() {
    const n = nameInput.trim();
    if (!n) return;
    localStorage.setItem(`plan_author_${token}`, n);
    setAuthorName(n);
    setNameReady(true);
  }

  async function doAction(postId: string, action: "approve" | "reject" | "comment", content?: string) {
    setSending(true);
    try {
      const res = await fetch(`/api/plan/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, action, content, authorName }),
      });
      if (!res.ok) throw new Error();
      const { post } = await res.json();
      setPosts((prev) => prev.map((p) => p.id === postId ? post : p));
      if (selected?.id === postId) setSelected(post);
      setComment(""); setRejectMode(false);
      toast.success(
        action === "approve" ? "¡Publicación aprobada! ✅"
        : action === "reject" ? "Cambios enviados al equipo"
        : "Comentario enviado"
      );
    } catch { toast.error("Error, intenta de nuevo"); }
    finally { setSending(false); }
  }

  const total    = posts.length;
  const approved = posts.filter((p) => p.status === "approved").length;
  const rejected = posts.filter((p) => p.status === "rejected").length;
  const pending  = total - approved - rejected;
  const pct      = total > 0 ? Math.round((approved / total) * 100) : 0;

  function navigate(dir: 1 | -1) {
    if (!selected) return;
    const idx  = posts.findIndex((p) => p.id === selected.id);
    const next = posts[idx + dir];
    if (next) { setSelected(next); setComment(""); setRejectMode(false); }
  }

  // ── Pantalla de nombre ──────────────────────────────────────────────────────
  if (!nameReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "linear-gradient(135deg, #0CC8C8 0%, #0ea5e9 100%)" }}>
        <Toaster position="bottom-center" />

        <div className="w-full max-w-sm space-y-5">
          {/* Client badge */}
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl font-bold shadow-xl"
              style={{ color: "white", textShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
              {client?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="text-center">
              <p className="font-bold text-xl tracking-tight">{client?.name}</p>
              <p className="text-white/80 text-sm mt-0.5">{platform.emoji} Plan de contenido · {platform.label}</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div>
              <p className="text-slate-800 font-semibold text-base">¡Bienvenido/a! 👋</p>
              <p className="text-slate-500 text-sm mt-1">¿Cómo te llamas? Lo usaremos para identificar tu aprobación en cada publicación.</p>
            </div>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitName()}
              placeholder="Tu nombre completo"
              autoFocus
              className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 text-sm transition"
            />
            <button
              onClick={submitName}
              disabled={!nameInput.trim()}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white transition-all disabled:opacity-40 shadow-lg shadow-teal-200"
              style={{ background: "linear-gradient(135deg, #0CC8C8, #0ea5e9)" }}
            >
              Ver mi plan →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Vista principal ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <Toaster position="bottom-center" />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center gap-3">
          {/* Client logo */}
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${client?.color ?? "#0CC8C8"}, ${client?.color ?? "#0ea5e9"}99)` }}>
            {client?.name?.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-slate-800 font-semibold text-sm truncate">{plan.title}</p>
            <p className="text-slate-400 text-xs">{client?.name} · {platform.emoji} {platform.label}</p>
          </div>

          {/* Stats chips */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
            {approved > 0 && (
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-100">
                <Check className="w-3 h-3" /> {approved}
              </span>
            )}
            {pending > 0 && (
              <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-100">
                <Clock className="w-3 h-3" /> {pending}
              </span>
            )}
            {rejected > 0 && (
              <span className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100">
                <X className="w-3 h-3" /> {rejected}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="h-1 bg-slate-100">
            <div className="h-full transition-all duration-700 rounded-full"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #0CC8C8, #10b981)" }} />
          </div>
        )}
      </header>

      {/* ── Hero card ───────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-4">
        <div className="rounded-3xl p-5 text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, #0CC8C8 0%, #0ea5e9 100%)" }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white/80 text-sm">Hola, <span className="text-white font-semibold">{authorName}</span> 👋</p>
              <p className="font-bold text-lg mt-0.5 leading-tight">Tu plan de contenido está listo para revisión</p>
              <p className="text-white/70 text-sm mt-1">Revisa cada publicación, apruébala o solicita cambios.</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-3xl font-black">{pct}%</p>
              <p className="text-white/70 text-xs">aprobado</p>
            </div>
          </div>

          {/* Mini stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Total", value: total, bg: "bg-white/10" },
              { label: "Aprobadas", value: approved, bg: "bg-emerald-400/20" },
              { label: "Pendientes", value: pending, bg: "bg-white/10" },
            ].map((s) => (
              <div key={s.label} className={cn("rounded-2xl px-3 py-2 text-center", s.bg)}>
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-white/70 text-[11px]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid de publicaciones ────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-slate-400 text-sm">Tu agencia aún no ha añadido publicaciones</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              {posts.length} publicaciones
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {posts.map((post) => {
                const preview     = post.media_urls[0] ? getMediaPreview(post.media_urls[0]) : null;
                const clientComments = post.comments?.filter((c) => c.is_client).length ?? 0;
                const isApproved  = post.status === "approved";
                const isRejected  = post.status === "rejected";

                return (
                  <button
                    key={post.id}
                    onClick={() => { setSelected(post); setComment(""); setRejectMode(false); }}
                    className={cn(
                      "bg-white rounded-2xl overflow-hidden text-left transition-all active:scale-[0.98] hover:shadow-md border-2",
                      isApproved ? "border-emerald-300 shadow-emerald-50"
                      : isRejected ? "border-red-200"
                      : "border-transparent hover:border-teal-100"
                    )}
                  >
                    {/* Media */}
                    <div className="relative aspect-square bg-slate-100">
                      {preview?.previewUrl ? (
                        <img src={preview.previewUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          {platform.emoji}
                        </div>
                      )}

                      {isApproved && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-emerald-500 shadow-lg flex items-center justify-center">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      )}
                      {isRejected && (
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-red-500/80 to-transparent p-2">
                          <span className="text-[10px] text-white font-semibold">Cambios solicitados</span>
                        </div>
                      )}
                      {clientComments > 0 && !isApproved && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow">
                          <span className="text-[9px] text-white font-bold">{clientComments}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2.5 space-y-1.5">
                      {post.publish_date && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {new Date(post.publish_date + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short" })}
                        </p>
                      )}
                      {post.post_type && (
                        <span className="inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold"
                          style={{ backgroundColor: platform.color + "18", color: platform.color }}>
                          {post.post_type}
                        </span>
                      )}
                      {post.caption && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">{post.caption}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Modal de detalle
      ══════════════════════════════════════════════════════════════════════ */}
      {selected && (() => {
        const preview       = selected.media_urls[0] ? getMediaPreview(selected.media_urls[0]) : null;
        const idx           = posts.findIndex((p) => p.id === selected.id);
        const clientComments = (selected.comments ?? []).filter((c) => c.is_client);

        return (
          <div className="fixed inset-0 z-50 flex flex-col bg-white">
            {/* Barra superior */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 shrink-0 bg-white">
              <button onClick={() => { setSelected(null); setComment(""); setRejectMode(false); }}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <span className="text-sm text-slate-400 flex-1">
                Publicación <span className="font-semibold text-slate-700">{idx + 1}</span> de {posts.length}
              </span>
              <button onClick={() => navigate(-1)} disabled={idx === 0}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={() => navigate(1)} disabled={idx === posts.length - 1}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 disabled:opacity-30 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-lg mx-auto pb-52">
                {/* Media */}
                <div className="relative bg-slate-100 w-full">
                  {preview?.previewUrl ? (
                    <img src={preview.previewUrl} alt=""
                      className="w-full max-h-[65vw] sm:max-h-[420px] object-contain" />
                  ) : (
                    <div className="w-full h-60 flex items-center justify-center text-6xl bg-gradient-to-br from-teal-50 to-cyan-50">
                      {platform.emoji}
                    </div>
                  )}
                  {selected.media_urls.length > 1 && (
                    <div className="absolute bottom-3 flex justify-center gap-1.5 left-0 right-0">
                      {selected.media_urls.map((_, i) => (
                        <span key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all",
                          i === 0 ? "bg-teal-500 w-3" : "bg-slate-300")} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-4 py-5 space-y-4">
                  {/* Meta */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selected.post_type && (
                      <span className="text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm"
                        style={{ backgroundColor: platform.color + "15", color: platform.color }}>
                        {platform.emoji} {selected.post_type}
                      </span>
                    )}
                    {selected.publish_date && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(selected.publish_date + "T00:00:00").toLocaleDateString("es", {
                          weekday: "long", day: "numeric", month: "long",
                        })}
                      </span>
                    )}
                  </div>

                  {/* Status */}
                  {selected.status !== "pending" && (
                    <div className={cn("flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold border",
                      selected.status === "approved"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-red-50 text-red-600 border-red-200")}>
                      {selected.status === "approved"
                        ? <><Check className="w-4 h-4" /> Aprobada por ti ✅</>
                        : <><X className="w-4 h-4" /> Enviaste cambios al equipo</>
                      }
                    </div>
                  )}

                  {/* Caption */}
                  {selected.caption && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Caption</p>
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selected.caption}</p>
                      </div>
                    </div>
                  )}

                  {/* Links adicionales */}
                  {selected.media_urls.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Archivos</p>
                      {selected.media_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener"
                          className="flex items-center gap-2 text-xs text-teal-600 hover:text-teal-700 underline underline-offset-2 truncate">
                          {i + 1}. {url}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Comentarios del cliente */}
                  {clientComments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Tus comentarios</p>
                      {clientComments.map((c) => (
                        <div key={c.id} className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                          <p className="text-sm text-slate-700 leading-relaxed">{c.content}</p>
                          <p className="text-[10px] text-slate-400 mt-1.5">
                            {new Date(c.created_at).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Barra de acciones ──────────────────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 px-4 py-4 space-y-3 shadow-lg">
              {rejectMode ? (
                <div className="max-w-lg mx-auto space-y-3">
                  <p className="text-sm text-slate-700 font-semibold">¿Qué cambios necesitas?</p>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Escribe lo que quieres cambiar o mejorar…"
                    rows={3} autoFocus
                    className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 resize-none transition"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setRejectMode(false)}
                      className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 font-medium transition-colors">
                      Cancelar
                    </button>
                    <button onClick={() => doAction(selected.id, "reject", comment)} disabled={sending}
                      className="flex-1 py-3.5 rounded-2xl bg-red-500 hover:bg-red-400 disabled:opacity-50 text-white font-bold text-sm transition-colors shadow-lg shadow-red-100">
                      {sending ? "Enviando…" : "Enviar al equipo"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-lg mx-auto space-y-2.5">
                  {selected.status !== "approved" && (
                    <button onClick={() => doAction(selected.id, "approve")} disabled={sending}
                      className="w-full py-4 rounded-2xl font-bold text-base text-white transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 active:scale-[0.99]"
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
                      <Check className="w-5 h-5" />
                      Aprobar publicación
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <button onClick={() => setRejectMode(true)}
                      className="py-3.5 rounded-2xl border-2 border-red-200 text-red-500 hover:bg-red-50 font-semibold text-sm transition-colors flex items-center justify-center gap-1.5">
                      <X className="w-4 h-4" />
                      Pedir cambios
                    </button>

                    <div className="relative flex items-center">
                      <input
                        type="text" value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && comment.trim()) doAction(selected.id, "comment", comment); }}
                        placeholder="Comentar…"
                        className="w-full py-3.5 pl-4 pr-10 rounded-2xl border-2 border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-300 transition bg-white"
                      />
                      <button onClick={() => comment.trim() && doAction(selected.id, "comment", comment)}
                        disabled={!comment.trim() || sending}
                        className="absolute right-2 p-1.5 rounded-lg text-teal-500 disabled:text-slate-300 transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {selected.status === "approved" && (
                    <button onClick={() => setRejectMode(true)}
                      className="w-full py-3 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-600 text-sm transition-colors">
                      Pedir cambios de todas formas
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
