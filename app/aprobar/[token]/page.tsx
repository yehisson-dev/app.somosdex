"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import {
  CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight,
  MessageSquare, Calendar, Loader2, CheckCheck, Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Post {
  id: string;
  caption: string;
  description: string;
  post_type: string;
  media_urls: string[];
  publish_date: string | null;
  platform: string;
  client_approval: "pending" | "approved" | "rejected" | null;
  client_comment: string | null;
}

interface Client {
  id: string;
  name: string;
  company: string;
  color: string;
}

const PLATFORM_EMOJI: Record<string, string> = {
  Instagram: "📸", Facebook: "👥", TikTok: "🎵", LinkedIn: "💼",
  Twitter: "🐦", YouTube: "▶️", Pinterest: "📌", Otro: "🌐",
};

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function fmtDate(d: string | null) {
  if (!d) return "Sin fecha";
  const dt = new Date(d + "T12:00:00");
  return `${dt.getDate()} ${MONTHS_ES[dt.getMonth()]} ${dt.getFullYear()}`;
}

export default function AprobacionPage() {
  const { token } = useParams<{ token: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [posts,  setPosts]  = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Modal de pieza seleccionada
  const [selected, setSelected] = useState<Post | null>(null);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [comment,  setComment]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  useEffect(() => {
    fetch(`/api/content-approval/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setClient(d.client);
        setPosts(d.posts ?? []);
      })
      .catch(() => setError("Error al cargar"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAction(postId: string, action: "approved" | "rejected") {
    setSaving(true);
    try {
      await fetch(`/api/content-approval/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, action, comment: comment || null }),
      });
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, client_approval: action, client_comment: comment || null } : p
      ));
      if (selected?.id === postId) setSelected(prev => prev ? { ...prev, client_approval: action } : prev);
      setDone(true);
      setTimeout(() => { setDone(false); setSelected(null); setComment(""); }, 1500);
    } finally { setSaving(false); }
  }

  function openPost(post: Post) {
    setSelected(post);
    setMediaIdx(0);
    setComment(post.client_comment ?? "");
    setDone(false);
  }

  const pending  = posts.filter(p => !p.client_approval || p.client_approval === "pending");
  const approved = posts.filter(p => p.client_approval === "approved");
  const rejected = posts.filter(p => p.client_approval === "rejected");

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-500">Link inválido o expirado.</p>
    </div>
  );

  if (!client) return null;

  const accentColor = client.color ?? "#8b5cf6";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: accentColor }}>
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">{client.name}</h1>
            <p className="text-xs text-gray-400">Calendario de contenido para aprobación</p>
          </div>
          {/* Resumen */}
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" /> {pending.length} pendiente{pending.length !== 1 ? "s" : ""}
            </span>
            {approved.length > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> {approved.length}
              </span>
            )}
            {rejected.length > 0 && (
              <span className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded-full">
                <XCircle className="w-3 h-3" /> {rejected.length}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {posts.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm">
            No hay piezas pendientes de aprobación en este momento.
          </div>
        )}

        {/* Pendientes */}
        {pending.length > 0 && (
          <Section title="Pendientes de tu aprobación" color="amber">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pending.map(p => <PostCard key={p.id} post={p} onClick={() => openPost(p)} />)}
            </div>
          </Section>
        )}

        {/* Aprobados */}
        {approved.length > 0 && (
          <Section title="Aprobados" color="emerald">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {approved.map(p => <PostCard key={p.id} post={p} onClick={() => openPost(p)} />)}
            </div>
          </Section>
        )}

        {/* Rechazados */}
        {rejected.length > 0 && (
          <Section title="Rechazados / Con cambios" color="red">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejected.map(p => <PostCard key={p.id} post={p} onClick={() => openPost(p)} />)}
            </div>
          </Section>
        )}
      </main>

      {/* Modal de revisión */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[95vh] overflow-y-auto">

            {/* Media viewer */}
            {selected.media_urls?.length > 0 ? (
              <div className="relative bg-black aspect-square sm:aspect-video max-h-72 sm:max-h-80 overflow-hidden sm:rounded-t-2xl rounded-t-2xl">
                <MediaViewer urls={selected.media_urls} idx={mediaIdx} onPrev={() => setMediaIdx(i => Math.max(i-1,0))} onNext={() => setMediaIdx(i => Math.min(i+1, selected.media_urls.length-1))} />
              </div>
            ) : (
              <div className="h-40 bg-gray-100 sm:rounded-t-2xl rounded-t-2xl flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-gray-300" />
              </div>
            )}

            <div className="p-5 space-y-4">
              {/* Info */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">
                  {PLATFORM_EMOJI[selected.platform] ?? "🌐"} {selected.platform}
                </span>
                {selected.post_type && (
                  <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">{selected.post_type}</span>
                )}
                {selected.publish_date && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
                    <Calendar className="w-3 h-3" /> {fmtDate(selected.publish_date)}
                  </span>
                )}
              </div>

              {/* Caption */}
              {selected.caption && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Caption</p>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.caption}</p>
                </div>
              )}

              {/* Descripción */}
              {selected.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Descripción / Notas</p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                </div>
              )}

              {/* Si ya fue revisada */}
              {selected.client_approval && selected.client_approval !== "pending" ? (
                <div className={cn("rounded-xl p-4 flex items-center gap-3",
                  selected.client_approval === "approved" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200")}>
                  {selected.client_approval === "approved"
                    ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
                  <div>
                    <p className={cn("text-sm font-semibold",
                      selected.client_approval === "approved" ? "text-emerald-700" : "text-red-600")}>
                      {selected.client_approval === "approved" ? "Aprobaste esta pieza" : "Solicitaste cambios"}
                    </p>
                    {selected.client_comment && (
                      <p className="text-xs text-gray-500 mt-0.5">"{selected.client_comment}"</p>
                    )}
                  </div>
                  <button onClick={() => setSelected(null)} className="ml-auto text-xs text-gray-400 hover:text-gray-600">Cerrar</button>
                </div>
              ) : (
                <>
                  {/* Comentario opcional */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      <MessageSquare className="w-3 h-3" /> Comentario (opcional)
                    </label>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Escribe aquí si tienes algún cambio o comentario…"
                      rows={3}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-400 resize-none bg-gray-50"
                    />
                  </div>

                  {/* Botones de acción */}
                  {done ? (
                    <div className="flex items-center justify-center gap-2 py-3 text-emerald-600">
                      <CheckCheck className="w-5 h-5" />
                      <span className="text-sm font-medium">¡Respuesta enviada!</span>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAction(selected.id, "rejected")}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors disabled:opacity-50">
                        <XCircle className="w-4 h-4" />
                        {saving ? "Enviando…" : "Solicitar cambios"}
                      </button>
                      <button
                        onClick={() => handleAction(selected.id, "approved")}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                        <CheckCircle2 className="w-4 h-4" />
                        {saving ? "Enviando…" : "Aprobar"}
                      </button>
                    </div>
                  )}

                  <button onClick={() => setSelected(null)} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1">
                    Cerrar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    amber:   "text-amber-700 bg-amber-50 border-amber-200",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
    red:     "text-red-600 bg-red-50 border-red-200",
  };
  return (
    <div>
      <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border mb-4", styles[color])}>
        {title}
      </div>
      {children}
    </div>
  );
}

function PostCard({ post, onClick }: { post: Post; onClick: () => void }) {
  const thumb = post.media_urls?.[0];
  const isVideo = thumb?.match(/\.(mp4|mov|webm)$/i);

  const statusStyle = {
    approved: "border-emerald-300 bg-emerald-50/30",
    rejected: "border-red-300 bg-red-50/30",
    pending:  "border-gray-200 bg-white hover:border-violet-300 hover:shadow-md",
  }[post.client_approval ?? "pending"] ?? "border-gray-200 bg-white hover:border-violet-300 hover:shadow-md";

  return (
    <button onClick={onClick}
      className={cn("w-full text-left rounded-2xl border overflow-hidden transition-all cursor-pointer", statusStyle)}>
      {/* Thumbnail */}
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        {thumb ? (
          isVideo
            ? <div className="w-full h-full flex items-center justify-center bg-gray-900"><span className="text-4xl">▶️</span></div>
            : <img src={`/api/files/${thumb}`} alt="" className="w-full h-full object-cover" loading="lazy"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-300" />
          </div>
        )}
        {/* Badge de estado */}
        <div className="absolute top-2 right-2">
          {post.client_approval === "approved" && (
            <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-2.5 h-2.5" /> Aprobado
            </span>
          )}
          {post.client_approval === "rejected" && (
            <span className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              <XCircle className="w-2.5 h-2.5" /> Cambios
            </span>
          )}
          {(!post.client_approval || post.client_approval === "pending") && (
            <span className="flex items-center gap-1 bg-amber-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              <Clock className="w-2.5 h-2.5" /> Pendiente
            </span>
          )}
        </div>
        {/* Múltiples medias */}
        {post.media_urls?.length > 1 && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">
            1/{post.media_urls.length}
          </div>
        )}
      </div>

      <div className="p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">{PLATFORM_EMOJI[post.platform] ?? "🌐"} {post.platform}</span>
          {post.post_type && <span className="text-[10px] text-violet-500">{post.post_type}</span>}
        </div>
        {post.caption && (
          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{post.caption}</p>
        )}
        {post.publish_date && (
          <p className="text-[10px] text-gray-400 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {fmtDate(post.publish_date)}
          </p>
        )}
        {post.client_comment && (
          <p className="text-[10px] text-gray-500 italic truncate">"{post.client_comment}"</p>
        )}
      </div>
    </button>
  );
}

function MediaViewer({ urls, idx, onPrev, onNext }: { urls: string[]; idx: number; onPrev: () => void; onNext: () => void }) {
  const url = urls[idx];
  const isVideo = url?.match(/\.(mp4|mov|webm)$/i);
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {isVideo
        ? <video src={`/api/files/${url}`} controls className="max-h-full max-w-full" />
        : <img src={`/api/files/${url}`} alt="" className="max-h-full max-w-full object-contain" />
      }
      {urls.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); onPrev(); }} disabled={idx === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); onNext(); }} disabled={idx === urls.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {urls.map((_, i) => (
              <span key={i} className={cn("w-1.5 h-1.5 rounded-full", i === idx ? "bg-white" : "bg-white/40")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
