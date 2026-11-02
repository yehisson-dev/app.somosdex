import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

// ── ICS helpers ──────────────────────────────────────────────────────────────

function icsDate(dateStr: string): string {
  // dateStr = "YYYY-MM-DD" → all-day date in ICS format: YYYYMMDD
  return dateStr.replace(/-/g, "");
}

function icsEscape(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function buildICS(events: {
  uid: string;
  summary: string;
  description: string;
  date: string;        // YYYY-MM-DD
  url: string;
  updated: string;     // ISO timestamp
}[], calName: string): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  const vevents = events.map(ev => {
    const day = icsDate(ev.date);
    // All-day event: DTSTART DATE, DTEND = next day
    const nextDay = icsDate(
      new Date(new Date(ev.date + "T12:00:00Z").getTime() + 86400000)
        .toISOString().slice(0, 10)
    );
    return [
      "BEGIN:VEVENT",
      `UID:${ev.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${nextDay}`,
      `SUMMARY:${icsEscape(ev.summary)}`,
      `DESCRIPTION:${icsEscape(ev.description)}`,
      `URL:${ev.url}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Somos DEX//CoWork Agency//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(calName)}`,
    "X-WR-TIMEZONE:America/Santo_Domingo",
    "X-WR-CALDESC:Entregas y tareas asignadas en CoWork",
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n") + "\r\n";
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Buscar usuario por token
  const userRows = await sql`
    SELECT id, full_name FROM users WHERE calendar_token = ${token} LIMIT 1
  `;
  if (!userRows[0]) {
    return new NextResponse("Token inválido", { status: 404 });
  }
  const user = userRows[0] as { id: string; full_name: string };

  // Tareas asignadas con fecha de entrega (due_date o scheduled_date)
  const taskRows = await sql`
    SELECT
      t.id,
      t.title,
      t.priority,
      to_char(t.due_date, 'YYYY-MM-DD')       AS due_date,
      to_char(t.scheduled_date, 'YYYY-MM-DD') AS scheduled_date,
      t.updated_at,
      t.parent_task_id,
      pt.title AS parent_title,
      c.name   AS client_name,
      p.name   AS project_name,
      ps.name  AS status_name
    FROM tasks t
    LEFT JOIN tasks pt      ON pt.id = t.parent_task_id
    LEFT JOIN clients c     ON c.id  = t.client_id
    LEFT JOIN projects p    ON p.id  = t.project_id
    LEFT JOIN project_statuses ps ON ps.id = t.status_id
    WHERE t.assignee_id = ${user.id}
      AND (t.due_date IS NOT NULL OR t.scheduled_date IS NOT NULL)
    ORDER BY COALESCE(t.due_date, t.scheduled_date) ASC
  `;

  const baseUrl = "https://app.somosdex.com";

  const events = (taskRows as any[]).map(t => {
    const date = t.due_date ?? t.scheduled_date;
    const isSubtask = !!t.parent_task_id;
    const prefix = isSubtask ? `[Sub] ` : "";
    const summary = `${prefix}${t.title}`;

    const descParts: string[] = [];
    if (t.client_name)  descParts.push(`Cliente: ${t.client_name}`);
    if (t.project_name) descParts.push(`Proyecto: ${t.project_name}`);
    if (t.status_name)  descParts.push(`Estado: ${t.status_name}`);
    if (t.priority && t.priority !== "none") descParts.push(`Prioridad: ${t.priority}`);
    if (isSubtask && t.parent_title) descParts.push(`Tarea padre: ${t.parent_title}`);

    return {
      uid: `task-${t.id}@cowork.somosdex.com`,
      summary,
      description: descParts.join(" · "),
      date,
      url: `${baseUrl}/tareas/${t.id}`,
      updated: t.updated_at,
    };
  });

  const calName = `${user.full_name} · Entregas CoWork`;
  const ics = buildICS(events, calName);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="cowork-entregas.ics"`,
      "Cache-Control": "no-cache, no-store",
    },
  });
}
