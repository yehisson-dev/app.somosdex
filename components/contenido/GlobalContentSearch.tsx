"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, X, Calendar, Filter, Loader2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const POST_TYPES = ["Reels", "Carrusel", "Story", "Post", "Video", "Blog", "Infografía", "Otro"];
const STATUSES   = ["pendiente", "aprobado", "rechazado", "programado", "publicado"];
const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente", aprobado: "Aprobado", rechazado: "Rechazado",
  programado: "Programado", publicado: "Publicado",
};
const STATUS_COLOR: Record<string, string> = {
  pendiente:  "bg-gray-100 text-gray-500",
  aprobado:   "bg-emerald-100 text-emerald-600",
  rechazado:  "bg-red-100 text-red-500",
  programado: "bg-blue-100 text-blue-600",
  publicado:  "bg-violet-100 text-violet-600",
};

interface Post {
  id: string; caption: string; description: string;
  publish_date: string | null; post_type: string; status: string;
  media_urls: string[]; assigned_to: string | null;
  plan_id: string; platform: string;
  client_id: string; client_name: string; client_color: string;
}
interface Brand {
  client_id: string; client_name: string; client_color: string;
  posts: Post[];
}
interface SearchResult {
  total: number; brands: Brand[];
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("es-DO", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function GlobalContentSearch({ clients }: { clients: { id: string; name: string; color: string }[] }) {
  const [q,         setQ]         = useState("");
  const [date,      setDate]      = useState("");
  const [postType,  setPostType]  = useState("");
  const [clientId,  setClientId]  = useState("");
  const [status,    setStatus]    = useState("");
  const [result,    setResult]    = useState<SearchResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [searched,  setSearched]  = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (params: {
    q: string; date: string; postType: string; clientId: string; status: string;
  }) => {
    const { q, date, postType, clientId, status } = params;
    if (!q && !date && !postType && !clientId && !status) {
      setResult(null);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const sp = new URLSearchParams();
      if (q)        sp.set("q", q);
      if (date)     sp.set("date", date);
      if (postType) sp.set("post_type", postType);
      if (clientId) sp.set("client_id", clientId);
      if (status)   sp.set("status", status);
      const res = await fetch(`/api/content-search?${sp}`);
      setResult(await res.json());
    } finally { setLoading(false); }
  }, []);

  // Debounce text search, immediate on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search({ q, date, postType, clientId, status });
    }, q ? 400 : 0);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q, date, postType, clientId, status, search]);

  const clearAll = () => { setQ(""); setDate(""); setPostType(""); setClientId(""); setStatus(""); };
  const hasFilters = q || date || postType || clientId || status;

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
        {/* Input principal */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por título, caption o descripción..."
            className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:border-violet-400 transition-colors"
          />
          {q && (
            <button onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtros secundarios */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />

          {/* Fecha */}
          <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2 py-1 bg-gray-50">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="text-xs bg-transparent focus:outline-none text-gray-600 w-28"
            />
            {date && (
              <button onClick={() => setDate("")}><X className="w-3 h-3 text-gray-400" /></button>
            )}
          </div>

          {/* Tipo */}
          <select value={postType} onChange={e => setPostType(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-violet-400 text-gray-600">
            <option value="">Tipo de contenido</option>
            {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Cliente / Marca */}
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-violet-400 text-gray-600">
            <option value="">Todas las marcas</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Estado */}
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 focus:outline-none focus:border-violet-400 text-gray-600">
            <option value="">Todos los estados</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearAll}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors ml-auto">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        </div>
      )}

      {!loading && searched && result && result.total === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">
          No se encontraron contenidos con esos filtros.
        </div>
      )}

      {!loading && result && result.total > 0 && (
        <div className="space-y-6">
          <p className="text-xs text-gray-400">
            {result.total} contenido{result.total !== 1 ? "s" : ""} en {result.brands.length} marca{result.brands.length !== 1 ? "s" : ""}
          </p>

          {result.brands.map(brand => (
            <div key={brand.client_id} className="space-y-3">
              {/* Cabecera de marca */}
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: brand.client_color }} />
                <h3 className="text-sm font-semibold text-gray-800">{brand.client_name}</h3>
                <span className="text-xs text-gray-400">{brand.posts.length} post{brand.posts.length !== 1 ? "s" : ""}</span>
                <Link href={`/clientes/${brand.client_id}/contenido`}
                  className="ml-auto flex items-center gap-1 text-[11px] text-violet-500 hover:text-violet-700 transition-colors">
                  Ver plan completo <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {/* Grid de posts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {brand.posts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!searched && !loading && (
        <div className="text-center py-20 text-sm text-gray-300">
          Usa los filtros para buscar contenidos a través de todas las marcas
        </div>
      )}
    </div>
  );
}

function PostCard({ post }: { post: Post }) {
  const thumb = post.media_urls?.[0];
  const isImage = thumb && !thumb.match(/\.(mp4|mov|webm)$/i);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-violet-300 hover:shadow-sm transition-all">
      {/* Thumbnail */}
      {thumb ? (
        isImage ? (
          <div className="h-32 bg-gray-100 overflow-hidden">
            <img
              src={`/api/files/${thumb}`}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        ) : (
          <div className="h-32 bg-gray-100 flex items-center justify-center">
            <span className="text-3xl">🎥</span>
          </div>
        )
      ) : (
        <div className="h-32 bg-gray-50 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-gray-200" />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Platform + type badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {post.platform && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {post.platform}
            </span>
          )}
          {post.post_type && (
            <span className="text-[10px] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded-full">
              {post.post_type}
            </span>
          )}
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full ml-auto", STATUS_COLOR[post.status] ?? "bg-gray-100 text-gray-500")}>
            {STATUS_LABEL[post.status] ?? post.status}
          </span>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{post.caption}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-50">
          <span>{fmtDate(post.publish_date)}</span>
          {post.assigned_to && (
            <span className="text-violet-500 font-medium">👤 {post.assigned_to}</span>
          )}
        </div>
      </div>
    </div>
  );
}
