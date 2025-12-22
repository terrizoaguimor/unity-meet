import { Resend } from 'resend';
import { generateICS, generateICSFilename, createMeetingICSEvent } from '@/lib/utils/ics';
import type { MeetingSummary, ActionItem, MeetingInsights } from '@/lib/services/ai.service';

// Lazy initialization of Resend client
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'Unity Meet <noreply@unityfinancialnetwork.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface MeetingInvitationParams {
  to: string;
  recipientName: string;
  meeting: {
    id: string;
    title: string;
    description?: string | null;
    scheduledStart: Date;
    scheduledEnd?: Date | null;
    roomId: string;
    type: string;
  };
  host: {
    name: string | null;
    email: string;
  };
  message?: string;
}

/**
 * Send a meeting invitation email with .ics attachment
 */
export async function sendMeetingInvitation(params: MeetingInvitationParams) {
  const { to, recipientName, meeting, host, message } = params;
  const joinUrl = `${APP_URL}/room/${meeting.roomId}`;

  // Format date for display
  const dateFormatter = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const formattedDate = dateFormatter.format(meeting.scheduledStart);

  // Calculate duration
  const endTime = meeting.scheduledEnd || new Date(meeting.scheduledStart.getTime() + 60 * 60 * 1000);
  const durationMinutes = Math.round((endTime.getTime() - meeting.scheduledStart.getTime()) / 60000);
  const durationText = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min`.replace(' 0min', '')
    : `${durationMinutes} minutos`;

  // Generate ICS file
  const icsEvent = createMeetingICSEvent({
    ...meeting,
    host,
    invitees: [{ name: recipientName, email: to }],
  });
  const icsContent = generateICS(icsEvent);
  const icsFilename = generateICSFilename(meeting.title);

  // Email HTML content
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación a reunión</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #8B5CF6, #6366F1); border-radius: 12px; margin-bottom: 16px;">
        <span style="display: block; line-height: 48px; color: white; font-size: 24px;">🎥</span>
      </div>
      <h1 style="margin: 0; color: #18181b; font-size: 24px; font-weight: 600;">Unity Meet</h1>
    </div>

    <!-- Main Card -->
    <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <p style="margin: 0 0 24px; color: #52525b; font-size: 16px;">
        Hola <strong style="color: #18181b;">${recipientName}</strong>,
      </p>

      <p style="margin: 0 0 24px; color: #52525b; font-size: 16px;">
        <strong style="color: #18181b;">${host.name || 'Un usuario'}</strong> te ha invitado a ${meeting.type === 'WEBINAR' ? 'un webinar' : 'una reunión'}:
      </p>

      <!-- Meeting Details Box -->
      <div style="background: #faf5ff; border-radius: 12px; padding: 24px; margin-bottom: 24px; border-left: 4px solid #8B5CF6;">
        <h2 style="margin: 0 0 16px; color: #18181b; font-size: 20px; font-weight: 600;">
          ${meeting.title}
        </h2>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 18px;">📅</span>
            <span style="color: #52525b;">${formattedDate}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 18px;">⏱️</span>
            <span style="color: #52525b;">Duración: ${durationText}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 18px;">👤</span>
            <span style="color: #52525b;">Organizador: ${host.name || host.email}</span>
          </div>
        </div>

        ${meeting.description ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e4e4e7;">
          <p style="margin: 0; color: #71717a; font-size: 14px;">${meeting.description}</p>
        </div>
        ` : ''}
      </div>

      ${message ? `
      <!-- Personal Message -->
      <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #52525b; font-size: 14px; font-style: italic;">"${message}"</p>
      </div>
      ` : ''}

      <!-- Join Button -->
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${joinUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
          Unirse a la ${meeting.type === 'WEBINAR' ? 'webinar' : 'reunión'}
        </a>
      </div>

      <!-- Link fallback -->
      <p style="margin: 0; color: #a1a1aa; font-size: 12px; text-align: center; word-break: break-all;">
        O copia este enlace: <a href="${joinUrl}" style="color: #8B5CF6;">${joinUrl}</a>
      </p>
    </div>

    <!-- Calendar Note -->
    <div style="text-align: center; margin-top: 24px; padding: 16px;">
      <p style="margin: 0 0 8px; color: #71717a; font-size: 14px;">
        📎 Hemos adjuntado un archivo .ics para agregar este evento a tu calendario
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
      <p style="margin: 0 0 8px; color: #a1a1aa; font-size: 12px;">
        Powered by Unity Meet - Unity Financial Network
      </p>
      <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
        Este correo fue enviado a ${to}
      </p>
    </div>
  </div>
</body>
</html>
  `;

  // Plain text version
  const textContent = `
Hola ${recipientName},

${host.name || 'Un usuario'} te ha invitado a ${meeting.type === 'WEBINAR' ? 'un webinar' : 'una reunión'}:

📌 ${meeting.title}
📅 ${formattedDate}
⏱️ Duración: ${durationText}
👤 Organizador: ${host.name || host.email}

${meeting.description ? `Descripción: ${meeting.description}\n` : ''}
${message ? `Mensaje personal: "${message}"\n` : ''}

Únete a la reunión:
${joinUrl}

---
Hemos adjuntado un archivo .ics para agregar este evento a tu calendario.

Powered by Unity Meet - Unity Financial Network
  `.trim();

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `📅 Invitación: ${meeting.title}`,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          filename: icsFilename,
          content: Buffer.from(icsContent).toString('base64'),
        },
      ],
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Error sending invitation:', error);
    throw error;
  }
}

/**
 * Send a meeting reminder email
 */
export async function sendMeetingReminder(params: {
  to: string;
  recipientName: string;
  meeting: {
    title: string;
    scheduledStart: Date;
    roomId: string;
  };
  minutesBefore: number;
}) {
  const { to, recipientName, meeting, minutesBefore } = params;
  const joinUrl = `${APP_URL}/room/${meeting.roomId}`;

  const timeText = minutesBefore >= 60
    ? `${Math.floor(minutesBefore / 60)} hora${minutesBefore >= 120 ? 's' : ''}`
    : `${minutesBefore} minutos`;

  const dateFormatter = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedTime = dateFormatter.format(meeting.scheduledStart);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
      <h1 style="margin: 0 0 16px; color: #18181b; font-size: 24px;">Recordatorio de reunión</h1>

      <p style="margin: 0 0 24px; color: #52525b; font-size: 16px;">
        Hola ${recipientName}, tu reunión <strong>"${meeting.title}"</strong> comienza en <strong>${timeText}</strong> (a las ${formattedTime}).
      </p>

      <a href="${joinUrl}"
         style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600;">
        Unirse ahora
      </a>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `⏰ Recordatorio: ${meeting.title} comienza en ${timeText}`,
      html: htmlContent,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Error sending reminder:', error);
    throw error;
  }
}

/**
 * Send a public meeting link to share
 */
export async function sendPublicMeetingLink(params: {
  to: string;
  recipientName: string;
  meeting: {
    title: string;
    roomId: string;
    description?: string | null;
  };
  senderName: string;
  message?: string;
}) {
  const { to, recipientName, meeting, senderName, message } = params;
  const joinUrl = `${APP_URL}/room/${meeting.roomId}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 16px; padding: 32px;">
      <h1 style="margin: 0 0 16px; color: #18181b; font-size: 24px; text-align: center;">
        🔗 Te han compartido una reunión
      </h1>

      <p style="margin: 0 0 24px; color: #52525b; font-size: 16px;">
        Hola ${recipientName}, <strong>${senderName}</strong> te ha compartido el enlace de una reunión:
      </p>

      <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 8px; color: #18181b; font-size: 18px;">${meeting.title}</h2>
        ${meeting.description ? `<p style="margin: 0; color: #71717a; font-size: 14px;">${meeting.description}</p>` : ''}
      </div>

      ${message ? `
      <div style="background: #faf5ff; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; color: #52525b; font-size: 14px; font-style: italic;">"${message}"</p>
      </div>
      ` : ''}

      <div style="text-align: center;">
        <a href="${joinUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600;">
          Unirse a la reunión
        </a>
        <p style="margin: 16px 0 0; color: #a1a1aa; font-size: 12px; word-break: break-all;">
          ${joinUrl}
        </p>
      </div>
    </div>

    <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">
      Powered by Unity Meet - Unity Financial Network
    </p>
  </div>
</body>
</html>
  `;

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `🔗 ${senderName} te ha compartido una reunión: ${meeting.title}`,
      html: htmlContent,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Error sending public link:', error);
    throw error;
  }
}

/**
 * Send AI-generated meeting summary to all participants
 */
export async function sendMeetingSummaryEmail(params: {
  recipients: Array<{ email: string; name: string }>;
  meeting: {
    id: string;
    title: string;
    roomId: string;
    startedAt: Date;
    endedAt: Date;
    duration: number; // in seconds
  };
  host: {
    name: string | null;
    email: string;
  };
  summary: MeetingSummary;
  actionItems: ActionItem[];
  insights: MeetingInsights;
}) {
  const { recipients, meeting, host, summary, actionItems, insights } = params;
  const recordingUrl = `${APP_URL}/dashboard/meetings/${meeting.id}`;

  // Format dates
  const dateFormatter = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedDate = dateFormatter.format(meeting.startedAt);
  const formattedStartTime = timeFormatter.format(meeting.startedAt);
  const formattedEndTime = timeFormatter.format(meeting.endedAt);
  const durationMinutes = Math.round(meeting.duration / 60);
  const durationText = durationMinutes >= 60
    ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}min`.replace(' 0min', '')
    : `${durationMinutes} minutos`;

  // Build action items HTML
  const actionItemsHtml = actionItems.length > 0
    ? `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 16px; color: #18181b; font-size: 16px; font-weight: 600;">
          📋 Acciones a Seguir (${actionItems.length})
        </h3>
        <div style="background: #fef3c7; border-radius: 12px; padding: 16px;">
          ${actionItems.map((item, idx) => `
            <div style="display: flex; gap: 12px; ${idx > 0 ? 'margin-top: 12px; padding-top: 12px; border-top: 1px solid #fcd34d;' : ''}">
              <span style="flex-shrink: 0; width: 24px; height: 24px; background: ${
                item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#f59e0b' : '#22c55e'
              }; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 600;">
                ${idx + 1}
              </span>
              <div>
                <p style="margin: 0 0 4px; color: #18181b; font-size: 14px; font-weight: 500;">${item.task}</p>
                ${item.assignee ? `<p style="margin: 0; color: #71717a; font-size: 12px;">👤 ${item.assignee}${item.dueDate ? ` • 📅 ${item.dueDate}` : ''}</p>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Build key points HTML
  const keyPointsHtml = summary.keyPoints.length > 0
    ? `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 16px; color: #18181b; font-size: 16px; font-weight: 600;">
          ✨ Puntos Clave
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #52525b;">
          ${summary.keyPoints.map(point => `<li style="margin-bottom: 8px;">${point}</li>`).join('')}
        </ul>
      </div>
    `
    : '';

  // Build topics HTML
  const topicsHtml = insights.topics.length > 0
    ? `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 16px; color: #18181b; font-size: 16px; font-weight: 600;">
          📊 Temas Discutidos
        </h3>
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${insights.topics.map(topic => `
            <span style="background: #f3e8ff; color: #7c3aed; padding: 6px 12px; border-radius: 20px; font-size: 13px;">
              ${topic.name} (${topic.percentage}%)
            </span>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Build participation HTML
  const participationHtml = insights.participationBalance.length > 0
    ? `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 16px; color: #18181b; font-size: 16px; font-weight: 600;">
          👥 Participación
        </h3>
        <div style="background: #f0fdf4; border-radius: 12px; padding: 16px;">
          ${insights.participationBalance.map(p => `
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #18181b; font-size: 13px;">${p.participant}</span>
                <span style="color: #71717a; font-size: 12px;">${p.speakingTime} (${p.percentage}%)</span>
              </div>
              <div style="background: #dcfce7; border-radius: 4px; height: 8px; overflow: hidden;">
                <div style="background: #22c55e; height: 100%; width: ${p.percentage}%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Build suggestions HTML
  const suggestionsHtml = insights.suggestions.length > 0
    ? `
      <div style="margin-top: 24px;">
        <h3 style="margin: 0 0 16px; color: #18181b; font-size: 16px; font-weight: 600;">
          💡 Sugerencias para Mejorar
        </h3>
        <div style="background: #eff6ff; border-radius: 12px; padding: 16px;">
          <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
            ${insights.suggestions.map(s => `<li style="margin-bottom: 8px;">${s}</li>`).join('')}
          </ul>
        </div>
      </div>
    `
    : '';

  // Sentiment badge
  const sentimentBadge = {
    positive: { bg: '#dcfce7', color: '#166534', text: '😊 Positivo' },
    neutral: { bg: '#f3f4f6', color: '#374151', text: '😐 Neutral' },
    negative: { bg: '#fee2e2', color: '#991b1b', text: '😟 Negativo' },
  }[insights.sentiment] || { bg: '#f3f4f6', color: '#374151', text: '😐 Neutral' };

  // Email HTML content
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resumen de reunión</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 640px; margin: 0 auto; padding: 40px 20px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #8B5CF6, #6366F1); border-radius: 16px; margin-bottom: 16px;">
        <span style="display: block; line-height: 56px; font-size: 28px;">🤖</span>
      </div>
      <h1 style="margin: 0 0 8px; color: #18181b; font-size: 28px; font-weight: 700;">Resumen de Reunión</h1>
      <p style="margin: 0; color: #71717a; font-size: 14px;">Generado automáticamente por Unity Meet AI</p>
    </div>

    <!-- Main Card -->
    <div style="background: white; border-radius: 20px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">

      <!-- Meeting Info -->
      <div style="background: linear-gradient(135deg, #f5f3ff, #ede9fe); border-radius: 16px; padding: 24px; margin-bottom: 24px;">
        <h2 style="margin: 0 0 16px; color: #5b21b6; font-size: 22px; font-weight: 600;">
          ${summary.title || meeting.title}
        </h2>

        <div style="display: flex; flex-wrap: wrap; gap: 16px; color: #6b7280; font-size: 14px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>📅</span> ${formattedDate}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>🕐</span> ${formattedStartTime} - ${formattedEndTime}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>⏱️</span> ${durationText}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>👤</span> ${host.name || host.email}
          </div>
        </div>

        <!-- Sentiment Badge -->
        <div style="margin-top: 16px;">
          <span style="display: inline-block; background: ${sentimentBadge.bg}; color: ${sentimentBadge.color}; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 500;">
            ${sentimentBadge.text}
          </span>
        </div>
      </div>

      <!-- Summary -->
      <div>
        <h3 style="margin: 0 0 12px; color: #18181b; font-size: 16px; font-weight: 600;">
          📝 Resumen Ejecutivo
        </h3>
        <p style="margin: 0; color: #52525b; font-size: 15px; line-height: 1.7;">
          ${summary.summary}
        </p>
      </div>

      <!-- Key Points -->
      ${keyPointsHtml}

      <!-- Action Items -->
      ${actionItemsHtml}

      <!-- Topics -->
      ${topicsHtml}

      <!-- Participation -->
      ${participationHtml}

      <!-- Suggestions -->
      ${suggestionsHtml}

      <!-- CTA Button -->
      <div style="margin-top: 32px; text-align: center;">
        <a href="${recordingUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #8B5CF6, #6366F1); color: white; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 15px;">
          Ver Detalles de la Reunión
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; margin-top: 32px; color: #a1a1aa; font-size: 12px;">
      <p style="margin: 0 0 8px;">
        Este resumen fue generado automáticamente usando inteligencia artificial.
      </p>
      <p style="margin: 0;">
        Powered by Unity Meet AI - Unity Financial Network
      </p>
    </div>
  </div>
</body>
</html>
  `;

  // Plain text version
  const textContent = `
RESUMEN DE REUNIÓN - Unity Meet AI
=====================================

📌 ${summary.title || meeting.title}

📅 ${formattedDate}
🕐 ${formattedStartTime} - ${formattedEndTime}
⏱️ Duración: ${durationText}
👤 Organizador: ${host.name || host.email}
😊 Tono: ${sentimentBadge.text}

---

📝 RESUMEN EJECUTIVO
${summary.summary}

${summary.keyPoints.length > 0 ? `
✨ PUNTOS CLAVE
${summary.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
` : ''}
${actionItems.length > 0 ? `
📋 ACCIONES A SEGUIR
${actionItems.map((a, i) => `${i + 1}. ${a.task}${a.assignee ? ` (${a.assignee})` : ''}${a.dueDate ? ` - ${a.dueDate}` : ''} [${a.priority.toUpperCase()}]`).join('\n')}
` : ''}
${insights.topics.length > 0 ? `
📊 TEMAS DISCUTIDOS
${insights.topics.map(t => `• ${t.name}: ${t.percentage}%`).join('\n')}
` : ''}
${insights.suggestions.length > 0 ? `
💡 SUGERENCIAS
${insights.suggestions.map(s => `• ${s}`).join('\n')}
` : ''}
---
Ver detalles: ${recordingUrl}

Powered by Unity Meet AI - Unity Financial Network
  `.trim();

  const results: Array<{ email: string; success: boolean; messageId?: string; error?: string }> = [];

  // Send to all recipients
  for (const recipient of recipients) {
    try {
      const result = await getResendClient().emails.send({
        from: FROM_EMAIL,
        to: [recipient.email],
        subject: `📊 Resumen AI: ${summary.title || meeting.title}`,
        html: htmlContent.replace('Hola', `Hola ${recipient.name}`),
        text: textContent,
      });

      results.push({
        email: recipient.email,
        success: true,
        messageId: result.data?.id,
      });

      console.log(`[Email] AI Summary sent to ${recipient.email}`);
    } catch (error) {
      console.error(`[Email] Error sending AI summary to ${recipient.email}:`, error);
      results.push({
        email: recipient.email,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: results.every(r => r.success),
    results,
    sentCount: results.filter(r => r.success).length,
    failedCount: results.filter(r => !r.success).length,
  };
}
