"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Send, CheckCircle2, Loader2, ChevronDown, ChevronRight } from "lucide-react";

// ─── Estructura del formulario (del HTML del cliente) ──────────────────────
const STEPS = [
  {
    id: "empresa", label: "Empresa", color: "#2B6CB0",
    title: "Datos de la empresa",
    sub: "Información básica del negocio",
    fields: [
      { id: "nombre_empresa",   label: "Nombre de la empresa",                           type: "text",     req: true,  hint: "Nombre comercial exacto como aparece en sus comunicaciones" },
      { id: "nombre_legal",     label: "Nombre legal o razón social",                    type: "text",     req: false },
      { id: "sector",           label: "Sector o industria",                             type: "select",   req: true,  options: ["Inmobiliario","Salud / Clínicas","Educación","Retail / Comercio","Restaurantes / Gastronomía","Turismo / Hotelería","Servicios profesionales","Construcción","Tecnología","Otro"] },
      { id: "sector_otro",      label: "Si seleccionaste Otro, especifica",              type: "text",     req: false },
      { id: "anos_mercado",     label: "¿Cuántos años lleva en el mercado?",             type: "select",   req: false, options: ["Menos de 1 año","1 a 3 años","3 a 5 años","5 a 10 años","Más de 10 años"] },
      { id: "ubicacion",        label: "Ubicación principal",                            type: "text",     req: true,  hint: "Ciudad y país donde opera principalmente" },
      { id: "otras_ubicaciones",label: "¿Opera en otras ciudades o países?",            type: "text",     req: false },
      { id: "web",              label: "Sitio web",                                      type: "url",      req: false },
      { id: "descripcion",      label: "¿A qué se dedica la empresa en una sola oración?", type: "textarea", req: true, hint: "Ejemplo: Vendemos terrenos y proyectos residenciales en zonas naturales del norte del país" },
    ],
  },
  {
    id: "contacto", label: "Contacto", color: "#6366f1",
    title: "Contactos del cliente",
    sub: "¿Con quién vamos a trabajar directamente?",
    fields: [
      { id: "c1_nombre",        label: "Nombre del contacto principal",                  type: "text",     req: true },
      { id: "c1_cargo",         label: "Cargo o rol",                                   type: "text",     req: true },
      { id: "c1_email",         label: "Correo electrónico",                            type: "email",    req: true },
      { id: "c1_tel",           label: "Teléfono o WhatsApp",                           type: "tel",      req: true },
      { id: "c1_canal",         label: "Canal preferido de comunicación",               type: "select",   req: true,  options: ["WhatsApp","Email","Llamada","Google Meet / Zoom","Otro"] },
      { id: "c2_existe",        label: "¿Hay un segundo contacto o responsable de aprobación?", type: "radio", req: false, options: ["Sí","No"] },
      { id: "c2_nombre",        label: "Nombre del segundo contacto",                   type: "text",     req: false },
      { id: "c2_cargo",         label: "Cargo del segundo contacto",                    type: "text",     req: false },
      { id: "c2_email",         label: "Correo del segundo contacto",                   type: "email",    req: false },
      { id: "aprobacion",       label: "¿Quién aprueba el contenido antes de publicar?", type: "radio",   req: true,  options: ["El contacto principal","El segundo contacto","Ambos deben aprobar","Solo necesitamos aviso previo, no aprobación formal"] },
      { id: "plazo_aprobacion", label: "¿En cuánto tiempo espera dar su aprobación?",  type: "select",   req: false, options: ["Menos de 24 horas","24 a 48 horas","Hasta 3 días","Según disponibilidad"] },
    ],
  },
  {
    id: "marca", label: "Marca", color: "#8b5cf6",
    title: "Identidad de marca",
    sub: "Cómo se ve, cómo suena y cómo quiere ser percibida",
    fields: [
      { id: "mision",           label: "¿Cuál es la misión de la empresa?",             type: "textarea", req: false, hint: "Si no tienen una definida, describir con sus propias palabras" },
      { id: "diferencial",      label: "¿Qué hace diferente a esta empresa de sus competidores?", type: "textarea", req: true },
      { id: "tono",             label: "Tono de comunicación de la marca",              type: "checkboxes", req: true, options: ["Profesional y serio","Cálido y cercano","Dinámico y energético","Inspiracional","Técnico y especializado","Humorístico / Informal","Aspiracional / Premium","Educativo"] },
      { id: "tono_desc",        label: "Describe cómo habla la marca en 2–3 líneas",   type: "textarea", req: false, hint: "Ejemplo: Habla como un experto que explica las cosas sin complicarlas." },
      { id: "marca_nunca",      label: "¿Qué cosas nunca diría ni haría esta marca?",  type: "textarea", req: true,  hint: "Ejemplo: Nunca haría humor sobre temas políticos." },
      { id: "marcas_ref",       label: "¿Qué marcas o cuentas admiran o quisieran parecerse?", type: "text", req: false },
      { id: "colores_tipografia", label: "¿Tienen manual de marca, paleta de colores o tipografías?", type: "radio", req: true, options: ["Sí, tenemos brandbook completo","Tenemos logo y colores básicos","Solo tenemos el logo","No tenemos nada definido aún"] },
    ],
  },
  {
    id: "audiencia", label: "Audiencia", color: "#10b981",
    title: "Cliente objetivo",
    sub: "A quién le habla la marca y qué le importa",
    fields: [
      { id: "edad_rango",       label: "Rango de edad del cliente ideal",               type: "select",   req: true,  options: ["18 a 25 años","25 a 35 años","35 a 45 años","45 a 55 años","55 años en adelante","Amplio (varias franjas de edad)"] },
      { id: "genero",           label: "Género predominante del cliente",               type: "radio",    req: false, options: ["Mayormente masculino","Mayormente femenino","Equitativo","Sin diferencia relevante"] },
      { id: "nivel_socio",      label: "Nivel socioeconómico",                         type: "radio",    req: false, options: ["Bajo","Medio","Medio-alto","Alto / Premium"] },
      { id: "ubicacion_cliente",label: "¿Dónde viven sus clientes?",                   type: "text",     req: true,  hint: "Ciudad, país, región — lo más específico posible" },
      { id: "dolor_cliente",    label: "¿Cuál es el problema principal que el cliente tiene antes de llegar a ustedes?", type: "textarea", req: true },
      { id: "motivacion",       label: "¿Qué lo motiva a tomar la decisión de compra?", type: "textarea", req: true },
      { id: "objeciones",       label: "¿Cuáles son las objeciones más comunes antes de comprar?", type: "textarea", req: false },
      { id: "canales_cliente",  label: "¿Por qué canales llegan actualmente la mayoría de sus clientes?", type: "checkboxes", req: false, options: ["Instagram","Facebook","TikTok","Google / Búsqueda orgánica","Google Ads / Meta Ads","Referidos / boca a boca","WhatsApp","Email","Llamada directa","Eventos / ferias","Otro"] },
    ],
  },
  {
    id: "competencia", label: "Competencia", color: "#ef4444",
    title: "Mercado y competencia",
    sub: "Quién más juega en este espacio",
    fields: [
      { id: "comp1",            label: "Competidor principal #1",                       type: "text",     req: false, hint: "Nombre + link a sus redes si lo tiene" },
      { id: "comp2",            label: "Competidor principal #2",                       type: "text",     req: false },
      { id: "comp3",            label: "Competidor principal #3",                       type: "text",     req: false },
      { id: "comp_diferencia",  label: "¿En qué se diferencia su empresa de esos competidores?", type: "textarea", req: true },
      { id: "comp_admira",      label: "¿Hay algo de la competencia que admiren o quisieran replicar?", type: "textarea", req: false },
      { id: "posicionamiento",  label: "¿Cómo quieren que el mercado los recuerde en 3 años?", type: "textarea", req: false },
    ],
  },
  {
    id: "redes", label: "Redes", color: "#f59e0b",
    title: "Redes sociales y plataformas",
    sub: "Dónde están y qué está pasando ahora mismo",
    fields: [
      { id: "plataformas",      label: "¿En qué plataformas tienen presencia activa?",  type: "checkboxes", req: true, options: ["Instagram","Facebook","TikTok","LinkedIn","YouTube","X / Twitter","Pinterest","Otro"] },
      { id: "ig_usuario",       label: "Usuario de Instagram",                          type: "text",     req: false },
      { id: "fb_usuario",       label: "Página de Facebook",                            type: "text",     req: false },
      { id: "tiktok_usuario",   label: "Usuario de TikTok",                            type: "text",     req: false },
      { id: "li_usuario",       label: "Perfil de LinkedIn",                            type: "text",     req: false },
      { id: "estado_redes",     label: "¿Cómo describirías el estado actual de sus redes?", type: "radio", req: true, options: ["Activas y con buen contenido","Activas pero sin estrategia","Inactivas hace tiempo","Recién creadas o por crear"] },
      { id: "contenido_actual", label: "¿Quién produce el contenido actualmente?",     type: "radio",    req: false, options: ["El mismo dueño o equipo interno","Otra agencia o freelancer","Nadie — está inactivo","Nunca han tenido contenido"] },
      { id: "tiene_foto_video", label: "¿Tienen banco de fotos y videos propios?",     type: "radio",    req: true,  options: ["Sí, tenemos bastante material","Tenemos algo pero es poco","No tenemos casi nada","No tenemos nada"] },
      { id: "accesos_listos",   label: "¿Pueden dar acceso de administrador a sus cuentas?", type: "radio", req: true, options: ["Sí, sin problema","Sí, pero tengo que pedirlo internamente","No lo tenemos nosotros / está con otra persona"] },
    ],
  },
  {
    id: "objetivos", label: "Objetivos", color: "#0ea5e9",
    title: "Objetivos y resultados esperados",
    sub: "Qué quiere lograr y cómo medir el éxito",
    fields: [
      { id: "objetivo_principal", label: "¿Cuál es el objetivo principal de contratar este servicio?", type: "radio", req: true, options: ["Generar más ventas / prospectos","Aumentar el reconocimiento de la marca","Construir comunidad y seguidores","Posicionarse como referente del sector","Reactivar una marca inactiva","Otro"] },
      { id: "objetivo_otro",    label: "Si seleccionaste Otro, explica",                type: "text",     req: false },
      { id: "meta_concreta",    label: "¿Tienen una meta concreta en mente?",           type: "textarea", req: false, hint: "Ejemplo: Quiero generar 20 prospectos al mes." },
      { id: "kpi_cliente",      label: "¿Qué número o resultado les dirá que el servicio está funcionando?", type: "textarea", req: true },
      { id: "plazo_resultados", label: "¿En cuánto tiempo esperan ver resultados?",    type: "radio",    req: true,  options: ["1 mes","2 a 3 meses","3 a 6 meses","Más de 6 meses","No tienen expectativa de tiempo definida"] },
      { id: "presupuesto_pauta",label: "¿Tienen presupuesto para pauta publicitaria?", type: "radio",    req: true,  options: ["Sí, ya lo tenemos definido","Sí, pero no sé cuánto","No, por ahora solo contenido orgánico","No lo habíamos considerado"] },
      { id: "monto_pauta",      label: "Si tienen presupuesto para pauta, ¿cuánto aproximado al mes?", type: "text", req: false, hint: "En USD o en la moneda local" },
    ],
  },
  {
    id: "restricciones", label: "Restricciones", color: "#ec4899",
    title: "Restricciones y contexto especial",
    sub: "Lo que el equipo debe saber antes de producir el primer contenido",
    fields: [
      { id: "temas_prohibidos", label: "¿Hay temas que NO se pueden tocar bajo ningún concepto?", type: "textarea", req: true, hint: "Si no hay ninguno, escribir 'Ninguno'" },
      { id: "sensibilidades",   label: "¿Hay alguna situación delicada o reciente que debamos conocer?", type: "textarea", req: false },
      { id: "regulaciones",     label: "¿Su sector tiene regulaciones o restricciones legales de publicidad?", type: "radio", req: true, options: ["Sí, y las puedo detallar","Creo que sí pero no estoy seguro","No, publicamos sin restricciones"] },
      { id: "regulaciones_detalle", label: "Si hay regulaciones, descríbelas",         type: "textarea", req: false },
      { id: "conflictos_comp",  label: "¿Hay algún competidor cuya mención generaría problemas?", type: "text", req: false },
      { id: "promesas_negociacion", label: "¿Se prometió algo especial durante la negociación?", type: "textarea", req: false },
      { id: "personalidad_cliente", label: "¿Cómo describes la personalidad o actitud de este cliente?", type: "radio", req: true, options: ["Muy confiado, delega sin problemas","Detallista, revisa todo antes de aprobar","Exigente pero justo","Impaciente, quiere resultados inmediatos","Desconfiado, necesita mucha comunicación","Relajado, pocas intervenciones"] },
      { id: "notas_pm",         label: "Notas adicionales para el equipo",             type: "textarea", req: false },
    ],
  },
];

export default function OnboardingPage() {
  const params = useParams();
  const token = params.token as string;

  const [client, setClient] = useState<{ id: string; name: string; company?: string } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ empresa: true });
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/onboarding/${token}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) { setNotFound(true); return; }
        setClient({ id: data.id, name: data.name, company: data.company });
        if (data.onboarding_data && typeof data.onboarding_data === "object") {
          setAnswers(data.onboarding_data as Record<string, string>);
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  const autoSave = useCallback(async (data: Record<string, string>) => {
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) { setSaved(true); setLastSaved(new Date()); }
    } catch { /* silencioso */ }
  }, [token]);

  function set(id: string, val: string) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: val };
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => autoSave(next), 2000);
      return next;
    });
    setSaved(false);
  }

  function setCheck(id: string, option: string, checked: boolean) {
    setAnswers((prev) => {
      const current = prev[id] ? prev[id].split("|||") : [];
      const next = checked ? [...current.filter(v => v !== option), option] : current.filter(v => v !== option);
      const updated = { ...prev, [id]: next.join("|||") };
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => autoSave(updated), 2000);
      return updated;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (res.ok) {
        setSaved(true);
        setLastSaved(new Date());
        toast.success("¡Guardado! Puedes cerrar esta página y continuar más tarde desde el mismo link.");
      } else {
        toast.error("Error al guardar. Intenta nuevamente.");
      }
    } catch {
      toast.error("Error de conexión. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSection(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 mb-2">Enlace no válido</p>
          <p className="text-gray-400 text-sm">Este formulario no existe o ha expirado.</p>
        </div>
      </div>
    );
  }

  const totalAnswered = Object.values(answers).filter(v => v?.trim()).length;
  const totalFields = STEPS.reduce((s, step) => s + step.fields.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Cuestionario de onboarding</p>
            <h1 className="text-lg font-bold text-gray-900">{client?.name}</h1>
            {client?.company && client.company !== client.name && (
              <p className="text-sm text-gray-400">{client.company}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Guardado {lastSaved.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : saved ? (
                <><CheckCircle2 className="w-4 h-4" /> Guardado</>
              ) : (
                <><Send className="w-4 h-4" /> Guardar</>
              )}
            </button>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-1 bg-blue-500 transition-all duration-500"
            style={{ width: `${totalFields > 0 ? Math.round((totalAnswered / totalFields) * 100) : 0}%` }}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Intro */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-8">
          <p className="text-sm text-blue-700 leading-relaxed">
            👋 Bienvenido/a. Este cuestionario nos ayudará a conocer tu empresa en profundidad para arrancar con pie derecho.
            Son varias secciones — <strong>no tienes que completarlo todo de una vez</strong>.
            Tu progreso se guarda automáticamente mientras escribes.
            Puedes cerrar esta página y continuar más tarde desde el mismo link. <strong>No se pierde nada.</strong>
          </p>
        </div>

        {/* Secciones */}
        <div className="space-y-4">
          {STEPS.map((step) => {
            const isOpen = !!openSections[step.id];
            const answered = step.fields.filter((f) => answers[f.id]?.trim()).length;
            const total = step.fields.length;

            return (
              <div key={step.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleSection(step.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: step.color }} />
                    <div className="text-left">
                      <p className="font-semibold text-gray-900 text-sm">{step.title}</p>
                      <p className="text-xs text-gray-400">{step.sub}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-1 ${answered === total ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                      {answered}/{total}
                    </span>
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
                    {step.fields.map((f) => (
                      <div key={f.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {f.label}
                          {f.req && <span className="text-red-400 text-xs ml-1">*</span>}
                        </label>
                        {f.hint && <p className="text-xs text-gray-400 mb-1.5 leading-relaxed">{f.hint}</p>}

                        {(f.type === "text" || f.type === "email" || f.type === "tel" || f.type === "url") && (
                          <input
                            type={f.type}
                            value={answers[f.id] ?? ""}
                            onChange={(e) => set(f.id, e.target.value)}
                            placeholder="Tu respuesta..."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-blue-400 transition-colors"
                          />
                        )}

                        {f.type === "textarea" && (
                          <textarea
                            value={answers[f.id] ?? ""}
                            onChange={(e) => set(f.id, e.target.value)}
                            placeholder="Tu respuesta..."
                            rows={3}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-blue-400 transition-colors resize-y"
                          />
                        )}

                        {f.type === "select" && (
                          <select
                            value={answers[f.id] ?? ""}
                            onChange={(e) => set(f.id, e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400 transition-colors bg-white"
                          >
                            <option value="">— Seleccionar —</option>
                            {f.options?.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        )}

                        {f.type === "radio" && (
                          <div className="space-y-2">
                            {f.options?.map((o) => (
                              <label key={o} className="flex items-center gap-2.5 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={f.id}
                                  value={o}
                                  checked={answers[f.id] === o}
                                  onChange={() => set(f.id, o)}
                                  className="w-4 h-4 accent-blue-600"
                                />
                                <span className="text-sm text-gray-700 group-hover:text-gray-900">{o}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {f.type === "checkboxes" && (
                          <div className="space-y-2">
                            {f.options?.map((o) => {
                              const vals = answers[f.id] ? answers[f.id].split("|||") : [];
                              return (
                                <label key={o} className="flex items-center gap-2.5 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={vals.includes(o)}
                                    onChange={(e) => setCheck(f.id, o, e.target.checked)}
                                    className="w-4 h-4 accent-blue-600"
                                  />
                                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{o}</span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Guardar bottom */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-8 py-3 rounded-xl transition-colors"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Guardado — puedes continuar después</>
            ) : (
              <><Send className="w-4 h-4" /> Guardar y continuar después</>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6 pb-8">
          Cubo Digital · Tu información es confidencial y segura
        </p>
      </div>
    </div>
  );
}
