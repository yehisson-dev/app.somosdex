"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, CheckSquare, Building2, FolderKanban, Users, Command } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface SearchResult {
  tasks:    any[];
  clients:  any[];
  projects: any[];
  users:    any[];
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-600",
  high:   "bg-orange-100 text-orange-600",
  medium: "bg-yellow-100 text-yellow-600",
  low:    "bg-gray-100 text-gray-500",
  none:   "bg-gray-100 text-gray-400",
};
const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgente", high: "Alta", medium: "Media", low: "Baja", none: "—",
};

export function GlobalSearch() {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [q,       setQ]       = useState("");
  const [result,  setResult]  = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cursor,  setCursor]  = useState(0);
  const inputRef  = useRef<HTMLInputElement>(null);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Abrir con Ctrl+K / Cmd+K o CustomEvent desde el trigger
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onEvent() { setOpen(true); }
    document.addEventListener("keydown", onKey);
    document.addEventListener("open-global-search", onEvent);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("open-global-search", onEvent);
    };
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 50); setQ(""); setResult(null); setCursor(0); }
  }, [open]);

  const doSearch = useCallback(async (val: string) => {
    if (val.length < 2) { setResult(null); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(val)}`);
      setResult(await res.json());
      setCursor(0);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(q), 280);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [q, doSearch]);

  // Flatten items for keyboard nav
  const items = result ? [
    ...result.tasks.map(t    => ({ type: "task",    data: t,    href: `/tareas/${t.id}` })),
    ...result.clients.map(c  => ({ type: "client",  data: c,    href: `/clientes/${c.id}` })),
    ...result.projects.map(p => ({ type: "project", data: p,    href: `/proyectos` })),
    ...result.users.map(u    => ({ type: "user",    data: u,    href: `/mis-tareas` })),
  ] : [];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open || !items.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, items.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
      if (e.key === "Enter" && items[cursor]) {
        navigate(items[cursor].href);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, items, cursor]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  const hasResults = result && (result.tasks.length + result.clients.length + result.projects.length + result.users.length) > 0;
  const searched   = q.length >= 2;

  if (!open) return null;

  let globalIdx = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {loading
            ? <Loader2 className="w-4 h-4 text-violet-500 animate-spin shrink-0" />
            : <Search className="w-4 h-4 text-gray-400 shrink-0" />
          }
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar tareas, clientes, proyectos, usuarios…"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
          />
          {q && (
            <button onClick={() => { setQ(""); setResult(null); inputRef.current?.focus(); }}
              className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 font-mono">
            Esc
          </kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!searched && !result && (
            <div className="flex flex-col items-center gap-2 py-10 text-gray-300">
              <Search className="w-8 h-8 opacity-40" />
              <p className="text-xs">Escribe al menos 2 caracteres</p>
            </div>
          )}

          {searched && !loading && !hasResults && (
            <div className="py-10 text-center text-xs text-gray-400">
              Sin resultados para <strong className="text-gray-600">"{q}"</strong>
            </div>
          )}

          {hasResults && result && (
            <div className="py-1">

              {/* Tareas */}
              {result.tasks.length > 0 && (
                <Section label="Tareas" icon={<CheckSquare className="w-3 h-3" />}>
                  {result.tasks.map(t => {
                    globalIdx++;
                    const idx = globalIdx;
                    return (
                      <ResultItem key={t.id} active={cursor === idx} onClick={() => navigate(`/tareas/${t.id}`)}>
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                            style={{ backgroundColor: t.project_color ? t.project_color + "20" : "#f3f4f6" }}>
                            <CheckSquare className="w-3.5 h-3.5" style={{ color: t.project_color ?? "#6b7280" }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 font-medium truncate">{t.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {t.client_name && <span className="text-[10px] text-gray-400">{t.client_name}</span>}
                              {t.client_name && t.project_name && <span className="text-gray-200">·</span>}
                              {t.project_name && <span className="text-[10px] text-gray-400">{t.project_name}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {t.status_name && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: (t.status_color ?? "#6b7280") + "20", color: t.status_color ?? "#6b7280" }}>
                                {t.status_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </ResultItem>
                    );
                  })}
                </Section>
              )}

              {/* Clientes */}
              {result.clients.length > 0 && (
                <Section label="Clientes" icon={<Building2 className="w-3 h-3" />}>
                  {result.clients.map(c => {
                    globalIdx++;
                    const idx = globalIdx;
                    return (
                      <ResultItem key={c.id} active={cursor === idx} onClick={() => navigate(`/clientes/${c.id}`)}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: c.color ?? "#6b7280" }}>
                            {getInitials(c.name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 font-medium truncate">{c.name}</p>
                            {c.company && <p className="text-[10px] text-gray-400 truncate">{c.company}</p>}
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0">{c.task_count} tareas</span>
                        </div>
                      </ResultItem>
                    );
                  })}
                </Section>
              )}

              {/* Proyectos */}
              {result.projects.length > 0 && (
                <Section label="Proyectos" icon={<FolderKanban className="w-3 h-3" />}>
                  {result.projects.map(p => {
                    globalIdx++;
                    const idx = globalIdx;
                    return (
                      <ResultItem key={p.id} active={cursor === idx} onClick={() => navigate(`/proyectos`)}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: (p.color ?? "#6b7280") + "25" }}>
                            <FolderKanban className="w-3.5 h-3.5" style={{ color: p.color ?? "#6b7280" }} />
                          </div>
                          <p className="text-sm text-gray-800 font-medium flex-1 truncate">{p.name}</p>
                          <span className="text-[10px] text-gray-400 shrink-0">{p.task_count} tareas</span>
                        </div>
                      </ResultItem>
                    );
                  })}
                </Section>
              )}

              {/* Usuarios */}
              {result.users.length > 0 && (
                <Section label="Usuarios" icon={<Users className="w-3 h-3" />}>
                  {result.users.map(u => {
                    globalIdx++;
                    const idx = globalIdx;
                    return (
                      <ResultItem key={u.id} active={cursor === idx} onClick={() => navigate(`/mis-tareas`)}>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarImage src={u.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px] bg-violet-100 text-violet-600 font-semibold">
                              {getInitials(u.full_name ?? u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 font-medium truncate">{u.full_name}</p>
                            {u.job_title && <p className="text-[10px] text-gray-400 truncate">{u.job_title}</p>}
                          </div>
                        </div>
                      </ResultItem>
                    );
                  })}
                </Section>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-[10px] text-gray-400">
          <span className="flex items-center gap-1"><kbd className="border border-gray-200 rounded px-1 font-mono">↑↓</kbd> navegar</span>
          <span className="flex items-center gap-1"><kbd className="border border-gray-200 rounded px-1 font-mono">↵</kbd> abrir</span>
          <span className="flex items-center gap-1 ml-auto"><Command className="w-3 h-3" />K para abrir/cerrar</span>
        </div>
      </div>
    </div>
  );
}

function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-widest bg-gray-50/70">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}

function ResultItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (active) ref.current?.scrollIntoView({ block: "nearest" }); }, [active]);
  return (
    <button ref={ref} onClick={onClick}
      className={cn("w-full px-4 py-2.5 text-left transition-colors hover:bg-violet-50/60 border-b border-gray-50 last:border-0",
        active && "bg-violet-50")}>
      {children}
    </button>
  );
}

// Trigger visible para el TopBar
export function SearchTrigger() {
  return (
    <button
      onClick={() => document.dispatchEvent(new CustomEvent("open-global-search"))}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors min-w-[160px]"
    >
      <Search className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1 text-left">Buscar…</span>
      <span className="flex items-center gap-0.5 font-mono text-[10px] text-gray-300">
        <Command className="w-2.5 h-2.5" />K
      </span>
    </button>
  );
}
