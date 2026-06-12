import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

const SECTIONS = [
  {
    id: "empresa", title: "Sobre tu empresa", color: "#8b5cf6",
    questions: [
      { id: "nombre_comercial",        label: "Nombre comercial" },
      { id: "descripcion_actividad",   label: "Descripción de la actividad comercial" },
      { id: "productos_marcas",        label: "Productos y marcas relacionadas" },
      { id: "como_comercializa",       label: "¿Cómo se comercializan los productos?" },
      { id: "necesidades_satisface",   label: "¿Qué necesidades satisfacen los productos o servicios?" },
      { id: "para_que_sirven",         label: "¿Para qué sirven?" },
      { id: "puntos_contacto",         label: "Puntos de contacto con la audiencia" },
      { id: "planes_futuro",           label: "Planes futuros de la marca" },
      { id: "posicionamiento",         label: "¿Cómo está posicionada la marca?" },
      { id: "percepcion_deseada",      label: "¿Cómo quieres que sea percibida la marca?" },
      { id: "percepcion_satisfecha",   label: "Satisfacción con la percepción actual" },
      { id: "punto_fuerte",            label: "Punto más fuerte de la marca" },
      { id: "punto_debil",             label: "Punto más débil de la marca" },
      { id: "opinion_gente",           label: "¿Qué crees que piensa la gente de tu marca?" },
      { id: "necesidad_marca",         label: "¿Qué necesidad satisface tu marca?" },
      { id: "historia",                label: "Historia de la marca" },
      { id: "objetivo_marca",          label: "¿Qué quieres lograr con la marca?" },
      { id: "vision",                  label: "Visión de la marca" },
    ],
  },
  {
    id: "conceptos", title: "Conceptos de marca", color: "#3b82f6",
    questions: [
      { id: "concepto1_nombre",    label: "Concepto 1" },
      { id: "concepto1_porque",    label: "¿Por qué te representa?" },
      { id: "concepto1_evidencia", label: "¿Cómo lo perciben los clientes?" },
      { id: "concepto2_nombre",    label: "Concepto 2" },
      { id: "concepto2_porque",    label: "¿Por qué te representa?" },
      { id: "concepto2_evidencia", label: "¿Cómo lo perciben los clientes?" },
      { id: "concepto3_nombre",    label: "Concepto 3" },
      { id: "concepto3_porque",    label: "¿Por qué te representa?" },
      { id: "concepto3_evidencia", label: "¿Cómo lo perciben los clientes?" },
      { id: "concepto4_nombre",    label: "Concepto 4" },
      { id: "concepto4_porque",    label: "¿Por qué te representa?" },
      { id: "concepto4_evidencia", label: "¿Cómo lo perciben los clientes?" },
      { id: "concepto5_nombre",    label: "Concepto 5" },
      { id: "concepto5_porque",    label: "¿Por qué te representa?" },
      { id: "concepto5_evidencia", label: "¿Cómo lo perciben los clientes?" },
    ],
  },
  {
    id: "competencia", title: "Competencia", color: "#ef4444",
    questions: [
      { id: "lider_sector",            label: "Líder del sector" },
      { id: "marcas_similares",        label: "Marcas similares" },
      { id: "productos_similares",     label: "Productos similares" },
      { id: "opciones_clientes",       label: "Opciones que tienen los clientes" },
      { id: "marcas_no_parecer",       label: "Marcas a las que no quieres parecerte" },
      { id: "marcas_admiradas_sector", label: "Marcas admiradas del mismo sector" },
      { id: "marcas_admiradas_otro",   label: "Marcas admiradas de otro sector" },
    ],
  },
  {
    id: "audiencia", title: "Audiencia", color: "#10b981",
    questions: [
      { id: "quien_compra",        label: "¿Quién compra tus productos o servicios?" },
      { id: "que_sabes_ellos",     label: "¿Qué sabes de ellos?" },
      { id: "otras_audiencias",    label: "Otras audiencias relevantes" },
      { id: "opinion_audiencia",   label: "¿Qué opinan de tu marca?" },
      { id: "marcas_usan",         label: "Marcas y productos que utilizan" },
      { id: "estilo_vida",         label: "Estilo de vida de la audiencia" },
      { id: "como_conocen_marca",  label: "¿Cómo saben que tu marca existe?" },
    ],
  },
  {
    id: "comunicacion", title: "Comunicación", color: "#f59e0b",
    questions: [
      { id: "como_dado_conocer",         label: "¿Cómo te has dado a conocer?" },
      { id: "que_funciono",              label: "¿Qué te ha funcionado y qué no?" },
      { id: "puntos_fuertes_contenido",  label: "Puntos fuertes al crear contenido" },
      { id: "puntos_debiles_contenido",  label: "Puntos débiles al crear contenido" },
      { id: "dificultades_comunicacion", label: "Dificultades al comunicar la marca" },
      { id: "mensaje_clave",             label: "Mensaje clave de la comunicación" },
      { id: "comunicar_si",              label: "¿Qué debemos comunicar sí o sí?" },
      { id: "comunicar_no",              label: "¿Qué NO debemos comunicar?" },
      { id: "tono_voz",                  label: "Tono de voz" },
      { id: "linea_visual",              label: "Línea visual" },
    ],
  },
  {
    id: "emociones", title: "Emociones y sensaciones", color: "#ec4899",
    questions: [
      { id: "texturas",    label: "Texturas que representan la marca" },
      { id: "olores",      label: "Olores que representan la marca" },
      { id: "sabores",     label: "Sabores que representan la marca" },
      { id: "colores",     label: "Colores que representan la marca" },
      { id: "musica",      label: "Música del ambiente de la marca" },
      { id: "sensaciones", label: "Sensaciones que quieres despertar" },
    ],
  },
];

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.somosdex.com";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "admin")
    return new NextResponse("Forbidden", { status: 403 });

  const { clientId } = await params;
  const rows = await sql`SELECT name, company, color, brief_data FROM clients WHERE id = ${clientId} LIMIT 1`;
  if (!rows[0]) return new NextResponse("Not found", { status: 404 });

  const client = rows[0] as any;
  const data: Record<string, string> = client.brief_data ?? {};
  const hasData = Object.keys(data).length > 0;

  const sectionHtml = SECTIONS.map((sec) => {
    const answered = sec.questions.filter((q) => data[q.id]?.trim());
    if (!answered.length) return "";
    const rows = answered.map((q) => `
      <div class="qa">
        <div class="q">${q.label}</div>
        <div class="a">${(data[q.id] ?? "").replace(/\n/g, "<br>")}</div>
      </div>`).join("");
    return `
      <div class="section">
        <div class="section-header" style="border-left-color:${sec.color}">
          <span class="section-dot" style="background:${sec.color}"></span>
          ${sec.title}
        </div>
        ${rows}
      </div>`;
  }).join("");

  const now = new Date().toLocaleDateString("es-DO", { day: "numeric", month: "long", year: "numeric" });

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Brief de marca — ${client.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#111827; background:#fff; font-size:13px; }
  .page { max-width:820px; margin:0 auto; padding:48px 44px 36px; }

  /* HEADER */
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:32px; }
  .logo { height:52px; width:auto; object-fit:contain; }
  .header-right { text-align:right; }
  .doc-title { font-size:24px; font-weight:800; color:#1e2d47; letter-spacing:-0.5px; }
  .client-name { font-size:15px; font-weight:700; color:#8b5cf6; margin-top:4px; }
  .client-company { font-size:12px; color:#6b7280; margin-top:2px; }
  .divider { border:none; border-top:2px solid #8b5cf6; margin:0 0 28px; opacity:.25; }

  /* NO DATA */
  .empty { text-align:center; padding:60px 0; color:#9ca3af; font-size:14px; }

  /* SECTIONS */
  .section { margin-bottom:28px; page-break-inside:avoid; }
  .section-header {
    display:flex; align-items:center; gap:8px;
    font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#6b7280;
    border-left:3px solid #8b5cf6; padding-left:10px; margin-bottom:12px;
  }
  .section-dot { width:7px; height:7px; border-radius:50%; shrink:0; display:none; }

  /* Q&A */
  .qa { margin-bottom:12px; }
  .q { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:#9ca3af; margin-bottom:4px; }
  .a { font-size:13px; color:#374151; line-height:1.65; background:#f9fafb; border-radius:6px; padding:10px 12px; border:1px solid #f3f4f6; }

  /* FOOTER */
  .footer { border-top:1px solid #e5e7eb; padding-top:14px; margin-top:32px; display:flex; justify-content:space-between; font-size:11px; color:#9ca3af; }

  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .page { padding:28px 32px 20px; }
    @page { margin:0; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <img src="${BASE_URL}/logo-dex.jpg" alt="Dex" class="logo" />
    </div>
    <div class="header-right">
      <div class="doc-title">BRIEF DE MARCA</div>
      <div class="client-name">${client.name}</div>
      ${client.company ? `<div class="client-company">${client.company}</div>` : ""}
    </div>
  </div>

  <hr class="divider">

  ${hasData ? sectionHtml : '<div class="empty">El cliente aún no ha completado el brief.</div>'}

  <div class="footer">
    <span>Generado por Dex · app.somosdex.com</span>
    <span>${now}</span>
  </div>

</div>
<script>window.onload = () => window.print();</script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
