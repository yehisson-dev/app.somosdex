/**
 * POST /api/notifications/send
 * Crea una notificación en DB y envía email al destinatario.
 * Usado por todos los componentes del frontend en lugar de insertar
 * directamente en la tabla notifications.
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import sql from '@/lib/db';
import { sendNotificationEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { user_id, type, title, task_id, body: msgBody, channel_id, message_id } = body;

  if (!user_id || !type || !title) {
    return NextResponse.json({ error: 'user_id, type y title son requeridos' }, { status: 400 });
  }

  // 1. Insertar notificación en DB
  await sql`
    INSERT INTO notifications (user_id, type, title, task_id, body, channel_id, message_id)
    VALUES (
      ${user_id},
      ${type},
      ${title},
      ${task_id ?? null},
      ${msgBody ?? null},
      ${channel_id ?? null},
      ${message_id ?? null}
    )
  `;

  // 2. Obtener email y nombre del destinatario
  const userRows = await sql`SELECT email, full_name FROM users WHERE id = ${user_id} LIMIT 1`;
  const recipient = userRows[0] as { email: string; full_name: string } | undefined;

  if (!recipient?.email) {
    return NextResponse.json({ ok: true, email: 'no_email' });
  }

  // 3. Obtener título de la tarea si aplica
  let taskTitle: string | undefined;
  let taskUrl:   string | undefined;
  if (task_id) {
    const taskRows = await sql`
      SELECT t.title, t.project_id, t.client_id
      FROM tasks t WHERE t.id = ${task_id} LIMIT 1
    `;
    if (taskRows[0]) {
      const t = taskRows[0] as any;
      taskTitle = t.title;
      taskUrl   = `/tareas/${task_id}`;
    }
  }

  // 4. Enviar email (fire-and-forget, no bloquea la respuesta)
  sendNotificationEmail({
    to:          recipient.email,
    userName:    recipient.full_name ?? recipient.email,
    type,
    title,
    taskTitle,
    taskUrl,
    senderName:  session.user?.name ?? undefined,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
