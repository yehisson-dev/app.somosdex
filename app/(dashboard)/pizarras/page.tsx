"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, LayoutDashboard, Clock, Loader2, Building2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "next-auth/react";
import { cn, formatRelativeDate, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/types/database";

interface Client { id: string; name: string; color?: string; }
interface BoardMember { user_id: string; user: User; }
interface Board {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  client_id: string | null;
  client?: Client | null;
  members?: BoardMember[];
}

export default function PizarrasPage() {
  const router   = useRouter();
  const supabase = createClient();
  const { data: session } = useSession();

  const [boards, setBoards]         = useState<Board[]>([]);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allUsers, setAllUsers]     = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [creating, setCreating]     = useState(false);
  const [showNew, setShowNew]       = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // form state
  const [newName, setNewName]           = useState("");
  const [newDesc, setNewDesc]           = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedUsers, setSelectedUsers]   = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      if (!session?.user?.email) return;

      const [{ data: user }, { data: bds }, { data: clients }, { data: users }] = await Promise.all([
        supabase.from("users").select("*").eq("email", session.user.email).single(),
        supabase
          .from("whiteboards")
          .select(`
            id, name, description, created_at, updated_at, created_by, client_id,
            client:clients(id, name, color),
            members:whiteboard_members(user_id, user:users(id, full_name, email, avatar_url))
          `)
          .order("updated_at", { ascending: false }),
        supabase.from("clients").select("id, name, color").order("name"),
        supabase.from("users").select("id, full_name, email, avatar_url, role, job_title, created_at, updated_at").order("full_name"),
      ]);

      if (user) setCurrentUser(user as User);
      if (bds)  setBoards(bds as unknown as Board[]);
      if (clients) setAllClients(clients as Client[]);
      if (users)   setAllUsers(users as User[]);
      setLoading(false);
    }
    load();
  }, [session]);

  function toggleUser(id: string) {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  }

  async function createBoard() {
    if (!newName.trim() || !currentUser) return;
    setCreating(true);

    const { data } = await supabase
      .from("whiteboards")
      .insert({
        name: newName.trim(),
        description: newDesc.trim() || null,
        created_by: currentUser.id,
        client_id: selectedClient || null,
      } as any)
      .select()
      .single();

    if (data) {
      const boardId = (data as any).id;

      // Add selected members + always add creator
      const memberIds = Array.from(new Set([currentUser.id, ...selectedUsers]));
      await supabase.from("whiteboard_members").insert(
        memberIds.map((uid) => ({ whiteboard_id: boardId, user_id: uid }))
      );

      router.push(`/pizarras/${boardId}`);
    }
    setCreating(false);
  }

  async function deleteBoard(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("¿Eliminar esta pizarra? No se puede deshacer.")) return;
    await supabase.from("whiteboards").delete().eq("id", id);
    setBoards((p) => p.filter((b) => b.id !== id));
  }

  function openNew() {
    setNewName(""); setNewDesc(""); setSelectedClient(""); setSelectedUsers([]);
    setShowNew(true);
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Pizarras" subtitle="Colaboración visual en tiempo real" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Mis pizarras</h2>
              <p className="text-xs text-gray-400 mt-0.5">Crea y colabora en tiempo real con tu equipo</p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nueva pizarra
            </button>
          </div>

          {/* Modal nueva pizarra */}
          {showNew && (
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-900">Nueva pizarra</h3>

                {/* Nombre */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
                  <input
                    autoFocus type="text" value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createBoard()}
                    placeholder="Nombre de la pizarra…"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                  <input
                    type="text" value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Descripción opcional…"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition"
                  />
                </div>

                {/* Cliente */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> Cliente
                  </label>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition"
                  >
                    <option value="">Sin cliente</option>
                    {allClients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Usuarios */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Colaboradores
                  </label>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {allUsers.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const checked = isSelf || selectedUsers.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                            checked ? "bg-violet-50" : "hover:bg-gray-50",
                            isSelf && "opacity-60 cursor-default"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSelf}
                            onChange={() => !isSelf && toggleUser(u.id)}
                            className="accent-violet-600 w-3.5 h-3.5 shrink-0"
                          />
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarImage src={u.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-violet-100 text-violet-600 text-[10px]">
                              {getInitials(u.full_name ?? u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-gray-700 truncate">
                            {u.full_name ?? u.email}
                            {isSelf && <span className="ml-1 text-gray-400 text-xs">(tú)</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowNew(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={createBoard}
                    disabled={!newName.trim() || creating}
                    className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-40"
                  >
                    {creating ? "Creando…" : "Crear y abrir"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                <LayoutDashboard className="w-8 h-8 text-violet-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Sin pizarras aún</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Crea tu primera pizarra y empieza a colaborar</p>
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-500 transition-colors"
              >
                <Plus className="w-4 h-4" /> Nueva pizarra
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => (
                <BoardCard
                  key={board.id}
                  board={board}
                  onOpen={() => router.push(`/pizarras/${board.id}`)}
                  onDelete={(e) => deleteBoard(board.id, e)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BoardCard({ board, onOpen, onDelete }: { board: Board; onOpen: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const members = (board.members ?? []).slice(0, 5);
  const extra   = (board.members?.length ?? 0) - 5;

  return (
    <button
      onClick={onOpen}
      className="group bg-white border border-gray-200 rounded-2xl p-5 text-left hover:border-violet-300 hover:shadow-md transition-all"
    >
      {/* Preview */}
      <div className="w-full h-28 rounded-xl bg-gradient-to-br from-violet-50 via-teal-50 to-cyan-50 mb-4 flex items-center justify-center overflow-hidden relative">
        <div className="grid grid-cols-4 gap-1 opacity-20">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className={cn(
              "rounded",
              i % 3 === 0 ? "h-6 bg-violet-400" : i % 3 === 1 ? "h-4 bg-teal-400" : "h-5 bg-cyan-300"
            )} />
          ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <LayoutDashboard className="w-8 h-8 text-violet-300 group-hover:text-violet-400 transition-colors" />
        </div>
      </div>

      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{board.name}</p>
          {board.description && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{board.description}</p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Client badge */}
      {board.client && (
        <div className="flex items-center gap-1.5 mt-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: board.client.color ?? "#6366f1" }}
          />
          <span className="text-[11px] text-gray-500 truncate">{board.client.name}</span>
        </div>
      )}

      {/* Members + date row */}
      <div className="flex items-center justify-between mt-2.5">
        {/* Member avatars */}
        <div className="flex -space-x-1.5">
          {members.map((m) => (
            <Avatar key={m.user_id} className="w-5 h-5 border border-white ring-0">
              <AvatarImage src={m.user?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-violet-100 text-violet-600 text-[8px]">
                {getInitials(m.user?.full_name ?? m.user?.email)}
              </AvatarFallback>
            </Avatar>
          ))}
          {extra > 0 && (
            <span className="w-5 h-5 rounded-full bg-gray-100 border border-white text-[8px] text-gray-500 flex items-center justify-center">
              +{extra}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1 text-[10px] text-gray-400">
          <Clock className="w-3 h-3" />
          {formatRelativeDate(board.updated_at)}
        </p>
      </div>
    </button>
  );
}
