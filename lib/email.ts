/**
 * Envío de emails via Resend API (REST directo, sin paquete npm).
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */

export const EMAIL_FROM = process.env.RESEND_FROM ?? 'Cubo Digital <onboarding@resend.dev>';

export interface NotificationEmailData {
  to:          string;
  userName:    string;
  type:        string;
  title:       string;
  taskTitle?:  string;
  taskUrl?:    string;
  senderName?: string;
}

const TYPE_META: Record<string, { subject: string; icon: string; color: string }> = {
  task_assigned:        { subject: 'Nueva tarea asignada',            icon: '📋', color: '#8b5cf6' },
  deliverable_uploaded: { subject: 'Nuevo entregable para revisar',   icon: '📎', color: '#3b82f6' },
  deliverable_approved: { subject: 'Entregable aprobado',             icon: '✅', color: '#10b981' },
  deliverable_rejected: { subject: 'Entregable rechazado',            icon: '❌', color: '#ef4444' },
  comment_mention:      { subject: 'Te mencionaron en un comentario', icon: '💬', color: '#f59e0b' },
  task_comment:         { subject: 'Nuevo comentario en tu tarea',    icon: '💬', color: '#f59e0b' },
  task_due:             { subject: 'Tarea vence hoy',                 icon: '⏰', color: '#ef4444' },
  task_due_soon:        { subject: 'Tarea próxima a vencer',          icon: '⏳', color: '#f59e0b' },
  message_mention:      { subject: 'Te mencionaron en mensajes',      icon: '📣', color: '#8b5cf6' },
};

function buildHtml(data: NotificationEmailData): string {
  const meta  = TYPE_META[data.type] ?? { subject: 'Nueva notificación', icon: '🔔', color: '#8b5cf6' };
  const year  = new Date().getFullYear();
  const base  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.somosdex.com';
  const link  = data.taskUrl ? `${base}${data.taskUrl}` : base;

  const taskBlock = data.taskTitle
    ? `<div style="color:#6b7280;font-size:13px;margin-top:6px;">📌 ${data.taskTitle}</div>`
    : '';
  const senderBlock = data.senderName
    ? `<div style="color:#6b7280;font-size:13px;margin-top:4px;">👤 ${data.senderName}</div>`
    : '';

  return [
    '<!DOCTYPE html>',
    '<html lang="es">',
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${meta.subject}</title></head>`,
    '<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;">',
    '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">',
    '<tr><td align="center">',
    '<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:600px;width:100%;">',
    '<tr>',
    `<td style="background:${meta.color};padding:28px 32px;">`,
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>',
    '<td>',
    `<span style="font-size:28px;">${meta.icon}</span>`,
    `<div style="color:#fff;font-size:20px;font-weight:700;margin-top:8px;">${meta.subject}</div>`,
    '</td>',
    '<td align="right" style="vertical-align:top;">',
    '<div style="color:rgba(255,255,255,.8);font-size:13px;font-weight:600;letter-spacing:.05em;">CUBO DIGITAL</div>',
    '</td>',
    '</tr></table>',
    '</td></tr>',
    '<tr><td style="padding:32px;">',
    `<p style="color:#374151;font-size:16px;margin:0 0 8px;">Hola, <strong>${data.userName}</strong> 👋</p>`,
    '<p style="color:#6b7280;font-size:15px;margin:0 0 24px;">Tienes una nueva notificación en la plataforma:</p>',
    `<div style="background:#f9fafb;border-left:4px solid ${meta.color};border-radius:8px;padding:16px 20px;margin-bottom:28px;">`,
    `<div style="color:#111827;font-size:15px;font-weight:600;">${data.title}</div>`,
    taskBlock,
    senderBlock,
    '</div>',
    '<div style="text-align:center;margin-bottom:28px;">',
    `<a href="${link}" style="display:inline-block;background:${meta.color};color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">`,
    'Ver en la plataforma →',
    '</a></div>',
    '<p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">Si no esperabas esta notificación puedes ignorar este correo.</p>',
    '</td></tr>',
    '<tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">',
    `<p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">© ${year} Cubo Digital · <a href="${base}" style="color:#8b5cf6;text-decoration:none;">app.somosdex.com</a></p>`,
    '</td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join('\n');
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.somosdex.com';

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bienvenido a Cubo Digital</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:600px;width:100%;">
<tr><td style="background:#8b5cf6;padding:28px 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td><span style="font-size:32px;">🎉</span>
<div style="color:#fff;font-size:22px;font-weight:700;margin-top:8px;">¡Bienvenido a Cubo Digital!</div></td>
<td align="right" style="vertical-align:top;"><div style="color:rgba(255,255,255,.8);font-size:13px;font-weight:600;letter-spacing:.05em;">CUBO DIGITAL</div></td>
</tr></table></td></tr>
<tr><td style="padding:32px;">
<p style="color:#374151;font-size:16px;margin:0 0 16px;">Hola, <strong>${name}</strong> 👋</p>
<p style="color:#6b7280;font-size:15px;margin:0 0 24px;">Has sido invitado a la plataforma de gestión de proyectos de <strong>Cubo Digital</strong>. Ya puedes acceder con tu cuenta de Google.</p>
<div style="background:#f9fafb;border-left:4px solid #8b5cf6;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
<div style="color:#374151;font-size:14px;margin-bottom:8px;">📧 <strong>Tu email de acceso:</strong> ${to}</div>
<div style="color:#6b7280;font-size:13px;">Inicia sesión con el botón "Continuar con Google" usando esta cuenta.</div>
</div>
<div style="text-align:center;margin-bottom:28px;">
<a href="${base}/login" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:600;">Entrar a la plataforma →</a>
</div>
<p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">Si no esperabas esta invitación puedes ignorar este correo.</p>
</td></tr>
<tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
<p style="color:#9ca3af;font-size:12px;margin:0;text-align:center;">© ${new Date().getFullYear()} Cubo Digital · <a href="${base}" style="color:#8b5cf6;text-decoration:none;">app.somosdex.com</a></p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject: '🎉 Bienvenido a Cubo Digital — Ya tienes acceso', html }),
    });
    const json = await res.json() as any;
    if (!res.ok) throw new Error(json.message ?? res.statusText);
    console.log('[email] ✓ Bienvenida enviada a', to);
  } catch (err) {
    console.error('[email] ✗ Error bienvenida a', to, ':', err);
  }
}

export async function sendNotificationEmail(data: NotificationEmailData): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[email] RESEND_API_KEY no configurada — omitido para:', data.to);
    return;
  }

  const meta = TYPE_META[data.type] ?? { subject: 'Nueva notificación', icon: '🔔', color: '#8b5cf6' };

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    EMAIL_FROM,
        to:      [data.to],
        subject: `${meta.icon} ${meta.subject} — Cubo Digital`,
        html:    buildHtml(data),
      }),
    });

    const json = await res.json() as any;
    if (!res.ok) throw new Error(json.message ?? res.statusText);
    console.log('[email] ✓ Enviado a', data.to, '| id:', json.id);
  } catch (err) {
    console.error('[email] ✗ Error al enviar a', data.to, ':', err);
  }
}
