"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckSquare, X, Users, Save, Loader2, ArrowLeft,
  Building2, Settings, UserPlus, Trash2, ChevronDown,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
      </div>
    ),
  }
);

interface Collaborator {
  userId: string;
  name: string;
  avatarUrl?: string;
  color: string;
  pointer?: { x: number; y: number };
  lastSeen: number;
}

interface BoardMember { user_id: string; user: User; }
interface ClientInfo  { id: string; name: string; color?: string; }

interface Whiteboard {
  id: string;
  name: string;
  elements: any[];
  app_state: any;
  created_by: string | null;
  client_id: string | null;
  client?: ClientInfo | null;
  members?: BoardMember[];
}

interface Props {
  board: Whiteboard;
  currentUser: User;
  allUsers: User[];
  allClients: ClientInfo[];
}

const COLORS = ["#0CC8C8","#8b5cf6","#f59e0b","#10b981","#ef4444","#3b82f6","#ec4899","#f97316"];

function hashColor(userId: string) {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) % COLORS.length;
  return COLORS[Math.abs(h) % COLORS.length];
}

export function WhiteboardClient({ board, currentUser, allUsers, allClients }: Props) {
  const supabase = createClient();

  const [excalidrawAPI, setExcalidrawAPI]   = useState<any>(null);
  const [collaborators, setCollaborators]   = useState<Map<string, Collaborator>>(new Map());
  const [saving, setSaving]                 = useState(false);
  const [lastSaved, setLastSaved]           = useState<Date | null>(null);

  // Board metadata (editable)
  const [clientId, setClientId]         = useState<string>(board.client_id ?? "");
  const [members, setMembers]           = useState<BoardMember[]>(board.members ?? []);

  // Panels
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [showSettings, setShowSettings]       = useState(false);
  const [showAddMember, setShowAddMember]     = useState(false);
  const [memberSearch, setMemberSearch]       = useState("");

  // Task modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm]           = useState({ title: "", assigneeId: "", dueDate: "" });
  const [creatingTask, setCreatingTask]   = useState(false);

  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);
  const myColor    = hashColor(currentUser.id);

  // ── Realtime presence ────────────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase.channel(`whiteboard:${board.id}`, {
      config: { presence: { key: currentUser.id } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<Collaborator>();
      const map   = new Map<string, Collaborator>();
      Object.entries(state).forEach(([uid, presences]) => {
        if (uid !== currentUser.id && presences.length > 0) map.set(uid, presences[0] as Collaborator);
      });
      setCollaborators(map);
    });

    ch.on("broadcast", { event: "elements" }, ({ payload }) => {
      if (payload.userId !== currentUser.id && excalidrawAPI) {
        excalidrawAPI.updateScene({ elements: payload.elements });
      }
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({
          userId: currentUser.id,
          name: currentUser.full_name ?? currentUser.email,
          avatarUrl: currentUser.avatar_url,
          color: myColor,
          lastSeen: Date.now(),
        });
      }
    });

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [board.id, currentUser.id, excalidrawAPI]);

  // ── Pointer tracking ─────────────────────────────────────────────────────────
  const handlePointerUpdate = useCallback((payload: any) => {
    if (!channelRef.current || !payload?.pointer) return;
    channelRef.current.track({
      userId: currentUser.id,
      name: currentUser.full_name ?? currentUser.email,
      avatarUrl: currentUser.avatar_url,
      color: myColor,
      pointer: payload.pointer,
      lastSeen: Date.now(),
    });
  }, [currentUser, myColor]);

  // ── Auto-save canvas (debounced 2s) ──────────────────────────────────────────
  const handleChange = useCallback((elements: readonly any[], appState: any) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await supabase
        .from("whiteboards")
        .update({
          elements,
          app_state: {
            viewBackgroundColor: appState.viewBackgroundColor,
            zoom: appState.zoom,
            scrollX: appState.scrollX,
            scrollY: appState.scrollY,
          },
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", board.id);

      channelRef.current?.send({
        type: "broadcast",
        event: "elements",
        payload: { userId: currentUser.id, elements },
      });

      setSaving(false);
      setLastSaved(new Date());
    }, 2000);
  }, [board.id, currentUser.id]);

  // ── Update client ────────────────────────────────────────────────────────────
  async function updateClient(newClientId: string) {
    setClientId(newClientId);
    await supabase
      .from("whiteboards")
      .update({ client_id: newClientId || null } as any)
      .eq("id", board.id);
  }

  // ── Add member ───────────────────────────────────────────────────────────────
  async function addMember(user: User) {
    if (members.find((m) => m.user_id === user.id)) return;
    await supabase.from("whiteboard_members").insert({ whiteboard_id: board.id, user_id: user.id });
    setMembers((prev) => [...prev, { user_id: user.id, user }]);
  }

  // ── Remove member ────────────────────────────────────────────────────────────
  async function removeMember(userId: string) {
    if (userId === currentUser.id) return; // can't remove yourself
    await supabase.from("whiteboard_members").delete()
      .eq("whiteboard_id", board.id)
      .eq("user_id", userId);
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }

  // ── Convert selection to task ────────────────────────────────────────────────
  function openTaskFromSelection() {
    if (!excalidrawAPI) return;
    const selected = excalidrawAPI.getSceneElements().filter((el: any) => el.isSelected);
    const text = selected.map((el: any) => el.text ?? el.originalText ?? "").filter(Boolean).join(" — ").slice(0, 100);
    setTaskForm({ title: text || "Nueva tarea desde pizarra", assigneeId: "", dueDate: "" });
    setShowTaskModal(true);
  }

  async function createTask() {
    if (!taskForm.title.trim()) return;
    setCreatingTask(true);
    const { data: proj } = await supabase.from("projects").select("id").limit(1).single();
    await supabase.from("tasks").insert({
      title: taskForm.title.trim(),
      assignee_id: taskForm.assigneeId || null,
      due_date: taskForm.dueDate || null,
      project_id: (proj as any)?.id ?? null,
      created_by: currentUser.id,
      priority: "medium",
    } as any);
    setCreatingTask(false);
    setShowTaskModal(false);
    setTaskForm({ title: "", assigneeId: "", dueDate: "" });
  }

  // Derived
  const collabList    = Array.from(collaborators.values());
  const currentClient = allClients.find((c) => c.id === clientId);
  const nonMembers    = allUsers.filter(
    (u) => !members.find((m) => m.user_id === u.id)
  ).filter((u) =>
    memberSearch === "" ||
    (u.full_name ?? u.email ?? "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center gap-2 px-4 shrink-0 z-10">
        {/* Back */}
        <a href="/pizarras"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </a>

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        {/* Board name */}
        <span className="text-sm font-semibold text-gray-800 truncate max-w-[180px]">{board.name}</span>

        {/* Client chip */}
        {currentClient ? (
          <button
            onClick={() => { setShowSettings(true); setShowCollabPanel(false); }}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-colors hover:opacity-80"
            style={{
              backgroundColor: (currentClient.color ?? "#6366f1") + "18",
              borderColor: (currentClient.color ?? "#6366f1") + "44",
              color: currentClient.color ?? "#6366f1",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: currentClient.color ?? "#6366f1" }} />
            {currentClient.name}
          </button>
        ) : (
          <button
            onClick={() => { setShowSettings(true); setShowCollabPanel(false); }}
            className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] text-gray-400 border border-dashed border-gray-300 hover:border-gray-400 hover:text-gray-600 transition-colors"
          >
            <Building2 className="w-3 h-3" /> Sin cliente
          </button>
        )}

        <div className="flex-1" />

        {/* Create task */}
        <button
          onClick={openTaskFromSelection}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-medium transition-colors border border-violet-200"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          Crear tarea
        </button>

        {/* Member avatars + online count */}
        <button
          onClick={() => { setShowCollabPanel((v) => !v); setShowSettings(false); }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="flex -space-x-1.5">
            <Avatar className="w-5 h-5 border-2 border-white">
              <AvatarImage src={currentUser.avatar_url ?? undefined} />
              <AvatarFallback className="text-[8px]" style={{ backgroundColor: myColor, color: "white" }}>
                {getInitials(currentUser.full_name)}
              </AvatarFallback>
            </Avatar>
            {collabList.slice(0, 3).map((c) => (
              <Avatar key={c.userId} className="w-5 h-5 border-2 border-white">
                <AvatarImage src={c.avatarUrl} />
                <AvatarFallback className="text-[8px]" style={{ backgroundColor: c.color, color: "white" }}>
                  {getInitials(c.name)}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>
          {collabList.length > 0 && (
            <span className="text-[10px] font-medium text-teal-600">{collabList.length + 1} en línea</span>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => { setShowSettings((v) => !v); setShowCollabPanel(false); }}
          className={cn(
            "p-1.5 rounded-lg transition-colors",
            showSettings ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          )}
          title="Configuración de pizarra"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Save status */}
        <div className="flex items-center gap-1 text-[10px] text-gray-400 w-20 justify-end">
          {saving ? (
            <><Loader2 className="w-3 h-3 animate-spin" /> Guardando…</>
          ) : lastSaved ? (
            <><Save className="w-3 h-3 text-green-500" /> Guardado</>
          ) : null}
        </div>
      </div>

      {/* ── Canvas + side panels ─────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden flex">

        {/* Canvas */}
        <div className="flex-1 relative">
          <Excalidraw
            excalidrawAPI={(api) => setExcalidrawAPI(api)}
            initialData={{
              elements: board.elements ?? [],
              appState: {
                ...(board.app_state ?? {}),
                collaborators: new Map(
                  collabList.map((c) => [c.userId, {
                    username: c.name,
                    color: { background: c.color, stroke: c.color },
                    cursor: c.pointer ? { x: c.pointer.x, y: c.pointer.y } : null,
                    avatarUrl: c.avatarUrl,
                  }])
                ),
              },
              scrollToContent: true,
            }}
            onChange={handleChange}
            onPointerUpdate={handlePointerUpdate}
            UIOptions={{
              canvasActions: {
                export: { saveFileToDisk: true },
                saveToActiveFile: false,
              },
            }}
            langCode="es-ES"
          />

          {/* Remote cursors overlay */}
          {collabList.filter((c) => c.pointer).map((c) => (
            <div
              key={c.userId}
              className="absolute pointer-events-none z-20 transition-all duration-75"
              style={{ left: c.pointer!.x, top: c.pointer!.y }}
            >
              <div className="w-3 h-3 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: c.color }} />
              <div className="mt-0.5 px-1.5 py-0.5 rounded-md text-white text-[9px] font-medium whitespace-nowrap shadow"
                style={{ backgroundColor: c.color }}>
                {c.name.split(" ")[0]}
              </div>
            </div>
          ))}
        </div>

        {/* ── Collaborators panel ─────────────────────────────────────────────── */}
        {showCollabPanel && (
          <div className="w-64 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> En línea ahora
              </span>
              <button onClick={() => setShowCollabPanel(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {/* Self */}
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl bg-teal-50">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={currentUser.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[10px]" style={{ backgroundColor: myColor, color: "white" }}>
                    {getInitials(currentUser.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{currentUser.full_name}</p>
                  <p className="text-[10px] text-teal-600">Tú · en línea</p>
                </div>
                <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
              </div>

              {collabList.map((c) => (
                <div key={c.userId} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarImage src={c.avatarUrl} />
                    <AvatarFallback className="text-[10px]" style={{ backgroundColor: c.color, color: "white" }}>
                      {getInitials(c.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400">en línea</p>
                  </div>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                </div>
              ))}

              {collabList.length === 0 && (
                <p className="text-[11px] text-gray-400 px-2 py-2">Solo tú estás aquí ahora</p>
              )}

              {/* All board members (may be offline) */}
              {members.length > 0 && (
                <>
                  <div className="pt-3 pb-1 px-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Miembros de la pizarra</span>
                  </div>
                  {members.map((m) => {
                    const online = m.user_id === currentUser.id || collaborators.has(m.user_id);
                    return (
                      <div key={m.user_id} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50">
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarImage src={m.user?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-violet-100 text-violet-600 text-[10px]">
                            {getInitials(m.user?.full_name ?? m.user?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {m.user?.full_name ?? m.user?.email}
                          </p>
                          <p className="text-[10px] text-gray-400">{online ? "en línea" : "sin conexión"}</p>
                        </div>
                        <span className={cn("w-2 h-2 rounded-full shrink-0", online ? "bg-teal-400" : "bg-gray-200")} />
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Settings panel ──────────────────────────────────────────────────── */}
        {showSettings && (
          <div className="w-72 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" /> Configuración
              </span>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">

              {/* Client selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Cliente
                </label>
                <select
                  value={clientId}
                  onChange={(e) => updateClient(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-800 bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition"
                >
                  <option value="">Sin cliente</option>
                  {allClients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Members manager */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Colaboradores ({members.length})
                  </label>
                  <button
                    onClick={() => setShowAddMember((v) => !v)}
                    className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 font-medium transition-colors"
                  >
                    <UserPlus className="w-3 h-3" /> Agregar
                  </button>
                </div>

                {/* Search + add */}
                {showAddMember && (
                  <div className="mb-3 space-y-1.5">
                    <input
                      autoFocus
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Buscar usuario…"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 transition"
                    />
                    <div className="max-h-36 overflow-y-auto space-y-0.5">
                      {nonMembers.length === 0 ? (
                        <p className="text-[11px] text-gray-400 px-2 py-1">No hay más usuarios</p>
                      ) : (
                        nonMembers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => addMember(u)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-violet-50 text-left transition-colors"
                          >
                            <Avatar className="w-6 h-6 shrink-0">
                              <AvatarImage src={u.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-violet-100 text-violet-600 text-[9px]">
                                {getInitials(u.full_name ?? u.email)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-gray-700 truncate">{u.full_name ?? u.email}</span>
                            <UserPlus className="w-3 h-3 text-violet-400 ml-auto shrink-0" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Current members */}
                <div className="space-y-1">
                  {members.map((m) => {
                    const isSelf = m.user_id === currentUser.id;
                    return (
                      <div
                        key={m.user_id}
                        className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-gray-50 group"
                      >
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarImage src={m.user?.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-violet-100 text-violet-600 text-[10px]">
                            {getInitials(m.user?.full_name ?? m.user?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">
                            {m.user?.full_name ?? m.user?.email}
                            {isSelf && <span className="ml-1 text-gray-400 font-normal">(tú)</span>}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">{m.user?.email}</p>
                        </div>
                        {!isSelf && (
                          <button
                            onClick={() => removeMember(m.user_id)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all shrink-0"
                            title="Quitar de la pizarra"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {members.length === 0 && (
                    <p className="text-[11px] text-gray-400 px-2">Sin colaboradores aún</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Crear tarea ───────────────────────────────────────────────── */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-violet-600" /> Nueva tarea desde pizarra
              </h3>
              <button onClick={() => setShowTaskModal(false)}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Título de la tarea</label>
                <input
                  type="text" autoFocus
                  value={taskForm.title}
                  onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition"
                  placeholder="Describe la tarea…"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Asignar a</label>
                <select
                  value={taskForm.assigneeId}
                  onChange={(e) => setTaskForm((f) => ({ ...f, assigneeId: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-violet-400 transition bg-white"
                >
                  <option value="">Sin asignar</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.full_name ?? u.email}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Fecha límite</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm((f) => ({ ...f, dueDate: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-violet-400 transition"
                />
              </div>
            </div>

            <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowTaskModal(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={createTask} disabled={!taskForm.title.trim() || creatingTask}
                className="flex-1 py-2 text-sm bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors disabled:opacity-40">
                {creatingTask ? "Creando…" : "Crear tarea"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
