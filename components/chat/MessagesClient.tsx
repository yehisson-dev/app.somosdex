"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Hash, MessageSquare, Plus, Search, X, Users,
  UserPlus, Check, ChevronRight, Trash2,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { MessageThread } from "./MessageThread";
import { MessageInput } from "./MessageInput";
import { TopBar } from "@/components/layout/TopBar";
import type { Channel, Message, User } from "@/types/database";

interface Props {
  currentUser: User;
  allUsers: User[];
  initialChannels: Channel[];
}

export function MessagesClient({ currentUser, allUsers, initialChannels }: Props) {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(
    searchParams.get("channel") ?? initialChannels.find((c) => c.type === "general")?.id ?? null
  );
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [searchUser, setSearchUser] = useState("");

  // ── Crear canal ────────────────────────────────────────────────────────────
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelMembers, setNewChannelMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const newChannelRef = useRef<HTMLDivElement>(null);

  // ── Gestión de miembros ────────────────────────────────────────────────────
  const [showMembers, setShowMembers] = useState(false);
  const [channelMembers, setChannelMembers] = useState<User[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  // Cargar miembros cuando se abre el panel
  useEffect(() => {
    if (!showMembers || !activeChannelId) return;
    setLoadingMembers(true);
    supabase
      .from("channel_members")
      .select("user_id, user:users!channel_members_user_id_fkey(id, full_name, email, avatar_url, role, job_title, created_at, updated_at)")
      .eq("channel_id", activeChannelId)
      .then(({ data }) => {
        const members = (data ?? []).map((m: any) => m.user).filter(Boolean);
        setChannelMembers(members as User[]);
        setLoadingMembers(false);
      });
  }, [showMembers, activeChannelId]);

  // Cerrar modal al hacer clic fuera
  useEffect(() => {
    if (!showNewChannel) return;
    function onMouseDown(e: MouseEvent) {
      if (newChannelRef.current && !newChannelRef.current.contains(e.target as Node)) {
        setShowNewChannel(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showNewChannel]);

  // ── Mensajes ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeChannelId) return;
    setLoadingMsgs(true);
    setShowMembers(false);
    supabase
      .from("messages")
      .select("*, user:users!messages_user_id_fkey(id, full_name, avatar_url, email)")
      .eq("channel_id", activeChannelId)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages((p) => ({ ...p, [activeChannelId]: data as Message[] }));
        setLoadingMsgs(false);
      });

    supabase
      .from("channel_members")
      .update({ last_read_at: new Date().toISOString() } as any)
      .eq("channel_id", activeChannelId)
      .eq("user_id", currentUser.id)
      .then(() => {});
  }, [activeChannelId]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!activeChannelId) return;
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", activeChannelId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) {
        setMessages((p) => ({ ...p, [activeChannelId]: data as Message[] }));
      }
    }, 5000);
    return () => clearInterval(poll);
  }, [activeChannelId]);

  // ── Enviar mensaje ─────────────────────────────────────────────────────────
  async function handleSend(content: string, mentionIds: string[]) {
    const { data: msg, error } = await supabase
      .from("messages")
      .insert({ channel_id: activeChannelId!, user_id: currentUser.id, content, mentions: mentionIds } as any)
      .select("*, user:users!messages_user_id_fkey(id, full_name, avatar_url, email)")
      .single();
    if (error || !msg) return;
    setMessages((p) => {
      const existing = p[activeChannelId!] ?? [];
      if (existing.find((m) => m.id === (msg as Message).id)) return p;
      return { ...p, [activeChannelId!]: [...existing, msg as Message] };
    });
    if (mentionIds.length > 0) {
      const channelName = activeChannel?.name ?? "chat";
      await Promise.all(mentionIds.map((userId) =>
        supabase.from("notifications").insert({
          user_id: userId, type: "message_mention" as any,
          title: `${currentUser.full_name} te mencionó en #${channelName}`,
          body: content.slice(0, 80),
          channel_id: activeChannelId, message_id: (msg as Message).id,
        } as any)
      ));
    }
  }

  // ── Crear canal ────────────────────────────────────────────────────────────
  async function handleCreateChannel() {
    const name = newChannelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) return;
    setCreating(true);

    const { data: ch } = await supabase
      .from("channels")
      .insert({ type: "custom", name, created_by: currentUser.id } as any)
      .select()
      .single();
    if (!ch) { setCreating(false); return; }

    // Agregar al creador + miembros seleccionados
    const memberIds = Array.from(new Set([currentUser.id, ...newChannelMembers]));
    await supabase.from("channel_members").insert(
      memberIds.map((uid) => ({ channel_id: ch.id, user_id: uid } as any))
    );

    setChannels((p) => [...p, ch as Channel]);
    setActiveChannelId(ch.id);
    setShowNewChannel(false);
    setNewChannelName("");
    setNewChannelMembers([]);
    setCreating(false);
  }

  // ── DMs ────────────────────────────────────────────────────────────────────
  async function openDM(user: User) {
    const existing = channels.find((c) => c.type === "direct" && c.name?.includes(user.id));
    if (existing) { setActiveChannelId(existing.id); return; }
    const { data: ch } = await supabase
      .from("channels")
      .insert({ type: "direct", name: `${currentUser.id}:${user.id}`, created_by: currentUser.id } as any)
      .select().single();
    if (!ch) return;
    await supabase.from("channel_members").insert([
      { channel_id: ch.id, user_id: currentUser.id } as any,
      { channel_id: ch.id, user_id: user.id } as any,
    ]);
    setChannels((p) => [...p, ch as Channel]);
    setActiveChannelId(ch.id);
  }

  // ── Gestión de miembros ────────────────────────────────────────────────────
  async function addMember(user: User) {
    if (!activeChannelId) return;
    await supabase.from("channel_members").insert({ channel_id: activeChannelId, user_id: user.id } as any);
    setChannelMembers((p) => [...p, user]);
  }

  async function removeMember(userId: string) {
    if (!activeChannelId || userId === currentUser.id) return;
    await supabase.from("channel_members").delete()
      .eq("channel_id", activeChannelId).eq("user_id", userId);
    setChannelMembers((p) => p.filter((m) => m.id !== userId));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getChannelLabel(ch: Channel): string {
    if (ch.type === "direct") {
      const otherId = ch.name?.split(":").find((id) => id !== currentUser.id);
      const other = allUsers.find((u) => u.id === otherId);
      return other?.full_name ?? other?.email ?? "DM";
    }
    return ch.name ?? "canal";
  }

  function getDMUser(ch: Channel): User | undefined {
    const otherId = ch.name?.split(":").find((id) => id !== currentUser.id);
    return allUsers.find((u) => u.id === otherId);
  }

  const generalChannels = channels.filter((c) => c.type === "general");
  const customChannels  = channels.filter((c) => c.type === "custom");
  const dmChannels      = channels.filter((c) => c.type === "direct");
  const channelMessages = messages[activeChannelId ?? ""] ?? [];

  const membersInChannel = activeChannel?.type === "general"
    ? [currentUser, ...allUsers]
    : activeChannel?.type === "direct"
    ? [currentUser, getDMUser(activeChannel)!].filter(Boolean)
    : channelMembers.length > 0 ? channelMembers : [currentUser, ...allUsers];

  const canManageMembers = activeChannel?.type === "custom" || activeChannel?.type === "general";

  // Usuarios que NO están ya en el canal (para agregar)
  const nonMembers = allUsers.filter(
    (u) => !channelMembers.find((m) => m.id === u.id) &&
           (u.full_name?.toLowerCase().includes(memberSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Mensajes" subtitle="Comunicación interna del equipo" />

      <div className="flex-1 overflow-hidden flex">
        {/* ── Sidebar izquierdo ─────────────────────────────────────────── */}
        <div className="w-56 border-r border-gray-200 bg-white flex flex-col shrink-0">

          {/* Canales */}
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Canales</p>
              <button
                onClick={() => setShowNewChannel(true)}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-violet-600 transition-colors"
                title="Nuevo canal"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* General */}
            {generalChannels.map((ch) => (
              <ChannelButton
                key={ch.id}
                label="general"
                active={activeChannelId === ch.id}
                onClick={() => setActiveChannelId(ch.id)}
              />
            ))}

            {/* Canales personalizados */}
            {customChannels.map((ch) => (
              <ChannelButton
                key={ch.id}
                label={ch.name ?? "canal"}
                active={activeChannelId === ch.id}
                onClick={() => setActiveChannelId(ch.id)}
              />
            ))}
          </div>

          {/* DMs */}
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
              Mensajes directos
            </p>

            {dmChannels.map((ch) => {
              const other = getDMUser(ch);
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left mb-0.5",
                    activeChannelId === ch.id
                      ? "bg-violet-50 text-violet-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <Avatar className="w-5 h-5 shrink-0">
                    <AvatarImage src={other?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[8px] bg-violet-100 text-violet-600">
                      {getInitials(other?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs">{other?.full_name ?? "Usuario"}</span>
                </button>
              );
            })}

            {/* Búsqueda nuevo DM */}
            <div className="mt-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 mb-1">
                <Search className="w-3 h-3 text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  placeholder="Nuevo mensaje…"
                  className="flex-1 bg-transparent text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              {searchUser && allUsers
                .filter((u) =>
                  u.full_name?.toLowerCase().includes(searchUser.toLowerCase()) ||
                  u.email.toLowerCase().includes(searchUser.toLowerCase())
                )
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { openDM(u); setSearchUser(""); }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-violet-50 text-left transition-colors"
                  >
                    <Avatar className="w-5 h-5 shrink-0">
                      <AvatarImage src={u.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[8px] bg-violet-100 text-violet-600">
                        {getInitials(u.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-700 truncate">{u.full_name}</span>
                    <Plus className="w-3 h-3 text-gray-400 ml-auto shrink-0" />
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* ── Área de mensajes ───────────────────────────────────────────── */}
        {activeChannel ? (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
              {/* Header canal */}
              <div className="px-5 py-3 bg-white border-b border-gray-200 shrink-0 flex items-center gap-2">
                {activeChannel.type === "direct" ? (
                  <Avatar className="w-5 h-5 shrink-0">
                    <AvatarImage src={getDMUser(activeChannel)?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[8px] bg-violet-100 text-violet-600">
                      {getInitials(getDMUser(activeChannel)?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Hash className="w-4 h-4 text-violet-600 shrink-0" />
                )}
                <span className="text-sm font-semibold text-gray-900">
                  {getChannelLabel(activeChannel)}
                </span>

                {canManageMembers && (
                  <button
                    onClick={() => setShowMembers((v) => !v)}
                    className={cn(
                      "ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors",
                      showMembers
                        ? "bg-violet-50 text-violet-700 font-medium"
                        : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Users className="w-3.5 h-3.5" />
                    Miembros
                    {channelMembers.length > 0 && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                        {activeChannel.type === "general" ? allUsers.length + 1 : channelMembers.length}
                      </span>
                    )}
                  </button>
                )}
              </div>

              <MessageThread
                messages={channelMessages}
                currentUserId={currentUser.id}
                loading={loadingMsgs}
              />

              <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                <MessageInput
                  onSend={handleSend}
                  members={membersInChannel.filter((m): m is User => !!m && m.id !== currentUser.id)}
                  placeholder={
                    activeChannel.type === "direct"
                      ? `Mensaje a ${getChannelLabel(activeChannel)}…`
                      : `Mensaje en #${getChannelLabel(activeChannel)}… (@nombre para mencionar)`
                  }
                />
              </div>
            </div>

            {/* ── Panel de miembros ──────────────────────────────────────── */}
            {showMembers && canManageMembers && (
              <div className="w-64 border-l border-gray-200 bg-white flex flex-col shrink-0">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-700">Miembros del canal</span>
                  <button onClick={() => setShowMembers(false)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-4">
                  {/* Miembros actuales */}
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                      En este canal
                    </p>
                    {loadingMembers ? (
                      <div className="flex justify-center py-4">
                        <span className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      (activeChannel.type === "general" ? [currentUser, ...allUsers] : channelMembers).map((member) => (
                        <div key={member.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg group">
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarImage src={member.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[9px] bg-violet-100 text-violet-600">
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {member.full_name ?? member.email}
                              {member.id === currentUser.id && (
                                <span className="ml-1 text-[10px] text-gray-400">(tú)</span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-400 capitalize truncate">
                              {member.job_title ?? member.role}
                            </p>
                          </div>
                          {activeChannel.type === "custom" && member.id !== currentUser.id && (
                            <button
                              onClick={() => removeMember(member.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-gray-300 hover:text-red-500 transition-all"
                              title="Quitar del canal"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Agregar miembros (solo canales custom) */}
                  {activeChannel.type === "custom" && (
                    <div>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                        Agregar miembro
                      </p>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-gray-200 bg-gray-50 mb-2">
                        <Search className="w-3 h-3 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          placeholder="Buscar usuario…"
                          className="flex-1 bg-transparent text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none"
                        />
                      </div>
                      {nonMembers.slice(0, 6).map((u) => (
                        <button
                          key={u.id}
                          onClick={() => addMember(u)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-violet-50 text-left transition-colors group"
                        >
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarImage src={u.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[9px] bg-violet-100 text-violet-600">
                              {getInitials(u.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-700 flex-1 truncate">{u.full_name ?? u.email}</span>
                          <UserPlus className="w-3.5 h-3.5 text-gray-300 group-hover:text-violet-500 shrink-0" />
                        </button>
                      ))}
                      {memberSearch && nonMembers.length === 0 && (
                        <p className="text-xs text-gray-400 px-2">Ya están todos en este canal.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecciona un canal para chatear</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Nuevo canal ─────────────────────────────────────────────── */}
      {showNewChannel && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div ref={newChannelRef} className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Nuevo canal</h3>
              <button
                onClick={() => setShowNewChannel(false)}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Nombre del canal</label>
                <div className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg focus-within:border-violet-400 focus-within:ring-1 focus-within:ring-violet-200 transition">
                  <Hash className="w-4 h-4 text-gray-400 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    placeholder="ej. diseño, marketing, general-2"
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
                  />
                </div>
              </div>

              {/* Miembros */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Agregar miembros <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {allUsers.map((u) => {
                    const selected = newChannelMembers.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() =>
                          setNewChannelMembers((p) =>
                            selected ? p.filter((id) => id !== u.id) : [...p, u.id]
                          )
                        }
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-gray-50 last:border-0",
                          selected ? "bg-violet-50" : "hover:bg-gray-50"
                        )}
                      >
                        <Avatar className="w-6 h-6 shrink-0">
                          <AvatarImage src={u.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[9px] bg-violet-100 text-violet-600">
                            {getInitials(u.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{u.full_name ?? u.email}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{u.job_title ?? u.role}</p>
                        </div>
                        <div className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                          selected ? "bg-violet-600 border-violet-600" : "border-gray-300"
                        )}>
                          {selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {newChannelMembers.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    {newChannelMembers.length} miembro{newChannelMembers.length !== 1 ? "s" : ""} seleccionado{newChannelMembers.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowNewChannel(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim() || creating}
                className="px-4 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creating ? "Creando…" : "Crear canal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChannelButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors text-left mb-0.5",
        active ? "bg-violet-50 text-violet-700 font-medium" : "text-gray-600 hover:bg-gray-100"
      )}
    >
      <Hash className="w-3.5 h-3.5 shrink-0 opacity-60" />
      <span className="truncate">{label}</span>
    </button>
  );
}
