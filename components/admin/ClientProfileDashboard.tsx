"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2, Mail, Phone, MapPin, Clock, Camera, Check,
  FileText, Palette, ListTodo, Target, LayoutDashboard,
  Pencil, X, Save, Plus, ArrowLeft, ChevronRight, ExternalLink,
  Link as LinkIcon, CheckCircle2, ChevronDown,
} from "lucide-react";
import { BrainPanel } from "@/components/brain/BrainPanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Client, Project } from "@/types/database";

interface Whiteboard { id: string; name: string; description?: string; updated_at: string; }

interface Props {
  client: Client;
  projects: Project[];
  initialAssigned: string[];
  whiteboards: Whiteboard[];
}

const COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#f97316", "#84cc16",
];

// ── Panel de texto editable ────────────────────────────────────────────────────
function TextPanel({
  icon, title, value, placeholder, onSave, accentColor = "#8b5cf6",
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  placeholder: string;
  onSave: (v: string) => Promise<void>;
  accentColor?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setEditing(false);
  }

  function cancel() { setDraft(value); setEditing(false); }

  return (
    <div className="bg-violet-50/60 rounded-2xl flex flex-col overflow-hidden border border-violet-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/70 border-b border-violet-100">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm shrink-0"
            style={{ backgroundColor: accentColor }}>
            {icon}
          </span>
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        {!editing ? (
          <button
            onClick={() => { setDraft(value); setEditing(true); }}
            className="p-1.5 rounded-lg hover:bg-violet-100 text-gray-400 hover:text-violet-600 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="flex gap-1">
            <button onClick={cancel}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
            <button onClick={save} disabled={saving}
              className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50">
              {saving ? <span className="w-3.5 h-3.5 block border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Check className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {editing ? (
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full min-h-[140px] bg-white border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 resize-none leading-relaxed transition"
          />
        ) : value ? (
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{value}</p>
        ) : (
          <button
            onClick={() => { setDraft(""); setEditing(true); }}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-violet-500 transition-colors"
          >
            <Plus className="w-4 h-4" /> Agregar {title.toLowerCase()}…
          </button>
        )}
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
// ── Brief Panel ───────────────────────────────────────────────────────────────
const BRIEF_SECTIONS = [
  { id: "empresa",      title: "Sobre tu empresa" },
  { id: "conceptos",    title: "Conceptos de marca" },
  { id: "competencia",  title: "Competencia" },
  { id: "audiencia",    title: "Audiencia" },
  { id: "comunicacion", title: "Comunicación" },
  { id: "emociones",    title: "Emociones y sensaciones" },
];

function BriefPanel({ clientId, briefToken, briefData }: {
  clientId: string; briefToken: string; briefData: Record<string, string> | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasData = briefData && Object.keys(briefData).length > 0;
  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://app.somosdex.com";
  const link = `${appUrl}/brief/${briefToken}`;

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filled = hasData ? Object.keys(briefData).length : 0;

  return (
    <div className="bg-violet-50/60 rounded-2xl flex flex-col overflow-hidden border border-violet-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/70 border-b border-violet-100">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm shrink-0 bg-indigo-500">
            <FileText className="w-3.5 h-3.5" />
          </span>
          <span className="text-sm font-semibold text-gray-800">Brief de la marca</span>
          {hasData && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" /> Completado · {filled} respuestas
            </span>
          )}
        </div>
        {hasData && (
          <button onClick={() => setOpen(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-violet-600 transition-colors">
            {open ? "Ocultar" : "Ver respuestas"}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Link para compartir */}
        <div>
          <p className="text-xs text-gray-500 mb-1.5">Link para el cliente</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-500 truncate font-mono">
              {link}
            </div>
            <button onClick={copy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${copied ? "bg-emerald-100 text-emerald-600" : "bg-violet-600 hover:bg-violet-700 text-white"}`}>
              {copied ? <><Check className="w-3.5 h-3.5" />Copiado</> : <><LinkIcon className="w-3.5 h-3.5" />Copiar link</>}
            </button>
            <a href={link} target="_blank" rel="noopener noreferrer"
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {!hasData && (
          <p className="text-xs text-gray-400 italic">El cliente aún no ha completado el brief.</p>
        )}

        {/* Respuestas */}
        {hasData && open && (
          <div className="space-y-4 pt-1">
            {BRIEF_SECTIONS.map((sec) => {
              const entries = Object.entries(briefData).filter(([k]) => {
                if (sec.id === "empresa")      return !k.startsWith("concepto") && !k.startsWith("competencia") && !k.startsWith("audiencia") && !k.startsWith("canal") && !k.startsWith("contenido") && !k.startsWith("mensaje") && !k.startsWith("tono") && !k.startsWith("emocion") && !k.startsWith("textura") && !k.startsWith("olor") && !k.startsWith("color_") && !k.startsWith("musica") && !k.startsWith("marca_admira") && !k.startsWith("marca_similar") && !k.startsWith("lider_mercado");
                if (sec.id === "conceptos")    return k.startsWith("concepto");
                if (sec.id === "competencia")  return k.startsWith("competencia") || k.startsWith("lider_mercado") || k.startsWith("marca_similar") || k.startsWith("marca_admira");
                if (sec.id === "audiencia")    return k.startsWith("audiencia") || k.startsWith("quien_compra") || k.startsWith("insight") || k.startsWith("lifestyle") || k.startsWith("awareness");
                if (sec.id === "comunicacion") return k.startsWith("canal") || k.startsWith("contenido") || k.startsWith("mensaje") || k.startsWith("tono") || k.startsWith("identidad");
                if (sec.id === "emociones")    return k.startsWith("emocion") || k.startsWith("textura") || k.startsWith("olor") || k.startsWith("color_") || k.startsWith("musica") || k.startsWith("sensacion");
                return false;
              }).filter(([, v]) => v?.trim());
              if (!entries.length) return null;
              return (
                <div key={sec.id}>
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{sec.title}</h4>
                  <div className="space-y-2">
                    {entries.map(([k, v]) => (
                      <div key={k} className="bg-white rounded-lg px-3 py-2 border border-gray-100">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-0.5">{k.replace(/_/g, " ")}</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function ClientProfileDashboard({ client: initialClient, projects, initialAssigned, whiteboards }: Props) {
  const supabase = createClient();
  const router   = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [client, setClient]       = useState(initialClient);
  const [assigned, setAssigned]   = useState<string[]>(initialAssigned);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Inline field editing
  const [editField, setEditField] = useState<string | null>(null);
  const [fieldDraft, setFieldDraft] = useState("");
  const [savingField, setSavingField] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  async function patchClient(patch: Partial<Client>) {
    const { error } = await supabase.from("clients").update(patch as any).eq("id", client.id);
    if (error) { toast.error("Error al guardar"); return false; }
    setClient((prev) => ({ ...prev, ...patch }));
    return true;
  }

  // ── Logo upload ──────────────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const ext  = file.name.split(".").pop();
    const path = `${client.id}.${ext}`;
    const { error } = await supabase.storage.from("client-logos").upload(path, file, { upsert: true });
    if (error) { toast.error("Error al subir logo"); setUploadingLogo(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("client-logos").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    await patchClient({ logo_url: url } as any);
    toast.success("Logo actualizado");
    setUploadingLogo(false);
  }

  // ── Inline field save ────────────────────────────────────────────────────────
  async function saveField(field: string, value: string) {
    setSavingField(true);
    const ok = await patchClient({ [field]: value || null } as any);
    if (ok) toast.success("Guardado");
    setSavingField(false);
    setEditField(null);
  }

  // ── Text panel save ──────────────────────────────────────────────────────────
  const makeSaver = useCallback((field: string) => async (val: string) => {
    const ok = await patchClient({ [field]: val || null } as any);
    if (ok) toast.success("Guardado");
  }, [client.id]);

  // ── Project toggle ───────────────────────────────────────────────────────────
  async function toggleProject(projectId: string) {
    if (assigned.includes(projectId)) {
      await supabase.from("client_projects").delete()
        .eq("client_id", client.id).eq("project_id", projectId);
      setAssigned((p) => p.filter((id) => id !== projectId));
    } else {
      await supabase.from("client_projects").insert({ client_id: client.id, project_id: projectId } as any);
      setAssigned((p) => [...p, projectId]);
    }
  }

  // ── Color save ───────────────────────────────────────────────────────────────
  async function saveColor(color: string) {
    await patchClient({ color } as any);
  }

  const isEditing = (f: string) => editField === f;

  function InlineField({ field, label, icon, placeholder, type = "text" }: {
    field: string; label: string; icon: React.ReactNode; placeholder?: string; type?: string;
  }) {
    const val = (client as any)[field] ?? "";
    return (
      <div className="group">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        {isEditing(field) ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              type={type}
              value={fieldDraft}
              onChange={(e) => setFieldDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveField(field, fieldDraft);
                if (e.key === "Escape") setEditField(null);
              }}
              className="flex-1 text-sm bg-white border border-violet-300 rounded-lg px-2 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400 transition"
            />
            <button onClick={() => saveField(field, fieldDraft)} disabled={savingField}
              className="p-1 rounded-md bg-violet-600 text-white hover:bg-violet-500 transition shrink-0">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={() => setEditField(null)}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition shrink-0">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditField(field); setFieldDraft(val); }}
            className="w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 hover:bg-violet-50 transition-colors group"
          >
            <span className="text-violet-400 shrink-0">{icon}</span>
            <span className={cn("text-sm flex-1 truncate", val ? "text-gray-800" : "text-gray-400 italic")}>
              {val || placeholder}
            </span>
            <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-[#f8f7ff]">

      {/* ── LEFT COLUMN ──────────────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 bg-white border-r border-gray-100 flex flex-col overflow-y-auto">

        {/* Back + header */}
        <div className="px-4 pt-4 pb-2">
          <Link href="/clientes"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Todos los clientes
          </Link>

          {/* Logo upload */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="relative group">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden border-4 border-white shadow-lg"
                style={{ background: client.logo_url ? "transparent" : `${client.color}22` }}
              >
                {client.logo_url ? (
                  <img src={client.logo_url} alt={client.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold" style={{ color: client.color }}>
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingLogo}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-md transition-colors"
              >
                {uploadingLogo
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-3.5 h-3.5" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>

            {/* Name editable */}
            {isEditing("name") ? (
              <div className="flex gap-1 w-full">
                <input
                  autoFocus
                  value={fieldDraft}
                  onChange={(e) => setFieldDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveField("name", fieldDraft); if (e.key === "Escape") setEditField(null); }}
                  className="flex-1 text-center text-base font-bold bg-white border border-violet-300 rounded-lg px-2 py-1 text-gray-900 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />
                <button onClick={() => saveField("name", fieldDraft)}
                  className="p-1.5 rounded-md bg-violet-600 text-white">
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditField("name"); setFieldDraft(client.name); }}
                className="group text-center"
              >
                <p className="text-lg font-bold text-gray-900 group-hover:text-violet-700 transition-colors">{client.name}</p>
                {client.company && <p className="text-xs text-gray-400 mt-0.5">{client.company}</p>}
              </button>
            )}

            {/* Color picker */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => saveColor(c)}
                  className={cn(
                    "w-5 h-5 rounded-full border-2 transition-all",
                    client.color === c ? "border-gray-700 scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mx-4 mb-3" />

        {/* Fields */}
        <div className="px-3 space-y-1 flex-1">
          <InlineField field="company"      label="Empresa"   icon={<Building2 className="w-3.5 h-3.5" />} placeholder="Nombre de la empresa" />
          <InlineField field="email"        label="Email"     icon={<Mail className="w-3.5 h-3.5" />}     placeholder="contacto@empresa.com" type="email" />
          <InlineField field="support_phone" label="Teléfono" icon={<Phone className="w-3.5 h-3.5" />}   placeholder="+58 412 000 0000" />
          <InlineField field="address"      label="Dirección" icon={<MapPin className="w-3.5 h-3.5" />}  placeholder="Ciudad, País" />
          <InlineField field="schedule"     label="Horario"   icon={<Clock className="w-3.5 h-3.5" />}   placeholder="Lun–Vie 8am–6pm" />
        </div>

        {/* Quick links */}
        <div className="px-4 py-4 space-y-1.5 border-t border-gray-100 mt-3">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Acceso rápido</p>
          <Link
            href={`/clientes/${client.id}/contenido`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-medium transition-colors"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Plan de contenido
            <ChevronRight className="w-3 h-3 ml-auto" />
          </Link>
        </div>
      </aside>

      {/* ── MAIN GRID ───────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">

            {/* Panel 1: Pizarras */}
            <div className="bg-violet-50/60 rounded-2xl flex flex-col overflow-hidden border border-violet-100 min-h-[220px]">
              <div className="flex items-center justify-between px-4 py-3 bg-white/70 border-b border-violet-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white shrink-0">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-sm font-semibold text-gray-800">Pizarras</span>
                </div>
                <Link
                  href="/pizarras"
                  className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" /> Nueva
                </Link>
              </div>
              <div className="flex-1 p-4">
                {whiteboards.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-2">
                      <LayoutDashboard className="w-5 h-5 text-violet-400" />
                    </div>
                    <p className="text-xs text-gray-400">Sin pizarras asignadas</p>
                    <Link href="/pizarras"
                      className="mt-2 text-[11px] text-violet-600 hover:underline">
                      Ir a pizarras →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {whiteboards.map((wb) => (
                      <Link
                        key={wb.id}
                        href={`/pizarras/${wb.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white hover:bg-violet-50 border border-violet-100 hover:border-violet-300 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center shrink-0">
                          <LayoutDashboard className="w-3.5 h-3.5 text-violet-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{wb.name}</p>
                          {wb.description && <p className="text-[10px] text-gray-400 truncate">{wb.description}</p>}
                        </div>
                        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-violet-500 transition-colors shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Panel 2: Brief */}
            <BriefPanel
              clientId={client.id}
              briefToken={client.brief_token ?? ""}
              briefData={client.brief_data ?? null}
            />
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">

            {/* Panel 3: Branding */}
            <TextPanel
              icon={<Palette className="w-3.5 h-3.5" />}
              title="Branding"
              value={client.visual_identity ?? ""}
              placeholder="Paleta de colores, tipografías, tono de voz, estilo visual…"
              onSave={makeSaver("visual_identity")}
              accentColor="#ec4899"
            />

            {/* Panel 4: Plan de acción */}
            <TextPanel
              icon={<ListTodo className="w-3.5 h-3.5" />}
              title="Plan de acción"
              value={client.action_plan ?? ""}
              placeholder="Estrategia, entregables, frecuencia de publicación, canales y responsables…"
              onSave={makeSaver("action_plan")}
              accentColor="#f59e0b"
            />
          </div>

          {/* Row 3: Objetivos — full width */}
          <TextPanel
            icon={<Target className="w-3.5 h-3.5" />}
            title="Objetivos de la marca"
            value={client.objective ?? ""}
            placeholder="¿Qué quiere lograr el cliente? Aumentar ventas, posicionar marca, generar comunidad…"
            onSave={makeSaver("objective")}
            accentColor="#10b981"
          />

          {/* Row 4: Brand Brain — full width */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 min-h-[320px]">
            <BrainPanel
              brainType="brand"
              brandId={client.id}
              title={`${client.name} Brain`}
              accentClass="bg-indigo-500"
            />
          </div>
        </div>
      </main>

      {/* ── RIGHT PANEL: Proyectos ───────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
        <div className="px-4 py-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-md bg-violet-100 flex items-center justify-center">
              <Building2 className="w-3 h-3 text-violet-600" />
            </span>
            Proyectos
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 ml-6.5">Asignar este cliente</p>
        </div>

        <div className="flex-1 p-3 space-y-1.5">
          {projects.map((p) => {
            const on = assigned.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleProject(p.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all",
                  on
                    ? "border-current bg-opacity-10"
                    : "border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50"
                )}
                style={on ? { backgroundColor: p.color + "18", borderColor: p.color + "55" } : {}}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <span className={cn("flex-1 text-xs truncate", on ? "font-semibold text-gray-900" : "text-gray-500")}>
                  {p.name}
                </span>
                {on && (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: p.color }}>
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </button>
            );
          })}
          {projects.length === 0 && (
            <p className="text-xs text-gray-400 italic px-2">No hay proyectos aún</p>
          )}
        </div>
      </aside>
    </div>
  );
}
