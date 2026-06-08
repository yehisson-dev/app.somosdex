"use client";

import { useState } from "react";
import { BookOpen, Brain, Search, ChevronRight, List, LayoutGrid } from "lucide-react";
import { BrainPanel } from "./BrainPanel";
import { BrainSummary } from "./BrainSummary";
import { cn } from "@/lib/utils";
import type { Client } from "@/types/database";

interface Props {
  clients: Client[];
}

type View = "sources" | "summary";

export function CerebroClient({ clients }: Props) {
  const [activeTab, setActiveTab]       = useState<"cubo" | string>("cubo");
  const [view, setView]                 = useState<View>("sources");
  const [searchQuery, setSearchQuery]   = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching]       = useState(false);

  const selectedClient = clients.find((c) => c.id === activeTab);

  function switchBrain(id: "cubo" | string) {
    setActiveTab(id);
    setSearchResults(null);
    setSearchQuery("");
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length < 3) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const res = await fetch("/api/brain/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: searchQuery,
          brand_id: activeTab !== "cubo" ? activeTab : null,
          mode: activeTab !== "cubo" ? "both" : "cubo",
          limit: 6,
        }),
      });
      const json = await res.json();
      setSearchResults(json.chunks ?? []);
    } finally {
      setSearching(false);
    }
  }

  const isCubo = activeTab === "cubo";

  return (
    <div className="flex h-full bg-gray-50">
      {/* ── Left sidebar ── */}
      <div className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <Brain style={{ width: 18, height: 18 }} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Cerebro</h1>
              <p className="text-[10px] text-gray-400">Base de conocimiento</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {/* Cubo Brain */}
          <button
            onClick={() => switchBrain("cubo")}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors",
              activeTab === "cubo"
                ? "bg-violet-50 text-violet-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-violet-600" />
            </div>
            <span className="font-medium">Cubo Brain</span>
            {activeTab === "cubo" && <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-500" />}
          </button>

          {clients.length > 0 && (
            <div className="pt-3 pb-1 px-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                Brand Brains
              </span>
            </div>
          )}

          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => switchBrain(client.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                activeTab === client.id
                  ? "bg-violet-50 text-violet-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              {client.logo_url ? (
                <img
                  src={client.logo_url}
                  alt={client.name}
                  className="w-6 h-6 rounded-md object-contain border border-gray-100 shrink-0"
                />
              ) : (
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                  style={{ backgroundColor: client.color ?? "#6366f1" }}
                >
                  {client.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="truncate">{client.name}</span>
              {activeTab === client.id && <ChevronRight className="w-3.5 h-3.5 ml-auto text-violet-500 shrink-0" />}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center gap-4">
            <div>
              {isCubo ? (
                <>
                  <h2 className="text-base font-semibold text-gray-900">Cubo Brain</h2>
                  <p className="text-xs text-gray-400">Metodología y conocimiento compartido de la agencia</p>
                </>
              ) : (
                <>
                  <h2 className="text-base font-semibold text-gray-900">
                    {selectedClient?.name ?? "Brand Brain"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Conocimiento de marca · {selectedClient?.company ?? ""}
                  </p>
                </>
              )}
            </div>

            {/* View tabs */}
            {searchResults === null && (
              <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setView("sources")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    view === "sources"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <List className="w-3.5 h-3.5" />
                  Fuentes
                </button>
                <button
                  onClick={() => setView("summary")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    view === "summary"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Resumen
                </button>
              </div>
            )}

            {/* Semantic search */}
            <form onSubmit={handleSearch} className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); if (!e.target.value) setSearchResults(null); }}
                  placeholder="Búsqueda semántica…"
                  className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-56 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400"
                />
              </div>
              <button
                type="submit"
                disabled={searching || searchQuery.trim().length < 3}
                className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {searching ? "Buscando…" : "Buscar"}
              </button>
              {searchResults !== null && (
                <button
                  type="button"
                  onClick={() => { setSearchResults(null); setSearchQuery(""); }}
                  className="px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-100 transition-colors"
                >
                  Limpiar
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Search results */}
          {searchResults !== null && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""} para &ldquo;{searchQuery}&rdquo;
                </h3>
              </div>
              {searchResults.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-sm text-gray-500">No se encontraron fragmentos relevantes.</p>
                  <p className="text-xs text-gray-400 mt-1">Intenta con otros términos o añade más fuentes.</p>
                </div>
              )}
              <div className="space-y-3">
                {searchResults.map((chunk: any, i: number) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-violet-200 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                        {chunk.brain_type === "cubo" ? "Cubo Brain" : "Brand Brain"}
                      </span>
                      <span className="text-xs text-gray-500">{chunk.source_title}</span>
                      <span className="ml-auto text-[10px] text-gray-400">
                        {(chunk.similarity * 100).toFixed(1)}% similitud
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">{chunk.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fuentes view */}
          {searchResults === null && view === "sources" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 min-h-[400px]">
              {isCubo ? (
                <BrainPanel brainType="cubo" title="Cubo Brain" accentClass="bg-violet-600" />
              ) : (
                <BrainPanel
                  brainType="brand"
                  brandId={activeTab}
                  title={`${selectedClient?.name ?? "Brand"} Brain`}
                  accentClass="bg-indigo-500"
                />
              )}
            </div>
          )}

          {/* Resumen view */}
          {searchResults === null && view === "summary" && (
            <BrainSummary
              brainType={isCubo ? "cubo" : "brand"}
              brandId={isCubo ? null : activeTab}
            />
          )}

        </div>
      </div>
    </div>
  );
}
