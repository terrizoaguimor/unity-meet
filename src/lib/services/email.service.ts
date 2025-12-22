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

  // Format time separately
  const timeFormatter = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const dayFormatter = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = timeFormatter.format(meeting.scheduledStart);
  const formattedDay = dayFormatter.format(meeting.scheduledStart);
  // Capitalize first letter
  const capitalizedDay = formattedDay.charAt(0).toUpperCase() + formattedDay.slice(1);

  // Email HTML content - Table-based for better email client compatibility
  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Invitación a reunión - Unity Meet</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .button-td, .button-a {padding: 16px 32px !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${host.name || 'Alguien'} te invita a: ${meeting.title} - ${capitalizedDay} a las ${formattedTime}
  </div>

  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f23;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">

          <!-- Logo Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #8B5CF6 0%, #F97316 100%); border-radius: 16px; padding: 16px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="width: 32px; height: 32px; background-color: rgba(255,255,255,0.2); border-radius: 8px; text-align: center; line-height: 32px;">
                            <span style="color: white; font-size: 18px; font-weight: bold;">U</span>
                          </div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <span style="color: white; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Unity Meet</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1a1a2e; border-radius: 24px; overflow: hidden;">

                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #312e81 0%, #581c87 100%); padding: 32px 40px;">
                    <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.7); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      ${meeting.type === 'WEBINAR' ? 'Invitación a Webinar' : 'Invitación a Reunión'}
                    </p>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.3;">
                      ${meeting.title}
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">

                    <!-- Greeting -->
                    <p style="margin: 0 0 24px 0; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                      Hola <strong style="color: #ffffff;">${recipientName}</strong>,
                    </p>
                    <p style="margin: 0 0 32px 0; color: #94a3b8; font-size: 16px; line-height: 1.6;">
                      <strong style="color: #c4b5fd;">${host.name || 'Un organizador'}</strong> te ha invitado a participar en esta ${meeting.type === 'WEBINAR' ? 'sesión' : 'reunión'}.
                    </p>

                    <!-- Meeting Details Card -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #252542; border-radius: 16px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 24px;">

                          <!-- Date & Time Row -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                            <tr>
                              <td width="50%" style="padding-right: 12px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1e1e38; border-radius: 12px;">
                                  <tr>
                                    <td style="padding: 16px;">
                                      <p style="margin: 0 0 4px 0; color: #8B5CF6; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Fecha</p>
                                      <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">${capitalizedDay}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td width="50%" style="padding-left: 12px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1e1e38; border-radius: 12px;">
                                  <tr>
                                    <td style="padding: 16px;">
                                      <p style="margin: 0 0 4px 0; color: #F97316; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Hora</p>
                                      <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">${formattedTime}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                          <!-- Duration & Host Row -->
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td width="50%" style="padding-right: 12px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1e1e38; border-radius: 12px;">
                                  <tr>
                                    <td style="padding: 16px;">
                                      <p style="margin: 0 0 4px 0; color: #22c55e; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Duración</p>
                                      <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">${durationText}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                              <td width="50%" style="padding-left: 12px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1e1e38; border-radius: 12px;">
                                  <tr>
                                    <td style="padding: 16px;">
                                      <p style="margin: 0 0 4px 0; color: #3b82f6; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Organizador</p>
                                      <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${host.name || host.email}</p>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>

                        </td>
                      </tr>
                    </table>

                    ${meeting.description ? `
                    <!-- Description -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td style="background-color: #252542; border-radius: 12px; padding: 20px; border-left: 4px solid #8B5CF6;">
                          <p style="margin: 0 0 8px 0; color: #a78bfa; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Descripción</p>
                          <p style="margin: 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">${meeting.description}</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    ${message ? `
                    <!-- Personal Message -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 32px;">
                      <tr>
                        <td style="background-color: #1e293b; border-radius: 12px; padding: 20px;">
                          <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Mensaje del organizador</p>
                          <p style="margin: 0; color: #f1f5f9; font-size: 15px; font-style: italic; line-height: 1.6;">"${message}"</p>
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td style="text-align: center;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                            <tr>
                              <td class="button-td" style="border-radius: 14px; background: linear-gradient(135deg, #8B5CF6 0%, #7c3aed 100%);">
                                <a href="${joinUrl}" class="button-a" style="display: inline-block; padding: 18px 48px; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 14px;">
                                  Unirse a la ${meeting.type === 'WEBINAR' ? 'sesión' : 'reunión'}
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Link -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">O copia y pega este enlace:</p>
                          <p style="margin: 0; word-break: break-all;">
                            <a href="${joinUrl}" style="color: #a78bfa; font-size: 13px; text-decoration: underline;">${joinUrl}</a>
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Calendar Attachment Note -->
                <tr>
                  <td style="background-color: #252542; padding: 20px 40px; border-top: 1px solid #334155;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="text-align: center;">
                          <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                            <span style="color: #22c55e; font-weight: 600;">+</span> Archivo .ics adjunto para agregar a tu calendario
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">
                <strong style="color: #8B5CF6;">Unity Meet</strong> &bull; Unity Financial Network
              </p>
              <p style="margin: 0; color: #475569; font-size: 12px;">
                Este correo fue enviado a ${to}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

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

/**
 * Send meeting credentials (passwords) to the host
 */
export async function sendMeetingCredentials(params: {
  to: string;
  hostName: string;
  meeting: {
    id: string;
    title: string;
    roomId: string;
    type: string;
    scheduledStart?: Date | null;
  };
  hostPassword?: string;
  participantPassword?: string;
}) {
  const { to, hostName, meeting, hostPassword, participantPassword } = params;
  const joinUrl = `${APP_URL}/room/${meeting.roomId}`;

  // Format date if scheduled
  let dateText = 'Reunión instantánea';
  if (meeting.scheduledStart) {
    const dayFormatter = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const day = dayFormatter.format(meeting.scheduledStart);
    const time = timeFormatter.format(meeting.scheduledStart);
    dateText = `${day.charAt(0).toUpperCase() + day.slice(1)} a las ${time}`;
  }

  const meetingTypeLabel = meeting.type === 'WEBINAR' ? 'Webinar' : 'Reunión';

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Credenciales de tu ${meetingTypeLabel} - Unity Meet</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Preview Text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Credenciales para tu ${meetingTypeLabel}: ${meeting.title}
  </div>

  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0f0f23;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">

          <!-- Logo Header -->
          <tr>
            <td style="text-align: center; padding-bottom: 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="background: linear-gradient(135deg, #8B5CF6 0%, #F97316 100%); border-radius: 16px; padding: 16px 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <div style="width: 32px; height: 32px; background-color: rgba(255,255,255,0.2); border-radius: 8px; text-align: center; line-height: 32px;">
                            <span style="color: white; font-size: 18px; font-weight: bold;">U</span>
                          </div>
                        </td>
                        <td style="vertical-align: middle; padding-left: 12px;">
                          <span style="color: white; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">Unity Meet</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1a1a2e; border-radius: 24px; overflow: hidden;">

                <!-- Header Banner -->
                <tr>
                  <td style="background: linear-gradient(135deg, #065f46 0%, #047857 100%); padding: 32px 40px;">
                    <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.7); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                      Credenciales de ${meetingTypeLabel}
                    </p>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; line-height: 1.3;">
                      ${meeting.title}
                    </h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">

                    <!-- Greeting -->
                    <p style="margin: 0 0 24px 0; color: #e2e8f0; font-size: 16px; line-height: 1.6;">
                      Hola <strong style="color: #ffffff;">${hostName}</strong>,
                    </p>
                    <p style="margin: 0 0 32px 0; color: #94a3b8; font-size: 16px; line-height: 1.6;">
                      Tu ${meetingTypeLabel.toLowerCase()} ha sido creada exitosamente. Aquí están las credenciales de acceso:
                    </p>

                    <!-- Meeting Link -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #252542; border-radius: 16px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 8px 0; color: #8B5CF6; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Enlace de la Reunión</p>
                          <p style="margin: 0; color: #ffffff; font-size: 14px; word-break: break-all;">
                            <a href="${joinUrl}" style="color: #a78bfa; text-decoration: underline;">${joinUrl}</a>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Date -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #252542; border-radius: 16px; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 8px 0; color: #F97316; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Fecha y Hora</p>
                          <p style="margin: 0; color: #ffffff; font-size: 15px; font-weight: 600;">${dateText}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Passwords Section -->
                    ${hostPassword || participantPassword ? `
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #1e293b; border-radius: 16px; margin-bottom: 24px; border: 2px solid #fbbf24;">
                      <tr>
                        <td style="padding: 24px;">
                          <p style="margin: 0 0 16px 0; color: #fbbf24; font-size: 14px; font-weight: 600;">
                            CREDENCIALES DE ACCESO - GUARDA ESTA INFORMACIÓN
                          </p>

                          ${hostPassword ? `
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 16px;">
                            <tr>
                              <td style="background-color: #252542; border-radius: 12px; padding: 16px;">
                                <p style="margin: 0 0 4px 0; color: #22c55e; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Contraseña de Organizador</p>
                                <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; font-family: monospace; letter-spacing: 2px;">${hostPassword}</p>
                                <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">Usa esta contraseña para entrar como moderador con todos los permisos</p>
                              </td>
                            </tr>
                          </table>
                          ` : ''}

                          ${participantPassword ? `
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 0;">
                            <tr>
                              <td style="background-color: #252542; border-radius: 12px; padding: 16px;">
                                <p style="margin: 0 0 4px 0; color: #3b82f6; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Contraseña de Participantes</p>
                                <p style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700; font-family: monospace; letter-spacing: 2px;">${participantPassword}</p>
                                <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 12px;">Comparte esta contraseña con los participantes que quieras invitar</p>
                              </td>
                            </tr>
                          </table>
                          ` : ''}
                        </td>
                      </tr>
                    </table>
                    ` : ''}

                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
                      <tr>
                        <td style="text-align: center;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                            <tr>
                              <td style="border-radius: 14px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);">
                                <a href="${joinUrl}" style="display: inline-block; padding: 18px 48px; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 14px;">
                                  Iniciar ${meetingTypeLabel}
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px;">
                <strong style="color: #8B5CF6;">Unity Meet</strong> &bull; Unity Financial Network
              </p>
              <p style="margin: 0; color: #475569; font-size: 12px;">
                Este correo fue enviado a ${to}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `;

  // Plain text version
  const textContent = `
Hola ${hostName},

Tu ${meetingTypeLabel.toLowerCase()} "${meeting.title}" ha sido creada exitosamente.

ENLACE DE LA REUNIÓN:
${joinUrl}

FECHA Y HORA:
${dateText}

${hostPassword || participantPassword ? `
CREDENCIALES DE ACCESO:
${hostPassword ? `- Contraseña de Organizador: ${hostPassword} (usa esta para entrar como moderador)` : ''}
${participantPassword ? `- Contraseña de Participantes: ${participantPassword} (comparte esta con los invitados)` : ''}
` : ''}

---
Unity Meet - Unity Financial Network
  `.trim();

  try {
    const result = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: `Credenciales: ${meeting.title}`,
      html: htmlContent,
      text: textContent,
    });

    console.log(`[Email] Meeting credentials sent to ${to}`);
    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Error sending meeting credentials:', error);
    throw error;
  }
}
