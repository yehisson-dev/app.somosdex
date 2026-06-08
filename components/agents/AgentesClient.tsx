"use client";

import { useState } from "react";
import { Bot, ChevronRight } from "lucide-react";
import { AgentCard, type Agent } from "./AgentCard";
import { cn } from "@/lib/utils";

interface Client { id: string; name: string; color: string; logo_url: string | null; }

interface Props {
  agents: Agent[];
  clients: Client[];
}

export function AgentesClient({ agents: initial, clients }: Props) {
  const [agents, setAgents]         = useState<Agent[]>(initial);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [mode, setMode]             = useState<"run" | "config">("run");

  const client = clients.find((c) => c.id === selectedClient);

  async function handleSavePrompt(id: string, system_prompt: string) {
    await fetch("/api/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, system_prompt }),
    });
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, system_prompt } : a))
    );
  }

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left sidebar */}
      <div className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Agentes IA</h1>
              <p className="text-[10px] text-gray-400">{agents.length} agentes configurables</p>
            </div>
          </div>
        </div>

        {/* Mode switcher */}
        <div className="px-3 py-3 border-b border-gray-100">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setMode("run")}
              className={cn(
                "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors",
                mode === "run" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              ▶ Ejecutar
            </button>
            <button
              onClick={() => setMode("config")}
              className={cn(
                "flex-1 py-1.5 rounded-md text-xs font-medium transition-colors",
                mode === "config" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              ⚙ Configurar
            </button>
          </div>
        </div>

        {/* Client selector (only in run mode) */}
        {mode === "run" && (
          <div className="flex-1 overflow-y-auto py-3 px-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-2 mb-2">
              Selecciona un cliente
            </p>
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedClient(c.id === selectedClient ? null : c.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors",
                  selectedClient === c.id
                    ? "bg-violet-50 text-violet-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.name} className="w-6 h-6 rounded-md object-contain border border-gray-100 shrink-0" />
                ) : (
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-white text-[10px] font-bold"
                    style={{ backgroundColor: c.color ?? "#6366f1" }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="truncate flex-1">{c.name}</span>
                {selectedClient === c.id && <ChevronRight className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
              </button>
            ))}
          </div>
        )}

        {mode === "config" && (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-gray-400 text-center">
              En modo configuración puedes editar las instrucciones de cada agente.
            </p>
          </div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div>
              {mode === "config" ? (
                <>
                  <h2 className="text-base font-semibold text-gray-900">Configurar instrucciones</h2>
                  <p className="text-xs text-gray-400">Define las skills de cada agente. El agente recibirá automáticamente el perfil del cliente y el conocimiento del Cerebro.</p>
                </>
              ) : selectedClient ? (
                <>
                  <h2 className="text-base font-semibold text-gray-900">
                    Agentes para <span style={{ color: client?.color }}>{client?.name}</span>
                  </h2>
                  <p className="text-xs text-gray-400">Ejecuta cualquier agente para generar el entregable de este cliente.</p>
                </>
              ) : (
                <>
                  <h2 className="text-base font-semibold text-gray-900">Selecciona un cliente</h2>
                  <p className="text-xs text-gray-400">Elige un cliente en la barra lateral para ejecutar los agentes.</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-3">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                clientId={mode === "run" && selectedClient ? selectedClient : null}
                adminMode={mode === "config"}
                onSave={handleSavePrompt}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
