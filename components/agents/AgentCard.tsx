"use client";

import { useState } from "react";
import {
  TrendingUp, Crosshair, Users, Map, PenSquare, Zap, Bot,
  ChevronDown, ChevronUp, Save, Play, Loader2, Clock,
  CheckCircle, AlertCircle, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

const ICONS: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp className="w-4 h-4" />,
  Crosshair:  <Crosshair  className="w-4 h-4" />,
  Users:      <Users      className="w-4 h-4" />,
  Map:        <Map        className="w-4 h-4" />,
  PenSquare:  <PenSquare  className="w-4 h-4" />,
  Zap:        <Zap        className="w-4 h-4" />,
  Bot:        <Bot        className="w-4 h-4" />,
};

export interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string;
  system_prompt: string;
  icon: string;
  color: string;
  position: number;
}

interface AgentRun {
  id: string;
  output: string;
  created_at: string;
  client_id: string;
}

interface Props {
  agent: Agent;
  clientId?: string | null;    // if set, shows Run button
  adminMode?: boolean;          // if true, shows prompt editor
  onSave?: (id: string, prompt: string) => Promise<void>;
}

export function AgentCard({ agent, clientId, adminMode, onSave }: Props) {
  const [expanded, setExpanded]     = useState(false);
  const [prompt, setPrompt]         = useState(agent.system_prompt);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  // Run state
  const [running, setRunning]       = useState(false);
  const [output, setOutput]         = useState("");
  const [runError, setRunError]     = useState("");
  const [copied, setCopied]         = useState(false);

  // Past runs
  const [runs, setRuns]             = useState<AgentRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [showRuns, setShowRuns]     = useState(false);

  const hasPrompt = agent.system_prompt.trim().length > 0;

  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    await onSave(agent.id, prompt);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleRun() {
    if (!clientId) return;
    setRunning(true);
    setOutput("");
    setRunError("");

    try {
      const res = await fetch(`/api/agents/${agent.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId }),
      });

      if (!res.ok) {
        const json = await res.json();
        setRunError(json.error ?? "Error al ejecutar el agente");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value);
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = JSON.parse(line.slice(6));
          if (json.text)  setOutput((p) => p + json.text);
          if (json.error) setRunError(json.error);
        }
      }
    } catch (e: any) {
      setRunError(e.message);
    } finally {
      setRunning(false);
    }
  }

  async function loadRuns() {
    if (!clientId) return;
    setLoadingRuns(true);
    setShowRuns(true);
    const res  = await fetch(`/api/agents/${agent.id}/runs?client_id=${clientId}`);
    const json = await res.json();
    setRuns(json.runs ?? []);
    setLoadingRuns(false);
  }

  async function copyOutput(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ backgroundColor: agent.color }}
        >
          {ICONS[agent.icon] ?? <Bot className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
          <p className="text-xs text-gray-400 truncate">{agent.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status pill */}
          {hasPrompt ? (
            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-2.5 h-2.5" /> Configurado
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-2.5 h-2.5" /> Sin instrucciones
            </span>
          )}

          {/* Run button */}
          {clientId && hasPrompt && (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: agent.color }}
            >
              {running
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Play className="w-3 h-3" />}
              {running ? "Generando…" : "Ejecutar"}
            </button>
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((p) => !p)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">

          {/* Prompt editor (admin mode) */}
          {adminMode && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
                  Instrucciones / Skills del agente
                </label>
                <button
                  onClick={handleSave}
                  disabled={saving || prompt === agent.system_prompt}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  {saving  ? <Loader2 className="w-3 h-3 animate-spin" /> :
                   saved   ? <Check   className="w-3 h-3" /> :
                             <Save    className="w-3 h-3" />}
                  {saved ? "Guardado" : "Guardar"}
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={12}
                placeholder={`Define las instrucciones para ${agent.name}.\n\nEjemplo:\nEres un experto en investigación de mercados. Tu tarea es analizar el mercado de la marca del cliente y generar un informe detallado con:\n1. Tamaño y tendencias del mercado\n2. Principales actores y competidores\n3. Oportunidades y amenazas\n4. Insights accionables para la estrategia de marketing`}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 resize-none bg-gray-50"
              />
              <p className="text-[11px] text-gray-400 mt-1">{prompt.length} caracteres · El agente recibirá automáticamente el perfil del cliente y el contexto del Cerebro.</p>
            </div>
          )}

          {/* Output area */}
          {(output || runError) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Resultado</span>
                {output && (
                  <button
                    onClick={() => copyOutput(output)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                )}
              </div>
              {runError ? (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                  {runError}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown>{output}</ReactMarkdown>
                  {running && <span className="inline-block w-1 h-4 bg-violet-500 animate-pulse ml-0.5 align-middle" />}
                </div>
              )}
            </div>
          )}

          {/* Past runs */}
          {clientId && (
            <div>
              <button
                onClick={showRuns ? () => setShowRuns(false) : loadRuns}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 transition-colors"
              >
                <Clock className="w-3 h-3" />
                {showRuns ? "Ocultar historial" : "Ver ejecuciones anteriores"}
              </button>

              {showRuns && (
                <div className="mt-3 space-y-2">
                  {loadingRuns && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Loader2 className="w-3 h-3 animate-spin" /> Cargando…
                    </div>
                  )}
                  {!loadingRuns && runs.length === 0 && (
                    <p className="text-xs text-gray-400">Sin ejecuciones anteriores para este cliente.</p>
                  )}
                  {runs.map((r) => (
                    <details key={r.id} className="bg-gray-50 border border-gray-100 rounded-xl">
                      <summary className="px-4 py-2.5 text-xs text-gray-500 cursor-pointer hover:text-gray-800 flex items-center justify-between list-none">
                        <span>{new Date(r.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <button
                          onClick={(e) => { e.preventDefault(); copyOutput(r.output); }}
                          className="text-gray-400 hover:text-violet-600"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </summary>
                      <div className="px-4 pb-4 pt-2 text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none border-t border-gray-100">
                        <ReactMarkdown>{r.output}</ReactMarkdown>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
