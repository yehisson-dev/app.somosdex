"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus, X, Check, Link2, Eye, EyeOff, Pencil, Trash2,
  ChevronDown, MessageSquare, Calendar, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getMediaPreview } from "@/lib/mediaUtils";
import type { Client, ContentPlan, ContentPost, ContentPlatform, Project } from "@/types/database";

// ─── Config ───────────────────────────────────────────────────────────────────
const PLATFORMS: Record<string, { label: string; color: string; emoji: string }> = {
  instagram: { label: "Instagram",   color: "#E1306C", emoji: "📸" },
  facebook:  { label: "Facebook",    color: "#1877F2", emoji: "👥" },
  tiktok:    { label: "TikTok",      color: "#69C9D0", emoji: "🎵" },
  youtube:   { label: "YouTube",     color: "#FF0000", emoji: "▶️" },
  linkedin:  { label: "LinkedIn",    color: "#0A66C2", emoji: "💼" },
  blog:      { label: "Blog",        color: "#10B981", emoji: "✍️" },
  podcast:   { label: "Podcast",     color: "#8B5CF6", emoji: "🎙️" },
  twitter:   { label: "X / Twitter", color: "#1DA1F2", emoji: "🐦" },
};

const POST_TYPES: Record<string, string[]> = {
  instagram: ["Single Post", "Carrusel", "Reels", "Historia"],
  facebook:  ["Post", "Carrusel", "Video", "Historia"],
  tiktok:    ["Video", "LIVE"],
  youtube:   ["Video", "Short"],
  linkedin:  ["Post", "Artículo", "Video"],
  blog:      ["Artículo"],
  podcast:   ["Episodio"],
  twitter:   ["Tweet", "Hilo"],
};

const STATUS_CFG = {
  pending:  { label: "Pendiente",   color: "text-gray-500  bg-gray-100   border-gray-200"    },
  approved: { label: "Aprobado",    color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  rejected: { label: "Con cambios", color: "text-red-700   bg-red-50     border-red-200"      },
};

const EMPTY_POST = {
  media_urls_text: "",
  publish_date: "",
  post_type: "",
  caption: "",
  description: "",
};

interface Props {
  client: Client;
  initialPlans: ContentPlan[];
  projects: Project[];
}

export function ContentPlanManager({ client, initialPlans }: Props) {
  const [plans, setPlans]               = useState(initialPlans);
  const [activePlanId, setActivePlanId] = useState<string | null>(plans[0]?.id ?? null);
  const [newPlanOpen, setNewPlanOpen]   = useState(false);
  const [newPlatform, setNewPlatform]   = useState<ContentPlatform>("instagram");
  const [newTitle, setNewTitle]         = useState("");
  const [postDrawer, setPostDrawer]     = useState<{ open: boolean; post: ContentPost | null }>({ open: false, post: null });
  const [postForm, setPostForm]         = useState(EMPTY_POST);
  const [savingPlan, setSavingPlan]     = useState(false);
  const [savingPost, setSavingPost]     = useState(false);
  const supabase = createClient();

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null;
  const posts = (activePlan?.posts ?? []).slice().sort((a, b) => a.position - b.position || (a.publish_date ?? "").localeCompare(b.publish_date ?? ""));

  // ── Plan actions ─────────────────────────────────────────────────────────
  async function createPlan() {
    if (!newTitle.trim()) { toast.error("Escribe un título"); return; }
    setSavingPlan(true);
    const { data, error } = await supabase.from("content_plans").insert({
      client_id: client.id, platform: newPlatform, title: newTitle.trim(),
    } as any).select("*, posts:content_posts(*, comments:content_post_comments(*))").single();
    setSavingPlan(false);
    if (error || !data) { toast.error("Error al crear plan"); return; }
    setPlans((prev) => [...prev, data as ContentPlan]);
    setActivePlanId((data as any).id);
    setNewPlanOpen(false);
    setNewTitle("");
    toast.success("Plan creado");
  }

  async function deletePlan(planId: string) {
    if (!confirm("¿Eliminar este plan? Se borrarán todas las publicaciones.")) return;
    await supabase.from("content_plans").delete().eq("id", planId);
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    setActivePlanId(plans.find((p) => p.id !== planId)?.id ?? null);
    toast.success("Plan eliminado");
  }

  async function togglePublish(plan: ContentPlan) {
    const val = !plan.is_published;
    await supabase.from("content_plans").update({ is_published: val } as any).eq("id", plan.id);
    setPlans((prev) => prev.map((p) => p.id === plan.id ? { ...p, is_published: val } : p));
    toast.success(val ? "Plan publicado — el cliente ya puede verlo" : "Plan ocultado");
  }

  function copyLink(plan: ContentPlan) {
    const url = `${window.location.origin}/plan/${plan.share_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado al portapapeles");
  }

  // ── Post actions ──────────────────────────────────────────────────────────
  function openNewPost() {
    setPostForm(EMPTY_POST);
    setPostDrawer({ open: true, post: null });
  }

  function openEditPost(post: ContentPost) {
    setPostForm({
      media_urls_text: post.media_urls.join("\n"),
      publish_date: post.publish_date ?? "",
      post_type: post.post_type ?? "",
      caption: post.caption ?? "",
      description: post.description ?? "",
    });
    setPostDrawer({ open: true, post });
  }

  async function savePost() {
    if (!activePlan) return;
    setSavingPost(true);
    const payload = {
      plan_id: activePlan.id,
      media_urls: postForm.media_urls_text.split("\n").map((u) => u.trim()).filter(Boolean),
      publish_date: postForm.publish_date || null,
      post_type: postForm.post_type || null,
      caption: postForm.caption.trim() || null,
      description: postForm.description.trim() || null,
      position: postDrawer.post?.position ?? posts.length,
    };

    if (postDrawer.post) {
      const { error } = await supabase.from("content_posts").update(payload as any).eq("id", postDrawer.post.id);
      if (error) { toast.error("Error al guardar"); setSavingPost(false); return; }
      setPlans((prev) => prev.map((p) =>
        p.id !== activePlan.id ? p : {
          ...p,
          posts: (p.posts ?? []).map((pp) =>
            pp.id !== postDrawer.post!.id ? pp : { ...pp, ...payload }
          ),
        }
      ));
    } else {
      const { data, error } = await supabase.from("content_posts")
        .insert(payload as any)
        .select("*, comments:content_post_comments(*)")
        .single();
      if (error || !data) { toast.error("Error al crear publicación"); setSavingPost(false); return; }
      setPlans((prev) => prev.map((p) =>
        p.id !== activePlan.id ? p : { ...p, posts: [...(p.posts ?? []), data as ContentPost] }
      ));
    }
    setSavingPost(false);
    setPostDrawer({ open: false, post: null });
    toast.success(postDrawer.post ? "Publicación actualizada" : "Publicación añadida");
  }

  async function deletePost(postId: string) {
    if (!activePlan) return;
    if (!confirm("¿Eliminar esta publicación?")) return;
    await supabase.from("content_posts").delete().eq("id", postId);
    setPlans((prev) => prev.map((p) =>
      p.id !== activePlan.id ? p : { ...p, posts: (p.posts ?? []).filter((pp) => pp.id !== postId) }
    ));
    toast.success("Publicación eliminada");
  }

  const platformTypes = POST_TYPES[activePlan?.platform ?? "instagram"] ?? [];

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* ── Sidebar de plataformas ────────────────────────────────────── */}
      <div className="w-56 border-r border-gray-200 bg-white flex flex-col shrink-0 overflow-y-auto">
        <div className="p-3 space-y-0.5">
          {plans.map((plan) => {
            const cfg = PLATFORMS[plan.platform] ?? PLATFORMS.instagram;
            const postCount = plan.posts?.length ?? 0;
            const approved  = plan.posts?.filter((p) => p.status === "approved").length ?? 0;
            return (
              <button
                key={plan.id}
                onClick={() => setActivePlanId(plan.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors",
                  activePlanId === plan.id
                    ? "bg-violet-50 text-violet-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <span className="text-base shrink-0">{cfg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{cfg.label}</p>
                  <p className={cn("text-[10px]", activePlanId === plan.id ? "text-violet-400" : "text-gray-400")}>
                    {approved}/{postCount} aprobadas
                  </p>
                </div>
                {plan.is_published && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Publicado" />
                )}
              </button>
            );
          })}
        </div>

        {/* Nueva plataforma */}
        <div className="p-3 mt-auto border-t border-gray-100">
          {newPlanOpen ? (
            <div className="space-y-2">
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value as ContentPlatform)}
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-violet-400"
              >
                {Object.entries(PLATFORMS).map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
              </select>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createPlan()}
                placeholder="Título del plan…"
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400"
              />
              <div className="flex gap-1.5">
                <button onClick={createPlan} disabled={savingPlan}
                  className="flex-1 py-1.5 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs text-white font-medium transition-colors">
                  {savingPlan ? "…" : "Crear"}
                </button>
                <button onClick={() => setNewPlanOpen(false)}
                  className="px-2 py-1.5 rounded-md hover:bg-gray-100 text-gray-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNewPlanOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva plataforma
            </button>
          )}
        </div>
      </div>

      {/* ── Área principal ────────────────────────────────────────────── */}
      {!activePlan ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Selecciona o crea un plan de contenido
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
          {/* Top bar del plan */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-white shrink-0">
            <span className="text-lg">{PLATFORMS[activePlan.platform]?.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{activePlan.title}</p>
              <p className="text-xs text-gray-400">{PLATFORMS[activePlan.platform]?.label}</p>
            </div>

            <button onClick={() => copyLink(activePlan)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-800 hover:border-gray-300 transition-colors bg-white">
              <Link2 className="w-3.5 h-3.5" />
              Copiar link
            </button>

            <button
              onClick={() => togglePublish(activePlan)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                activePlan.is_published
                  ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                  : "border-gray-200 text-gray-500 bg-white hover:text-gray-800 hover:border-gray-300"
              )}
            >
              {activePlan.is_published
                ? <><Eye className="w-3.5 h-3.5" /> Publicado</>
                : <><EyeOff className="w-3.5 h-3.5" /> Publicar</>
              }
            </button>

            <button onClick={() => deletePlan(activePlan.id)}
              className="p-1.5 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <a href={`/plan/${activePlan.share_token}`} target="_blank" rel="noopener"
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors" title="Vista del cliente">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Grid de publicaciones */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {posts.map((post) => {
                const preview = post.media_urls[0] ? getMediaPreview(post.media_urls[0]) : null;
                const stCfg = STATUS_CFG[post.status];
                const clientComments = post.comments?.filter((c) => c.is_client).length ?? 0;
                return (
                  <div key={post.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group">
                    {/* Media */}
                    <div className="relative aspect-square bg-gray-100">
                      {preview?.previewUrl ? (
                        <img src={preview.previewUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl opacity-30">{PLATFORMS[activePlan.platform]?.emoji}</span>
                        </div>
                      )}
                      {post.media_urls.length > 1 && (
                        <span className="absolute top-2 right-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded-full">
                          +{post.media_urls.length - 1}
                        </span>
                      )}
                      {/* Status badge */}
                      <span className={cn("absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full border", stCfg.color)}>
                        {stCfg.label}
                      </span>
                    </div>

                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {post.post_type && (
                          <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">
                            {post.post_type}
                          </span>
                        )}
                        {post.publish_date && (
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 ml-auto">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.publish_date + "T00:00:00").toLocaleDateString("es", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>

                      {post.caption && (
                        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{post.caption}</p>
                      )}

                      {clientComments > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                          <MessageSquare className="w-3 h-3" />
                          {clientComments} comentario{clientComments > 1 ? "s" : ""} del cliente
                        </div>
                      )}

                      <div className="flex gap-1.5 pt-1">
                        <button onClick={() => openEditPost(post)}
                          className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md bg-gray-50 hover:bg-gray-100 text-[10px] text-gray-500 hover:text-gray-800 transition-colors font-medium">
                          <Pencil className="w-3 h-3" /> Editar
                        </button>
                        <button onClick={() => deletePost(post.id)}
                          className="p-1 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Add card */}
              <button
                onClick={openNewPost}
                className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-violet-400 hover:bg-violet-50 transition-colors flex flex-col items-center justify-center gap-2 text-gray-300 hover:text-violet-500"
              >
                <Plus className="w-6 h-6" />
                <span className="text-xs font-medium">Agregar publicación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Drawer edición de post ────────────────────────────────────── */}
      {postDrawer.open && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
            onClick={() => setPostDrawer({ open: false, post: null })} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-40 flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">
                {postDrawer.post ? "Editar publicación" : "Nueva publicación"}
              </h2>
              <button onClick={() => setPostDrawer({ open: false, post: null })}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Tipo y fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Tipo</label>
                  <select
                    value={postForm.post_type}
                    onChange={(e) => setPostForm((f) => ({ ...f, post_type: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition"
                  >
                    <option value="">Sin tipo</option>
                    {platformTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">Fecha publicación</label>
                  <input type="date"
                    value={postForm.publish_date}
                    onChange={(e) => setPostForm((f) => ({ ...f, publish_date: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition"
                  />
                </div>
              </div>

              {/* Media URLs */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">
                  Links de fotos/videos <span className="text-gray-400 font-normal">(uno por línea)</span>
                </label>
                <textarea
                  value={postForm.media_urls_text}
                  onChange={(e) => setPostForm((f) => ({ ...f, media_urls_text: e.target.value }))}
                  placeholder={"https://drive.google.com/...\nhttps://youtube.com/..."}
                  rows={4}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 resize-none font-mono text-xs leading-relaxed transition"
                />
                {postForm.media_urls_text.split("\n")[0]?.trim() && (() => {
                  const p = getMediaPreview(postForm.media_urls_text.split("\n")[0].trim());
                  return p.previewUrl ? (
                    <div className="rounded-lg overflow-hidden w-full aspect-video bg-gray-100">
                      <img src={p.previewUrl} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Caption */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Caption / Copy</label>
                <textarea
                  value={postForm.caption}
                  onChange={(e) => setPostForm((f) => ({ ...f, caption: e.target.value }))}
                  placeholder="Escribe el texto de la publicación tal como se publicará…"
                  rows={5}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 resize-none leading-relaxed transition"
                />
              </div>

              {/* Notas internas */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">
                  Notas internas <span className="text-gray-400 font-normal">(solo visible para el equipo)</span>
                </label>
                <textarea
                  value={postForm.description}
                  onChange={(e) => setPostForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Referencias, contexto, instrucciones de edición…"
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 resize-none transition"
                />
              </div>

              {/* Comentarios del cliente */}
              {postDrawer.post && (postDrawer.post.comments?.filter((c) => c.is_client)?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest">
                    Observaciones del cliente
                  </p>
                  {postDrawer.post.comments!.filter((c) => c.is_client).map((c) => (
                    <div key={c.id} className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-amber-800">{c.author_name}</p>
                      <p className="text-xs text-gray-700 mt-0.5">{c.content}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(c.created_at).toLocaleDateString("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-5 py-3 flex gap-2 bg-white">
              <button onClick={() => setPostDrawer({ open: false, post: null })}
                className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors">
                Cancelar
              </button>
              <button onClick={savePost} disabled={savingPost}
                className="flex-1 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
                {savingPost ? "Guardando…" : postDrawer.post ? "Guardar cambios" : "Agregar"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
