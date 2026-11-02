"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  User, Phone, MapPin, CreditCard, Calendar, FileText, BookOpen,
  CheckCircle2, Clock, AlertCircle, Plus, Trash2, ExternalLink,
  Shield, Briefcase, TrendingUp, ClipboardList, GraduationCap,
  Save, Edit2, X,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, getInitials, formatDate } from "@/lib/utils";
import Link from "next/link";

const CONTRACT_OPTIONS = [
  { value: "tiempo_completo", label: "Tiempo completo" },
  { value: "medio_tiempo", label: "Medio tiempo" },
  { value: "freelance", label: "Freelance" },
  { value: "pasante", label: "Pasante" },
  { value: "consultor", label: "Consultor" },
];

const AFP_OPTIONS = ["AFP Siembra", "AFP Popular", "AFP Reservas", "AFP Crecer", "AFP Scotia", "Otro"];
const ARS_OPTIONS = ["ARS Senasa", "ARS Humano", "ARS Universal", "ARS Meta Salud", "ARS Simag", "Otro"];
const BANK_OPTIONS = ["Banco Popular", "Banco Reservas", "Banco BHD", "Scotiabank", "Banco Santa Cruz", "Banco Lafise", "Otro"];

const TRAINING_STATUS: Record<string, { label: string; color: string }> = {
  pendiente:   { label: "Pendiente",   color: "bg-gray-100 text-gray-600" },
  en_progreso: { label: "En progreso", color: "bg-blue-100 text-blue-700" },
  completado:  { label: "Completado",  color: "bg-emerald-100 text-emerald-700" },
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-600",
  high:   "bg-orange-100 text-orange-600",
  medium: "bg-blue-100 text-blue-700",
  low:    "bg-gray-100 text-gray-500",
};

type Tab = "info" | "contactos" | "metricas" | "tareas" | "entrenamientos";

interface Props {
  user: any;
  profile: any;
  contacts: any[];
  trainings: any[];
  tasks: any[];
  metrics: { total: number; completed: number; overdue: number; inProgress: number; completionRate: number };
}

export function FichaClient({ user, profile: initialProfile, contacts: initialContacts, trainings: initialTrainings, tasks, metrics }: Props) {
  const [tab, setTab] = useState<Tab>("info");
  const [profile, setProfile] = useState<any>(initialProfile ?? {});
  const [contacts, setContacts] = useState(initialContacts);
  const [trainings, setTrainings] = useState(initialTrainings);
  const [editingProfile, setEditingProfile] = useState(!initialProfile);
  const [savingProfile, setSavingProfile] = useState(false);

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", relationship: "", phone: "", email: "" });

  // Training form
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [trainingForm, setTrainingForm] = useState({ title: "", description: "", url: "", due_date: "" });

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/rrhh/${user.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error();
      toast.success("Ficha guardada");
      setEditingProfile(false);
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSavingProfile(false);
    }
  }

  async function addContact() {
    if (!contactForm.name.trim()) return;
    const res = await fetch(`/api/rrhh/${user.id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });
    if (res.ok) {
      const data = await res.json();
      setContacts((p) => [...p, data]);
      setContactForm({ name: "", relationship: "", phone: "", email: "" });
      setShowContactForm(false);
      toast.success("Contacto agregado");
    }
  }

  async function deleteContact(id: string) {
    await fetch(`/api/rrhh/${user.id}/contacts/${id}`, { method: "DELETE" });
    setContacts((p) => p.filter((c) => c.id !== id));
    toast.success("Contacto eliminado");
  }

  async function addTraining() {
    if (!trainingForm.title.trim()) return;
    const res = await fetch(`/api/rrhh/${user.id}/trainings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trainingForm),
    });
    if (res.ok) {
      const data = await res.json();
      setTrainings((p) => [data, ...p]);
      setTrainingForm({ title: "", description: "", url: "", due_date: "" });
      setShowTrainingForm(false);
      toast.success("Entrenamiento asignado");
    }
  }

  async function updateTrainingStatus(id: string, status: string) {
    await fetch(`/api/rrhh/${user.id}/trainings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setTrainings((p) => p.map((t) => t.id === id ? { ...t, status } : t));
  }

  async function deleteTraining(id: string) {
    await fetch(`/api/rrhh/${user.id}/trainings/${id}`, { method: "DELETE" });
    setTrainings((p) => p.filter((t) => t.id !== id));
    toast.success("Entrenamiento eliminado");
  }

  const roleLabel = user.role === "admin" ? "Admin" : user.role === "project_manager" ? "Project Manager" : "Colaborador";

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "info",           label: "Información",     icon: <User className="w-3.5 h-3.5" /> },
    { id: "contactos",      label: "Contactos",        icon: <Phone className="w-3.5 h-3.5" /> },
    { id: "metricas",       label: "Métricas",         icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: "tareas",         label: `Tareas (${tasks.length})`, icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: "entrenamientos", label: `Entrenamientos (${trainings.length})`, icon: <GraduationCap className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Employee header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 shrink-0">
            <AvatarImage src={user.avatar_url ?? undefined} />
            <AvatarFallback className="text-xl bg-violet-100 text-violet-600 font-semibold">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{user.full_name ?? "Sin nombre"}</h2>
            <p className="text-sm text-gray-500">{user.job_title ?? "Sin cargo"} · {user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">{roleLabel}</span>
              {profile?.contract_type && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {CONTRACT_OPTIONS.find((c) => c.value === profile.contract_type)?.label ?? profile.contract_type}
                </span>
              )}
              {profile?.start_date && (
                <span className="text-xs text-gray-400">
                  Desde {new Date(profile.start_date).toLocaleDateString("es-DO", { month: "long", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
          {profile?.salary && (
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400 mb-0.5">Sueldo mensual</p>
              <p className="text-xl font-bold text-gray-800">
                {profile.salary_currency === "USD" ? "$" : "RD$"}
                {Number(profile.salary).toLocaleString("es-DO")}
              </p>
              <p className="text-xs text-gray-400">{profile.salary_currency}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors",
                tab === t.id
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">

        {/* ── INFO ── */}
        {tab === "info" && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Datos del colaborador</h3>
              {!editingProfile ? (
                <Button size="sm" variant="outline" onClick={() => setEditingProfile(true)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveProfile} disabled={savingProfile}
                    className="bg-violet-600 hover:bg-violet-700 text-white">
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {savingProfile ? "Guardando..." : "Guardar"}
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Datos personales */}
              <Section title="Datos personales" icon={<User className="w-3.5 h-3.5" />}>
                <Field label="Cédula" editing={editingProfile}
                  value={profile.cedula} displayValue={profile.cedula}
                  onChange={(v) => setProfile((p: any) => ({ ...p, cedula: v }))} />
                <Field label="Teléfono" editing={editingProfile}
                  value={profile.phone} displayValue={profile.phone}
                  onChange={(v) => setProfile((p: any) => ({ ...p, phone: v }))} />
                <Field label="Dirección" editing={editingProfile}
                  value={profile.address} displayValue={profile.address}
                  onChange={(v) => setProfile((p: any) => ({ ...p, address: v }))} />
                <Field label="Fecha de nacimiento" editing={editingProfile} type="date"
                  value={profile.birth_date?.split("T")[0] ?? ""}
                  displayValue={profile.birth_date ? new Date(profile.birth_date).toLocaleDateString("es-DO") : undefined}
                  onChange={(v) => setProfile((p: any) => ({ ...p, birth_date: v }))} />
              </Section>

              {/* Contrato */}
              <Section title="Contrato" icon={<FileText className="w-3.5 h-3.5" />}>
                {editingProfile ? (
                  <div className="space-y-3">
                    <SelectField label="Tipo de contrato" value={profile.contract_type ?? "tiempo_completo"}
                      options={CONTRACT_OPTIONS}
                      onChange={(v) => setProfile((p: any) => ({ ...p, contract_type: v }))} />
                    <Field label="Fecha de ingreso" type="date" editing
                      value={profile.start_date?.split("T")[0] ?? ""}
                      onChange={(v) => setProfile((p: any) => ({ ...p, start_date: v }))} />
                    <Field label="Fecha de salida" type="date" editing
                      value={profile.end_date?.split("T")[0] ?? ""}
                      onChange={(v) => setProfile((p: any) => ({ ...p, end_date: v }))} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <InfoRow label="Tipo" value={CONTRACT_OPTIONS.find((c) => c.value === profile.contract_type)?.label ?? "—"} />
                    <InfoRow label="Ingreso" value={profile.start_date ? new Date(profile.start_date).toLocaleDateString("es-DO") : "—"} />
                    {profile.end_date && <InfoRow label="Salida" value={new Date(profile.end_date).toLocaleDateString("es-DO")} />}
                  </div>
                )}
              </Section>

              {/* Sueldo */}
              <Section title="Compensación" icon={<CreditCard className="w-3.5 h-3.5" />}>
                {editingProfile ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Sueldo mensual</label>
                        <input
                          type="number"
                          value={profile.salary ?? ""}
                          onChange={(e) => setProfile((p: any) => ({ ...p, salary: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300"
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Moneda</label>
                        <select
                          value={profile.salary_currency ?? "DOP"}
                          onChange={(e) => setProfile((p: any) => ({ ...p, salary_currency: e.target.value }))}
                          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300"
                        >
                          <option value="DOP">DOP</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                    <SelectField label="Banco" value={profile.bank_name ?? ""}
                      options={BANK_OPTIONS.map((b) => ({ value: b, label: b }))}
                      onChange={(v) => setProfile((p: any) => ({ ...p, bank_name: v }))} />
                    <Field label="Número de cuenta" editing
                      value={profile.bank_account ?? ""}
                      onChange={(v) => setProfile((p: any) => ({ ...p, bank_account: v }))} />
                    <SelectField label="Tipo de cuenta" value={profile.bank_account_type ?? "ahorro"}
                      options={[{value:"ahorro",label:"Ahorros"},{value:"corriente",label:"Corriente"}]}
                      onChange={(v) => setProfile((p: any) => ({ ...p, bank_account_type: v }))} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <InfoRow label="Sueldo" value={profile.salary ? `${profile.salary_currency === "USD" ? "$" : "RD$"}${Number(profile.salary).toLocaleString("es-DO")} ${profile.salary_currency ?? "DOP"}` : "—"} highlight />
                    <InfoRow label="Banco" value={profile.bank_name ?? "—"} />
                    <InfoRow label="Cuenta" value={profile.bank_account ? `•••• ${profile.bank_account.slice(-4)}` : "—"} />
                    <InfoRow label="Tipo" value={profile.bank_account_type === "corriente" ? "Corriente" : "Ahorros"} />
                  </div>
                )}
              </Section>

              {/* TSS / AFP / ARS */}
              <Section title="Seguridad Social" icon={<Shield className="w-3.5 h-3.5" />}>
                {editingProfile ? (
                  <div className="space-y-3">
                    <Field label="Número TSS" editing
                      value={profile.tss_number ?? ""}
                      onChange={(v) => setProfile((p: any) => ({ ...p, tss_number: v }))} />
                    <SelectField label="AFP" value={profile.afp_name ?? ""}
                      options={AFP_OPTIONS.map((a) => ({ value: a, label: a }))}
                      onChange={(v) => setProfile((p: any) => ({ ...p, afp_name: v }))} />
                    <Field label="Cuenta AFP" editing
                      value={profile.afp_account ?? ""}
                      onChange={(v) => setProfile((p: any) => ({ ...p, afp_account: v }))} />
                    <SelectField label="ARS (Seguro médico)" value={profile.ars_name ?? ""}
                      options={ARS_OPTIONS.map((a) => ({ value: a, label: a }))}
                      onChange={(v) => setProfile((p: any) => ({ ...p, ars_name: v }))} />
                    <Field label="Número ARS" editing
                      value={profile.ars_account ?? ""}
                      onChange={(v) => setProfile((p: any) => ({ ...p, ars_account: v }))} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <InfoRow label="TSS" value={profile.tss_number ?? "—"} />
                    <InfoRow label="AFP" value={profile.afp_name ? `${profile.afp_name}${profile.afp_account ? ` · ${profile.afp_account}` : ""}` : "—"} />
                    <InfoRow label="ARS" value={profile.ars_name ? `${profile.ars_name}${profile.ars_account ? ` · ${profile.ars_account}` : ""}` : "—"} />
                  </div>
                )}
              </Section>
            </div>

            {/* Notas */}
            <div className="mt-6">
              <Section title="Notas internas" icon={<FileText className="w-3.5 h-3.5" />}>
                {editingProfile ? (
                  <textarea
                    rows={3}
                    value={profile.notes ?? ""}
                    onChange={(e) => setProfile((p: any) => ({ ...p, notes: e.target.value }))}
                    placeholder="Observaciones, acuerdos, información relevante..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300 resize-none"
                  />
                ) : (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.notes || <span className="text-gray-300">Sin notas</span>}</p>
                )}
              </Section>
            </div>
          </div>
        )}

        {/* ── CONTACTOS ── */}
        {tab === "contactos" && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Contactos de emergencia</h3>
              <Button size="sm" onClick={() => setShowContactForm(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar
              </Button>
            </div>

            {showContactForm && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-medium text-violet-800 mb-3">Nuevo contacto</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Nombre *</label>
                    <input value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300" placeholder="María García" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Parentesco</label>
                    <input value={contactForm.relationship} onChange={(e) => setContactForm((p) => ({ ...p, relationship: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300" placeholder="Esposa, madre, hermano..." />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Teléfono</label>
                    <input value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300" placeholder="809-000-0000" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Email</label>
                    <input value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300" placeholder="correo@email.com" />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setShowContactForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={addContact} className="bg-violet-600 hover:bg-violet-700 text-white">Guardar</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {contacts.map((c) => (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                      {c.relationship && (
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">{c.relationship}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                      {c.email && <span>{c.email}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteContact(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {contacts.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">
                  <Phone className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  No hay contactos de emergencia registrados
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MÉTRICAS ── */}
        {tab === "metricas" && (
          <div className="max-w-3xl">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Desempeño y métricas</h3>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <KPICard label="Total tareas" value={String(metrics.total)} icon={<ClipboardList className="w-4 h-4 text-gray-400" />} />
              <KPICard label="Completadas" value={String(metrics.completed)} icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} color="text-emerald-600" />
              <KPICard label="En progreso" value={String(metrics.inProgress)} icon={<Clock className="w-4 h-4 text-blue-500" />} color="text-blue-600" />
              <KPICard label="Vencidas" value={String(metrics.overdue)} icon={<AlertCircle className="w-4 h-4 text-red-400" />} color="text-red-500" />
            </div>

            {/* Completion rate */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Tasa de completitud</span>
                <span className={cn("text-2xl font-bold",
                  metrics.completionRate >= 70 ? "text-emerald-600" :
                  metrics.completionRate >= 40 ? "text-amber-600" : "text-red-500"
                )}>
                  {metrics.completionRate}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div
                  className={cn("h-3 rounded-full transition-all",
                    metrics.completionRate >= 70 ? "bg-emerald-500" :
                    metrics.completionRate >= 40 ? "bg-amber-500" : "bg-red-400"
                  )}
                  style={{ width: `${metrics.completionRate}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                <span>0%</span>
                <span className={cn("font-medium",
                  metrics.completionRate >= 70 ? "text-emerald-600" :
                  metrics.completionRate >= 40 ? "text-amber-500" : "text-red-400"
                )}>
                  {metrics.completionRate >= 70 ? "Excelente desempeño" :
                   metrics.completionRate >= 40 ? "Desempeño regular" : "Requiere atención"}
                </span>
                <span>100%</span>
              </div>
            </div>

            {/* Level */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h4 className="text-sm font-medium text-gray-700 mb-4">Nivel de desempeño</h4>
              <div className="flex items-center gap-3">
                {[
                  { label: "Crítico", range: "0–39%", color: "bg-red-400", active: metrics.completionRate < 40 },
                  { label: "Regular", range: "40–69%", color: "bg-amber-400", active: metrics.completionRate >= 40 && metrics.completionRate < 70 },
                  { label: "Bueno",   range: "70–89%", color: "bg-blue-500", active: metrics.completionRate >= 70 && metrics.completionRate < 90 },
                  { label: "Excelente", range: "90–100%", color: "bg-emerald-500", active: metrics.completionRate >= 90 },
                ].map((level) => (
                  <div key={level.label} className={cn("flex-1 rounded-xl p-3 border-2 transition-all",
                    level.active ? "border-gray-800 shadow-sm" : "border-transparent opacity-40"
                  )}>
                    <div className={cn("w-3 h-3 rounded-full mb-2", level.color)} />
                    <p className="text-xs font-semibold text-gray-700">{level.label}</p>
                    <p className="text-[10px] text-gray-400">{level.range}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAREAS ── */}
        {tab === "tareas" && (
          <div className="max-w-3xl">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Tareas asignadas ({tasks.length})</h3>
            <div className="space-y-2">
              {tasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tareas/${t.id}`}
                  className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:border-violet-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate group-hover:text-violet-700 transition-colors">{t.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {t.client?.name && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.client.color }} />
                          {t.client.name}
                        </span>
                      )}
                      {t.project?.name && <span className="text-xs text-gray-400">· {t.project.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.status?.name && (
                      <span className="flex items-center gap-1.5 text-xs text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.status.color }} />
                        {t.status.name}
                      </span>
                    )}
                    {t.priority && (
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", PRIORITY_COLORS[t.priority])}>
                        {t.priority === "urgent" ? "Urgente" : t.priority === "high" ? "Alta" : t.priority === "medium" ? "Media" : "Baja"}
                      </span>
                    )}
                    {t.due_date && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(t.due_date)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  Sin tareas asignadas
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ENTRENAMIENTOS ── */}
        {tab === "entrenamientos" && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">Plan de entrenamientos</h3>
              <Button size="sm" onClick={() => setShowTrainingForm(true)} className="bg-violet-600 hover:bg-violet-700 text-white">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Asignar
              </Button>
            </div>

            {showTrainingForm && (
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-medium text-violet-800 mb-3">Nuevo entrenamiento</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Título *</label>
                    <input value={trainingForm.title} onChange={(e) => setTrainingForm((p) => ({ ...p, title: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300" placeholder="Curso de diseño UX..." />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Descripción</label>
                    <textarea rows={2} value={trainingForm.description} onChange={(e) => setTrainingForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300 resize-none" placeholder="Objetivo del entrenamiento..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">URL / Enlace</label>
                      <input value={trainingForm.url} onChange={(e) => setTrainingForm((p) => ({ ...p, url: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300" placeholder="https://..." />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wide block mb-1">Fecha límite</label>
                      <input type="date" value={trainingForm.due_date} onChange={(e) => setTrainingForm((p) => ({ ...p, due_date: e.target.value }))}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300 [color-scheme:light]" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-3">
                  <Button size="sm" variant="outline" onClick={() => setShowTrainingForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={addTraining} className="bg-violet-600 hover:bg-violet-700 text-white">Asignar</Button>
                </div>
              </div>
            )}

            {/* Stats */}
            {trainings.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {["pendiente","en_progreso","completado"].map((s) => {
                  const count = trainings.filter((t) => t.status === s).length;
                  const cfg = TRAINING_STATUS[s];
                  return (
                    <div key={s} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                      <p className="text-xl font-bold text-gray-800">{count}</p>
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", cfg.color)}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="space-y-3">
              {trainings.map((t) => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", TRAINING_STATUS[t.status]?.color ?? "bg-gray-100 text-gray-600")}>
                          {TRAINING_STATUS[t.status]?.label ?? t.status}
                        </span>
                        {t.due_date && (
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(t.due_date)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{t.title}</p>
                      {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                      {t.url && (
                        <a href={t.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 mt-1.5">
                          <ExternalLink className="w-3 h-3" /> Ver recurso
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <select
                        value={t.status}
                        onChange={(e) => updateTrainingStatus(t.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-violet-300"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_progreso">En progreso</option>
                        <option value="completado">Completado</option>
                      </select>
                      <button onClick={() => deleteTraining(t.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {trainings.length === 0 && (
                <div className="text-center py-16 text-gray-400 text-sm">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  Sin entrenamientos asignados
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-gray-400">{icon}</span>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={cn("text-xs font-medium", highlight ? "text-gray-900 text-sm font-bold" : "text-gray-700")}>{value}</span>
    </div>
  );
}

function Field({
  label, value, editing, type = "text", displayValue, onChange,
}: {
  label: string; value?: string; editing: boolean; type?: string;
  displayValue?: string; onChange: (v: string) => void;
}) {
  if (!editing) {
    return <InfoRow label={label} value={displayValue ?? value ?? "—"} />;
  }
  return (
    <div>
      <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300 [color-scheme:light]"
      />
    </div>
  );
}

function SelectField({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300"
      >
        <option value="">— Seleccionar —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function KPICard({ label, value, icon, color = "text-gray-800" }: { label: string; value: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">{icon}<span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span></div>
      <p className={cn("text-2xl font-bold", color)}>{value}</p>
    </div>
  );
}
