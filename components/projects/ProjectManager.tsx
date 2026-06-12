"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, Users, Building2, ChevronDown } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";

interface Client { id: string; name: string; color: string; company?: string | null }
interface User   { id: string; full_name: string; avatar_url?: string | null; job_title?: string | null }

interface Props {
  projectId: string;
  isAdmin: boolean;
  assignedClients: Client[];
  allClients: Client[];
  members: User[];
  allUsers: User[];
}

export function ProjectManager({ projectId, isAdmin, assignedClients, allClients, members, allUsers }: Props) {
  const router = useRouter();
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const unassignedClients = allClients.filter((c) => !assignedClients.find((a) => a.id === c.id));
  const nonMembers = allUsers.filter((u) => !members.find((m) => m.id === u.id));

  async function addClient(clientId: string) {
    setLoading("client-" + clientId);
    const res = await fetch(`/api/projects/${projectId}/clients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    setLoading(null);
    if (res.ok) { toast.success("Cliente agregado"); setShowClientPicker(false); router.refresh(); }
    else toast.error("Error al agregar cliente");
  }

  async function removeClient(clientId: string) {
    setLoading("client-rm-" + clientId);
    const res = await fetch(`/api/projects/${projectId}/clients`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    setLoading(null);
    if (res.ok) { toast.success("Cliente removido"); router.refresh(); }
    else toast.error("Error al remover cliente");
  }

  async function addMember(userId: string) {
    setLoading("user-" + userId);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setLoading(null);
    if (res.ok) { toast.success("Miembro agregado"); setShowMemberPicker(false); router.refresh(); }
    else toast.error("Error al agregar miembro");
  }

  async function removeMember(userId: string) {
    setLoading("user-rm-" + userId);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setLoading(null);
    if (res.ok) { toast.success("Miembro removido"); router.refresh(); }
    else toast.error("Error al remover miembro");
  }

  return (
    <div className="border-t border-white/8 mt-6 pt-6 space-y-6 max-w-5xl">

      {/* Equipo */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-white/40" />
            <h3 className="text-sm font-semibold text-white/70">Equipo de trabajo</h3>
            <span className="text-xs text-white/30">({members.length})</span>
          </div>
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => { setShowMemberPicker((v) => !v); setShowClientPicker(false); }}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar miembro
                <ChevronDown className="w-3 h-3" />
              </button>
              {showMemberPicker && nonMembers.length > 0 && (
                <div className="absolute right-0 top-9 z-30 w-60 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden">
                  {nonMembers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => addMember(u.id)}
                      disabled={loading === "user-" + u.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                    >
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarImage src={u.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[9px] bg-violet-700 text-white">{getInitials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-xs text-white font-medium">{u.full_name}</p>
                        {u.job_title && <p className="text-[10px] text-white/40">{u.job_title}</p>}
                      </div>
                    </button>
                  ))}
                  {nonMembers.length === 0 && (
                    <p className="text-xs text-white/30 px-4 py-3">Todos los usuarios ya son miembros</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {members.length === 0 ? (
          <p className="text-xs text-white/30 py-2">Sin miembros asignados</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {members.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-full pl-1 pr-3 py-1 group"
              >
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[9px] bg-violet-700 text-white">{getInitials(u.full_name)}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-white/80">{u.full_name}</span>
                {isAdmin && (
                  <button
                    onClick={() => removeMember(u.id)}
                    disabled={loading === "user-rm-" + u.id}
                    className="ml-1 text-white/20 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clientes */}
      {isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-white/40" />
              <h3 className="text-sm font-semibold text-white/70">Clientes asignados</h3>
              <span className="text-xs text-white/30">({assignedClients.length})</span>
            </div>
            <div className="relative">
              <button
                onClick={() => { setShowClientPicker((v) => !v); setShowMemberPicker(false); }}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar cliente
                <ChevronDown className="w-3 h-3" />
              </button>
              {showClientPicker && (
                <div className="absolute right-0 top-9 z-30 w-60 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                  {unassignedClients.length === 0 ? (
                    <p className="text-xs text-white/30 px-4 py-3">Todos los clientes ya están asignados</p>
                  ) : unassignedClients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => addClient(c.id)}
                      disabled={loading === "client-" + c.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left disabled:opacity-50"
                    >
                      <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: c.color + "40", border: `1px solid ${c.color}60` }} />
                      <div>
                        <p className="text-xs text-white font-medium">{c.name}</p>
                        {c.company && <p className="text-[10px] text-white/40">{c.company}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {assignedClients.length === 0 ? (
            <p className="text-xs text-white/30 py-2">Sin clientes asignados — agrega uno con el botón de arriba</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assignedClients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-full pl-2 pr-3 py-1"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-xs text-white/80">{c.name}</span>
                  <button
                    onClick={() => removeClient(c.id)}
                    disabled={loading === "client-rm-" + c.id}
                    className="ml-1 text-white/20 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
