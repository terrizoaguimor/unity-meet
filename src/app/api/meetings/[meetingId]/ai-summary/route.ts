import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import {
  generateMeetingSummary,
  extractActionItems,
  generateMeetingInsights,
  generateFollowUpEmail,
  type TranscriptSegment,
} from '@/lib/services/ai.service';
import { sendMeetingSummaryEmail } from '@/lib/services/email.service';

/**
 * GET /api/meetings/[meetingId]/ai-summary
 * Get the AI-generated summary for a meeting
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;

    // Find meeting
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [{ id: meetingId }, { roomId: meetingId }],
      },
      include: {
        host: { select: { id: true, name: true, email: true } },
        aiSummary: true,
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Check access
    if (!meeting.isPublic && session?.user?.id !== meeting.hostId) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta reunión' },
        { status: 403 }
      );
    }

    if (!meeting.aiSummary) {
      return NextResponse.json(
        { success: false, error: 'No hay resumen disponible para esta reunión' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      summary: meeting.aiSummary,
    });
  } catch (error) {
    console.error('[AI Summary] Error getting summary:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener el resumen' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meetings/[meetingId]/ai-summary
 * Generate AI summary for a meeting
 *
 * Body: {
 *   transcript: string | TranscriptSegment[],
 *   sendEmail?: boolean (default: true)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;
    const body = await request.json();
    const { transcript, sendEmail = true } = body;

    if (!transcript) {
      return NextResponse.json(
        { success: false, error: 'Se requiere el transcript de la reunión' },
        { status: 400 }
      );
    }

    // Find meeting
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [{ id: meetingId }, { roomId: meetingId }],
      },
      include: {
        host: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Only host can generate summary
    if (session?.user?.id !== meeting.hostId) {
      return NextResponse.json(
        { success: false, error: 'Solo el host puede generar el resumen' },
        { status: 403 }
      );
    }

    // Check if already exists
    const existingSummary = await prisma.meetingSummary.findUnique({
      where: { meetingId: meeting.id },
    });

    if (existingSummary?.status === 'COMPLETED' || existingSummary?.status === 'EMAIL_SENT') {
      return NextResponse.json({
        success: true,
        message: 'El resumen ya fue generado',
        summary: existingSummary,
      });
    }

    // Create or update summary record
    const summaryRecord = await prisma.meetingSummary.upsert({
      where: { meetingId: meeting.id },
      create: {
        meetingId: meeting.id,
        transcript: typeof transcript === 'string' ? transcript : null,
        transcriptJson: typeof transcript === 'object' ? transcript : null,
        status: 'PROCESSING',
      },
      update: {
        transcript: typeof transcript === 'string' ? transcript : null,
        transcriptJson: typeof transcript === 'object' ? transcript : null,
        status: 'PROCESSING',
        errorMessage: null,
      },
    });

    console.log(`[AI Summary] Starting generation for meeting ${meeting.id}`);

    try {
      // Calculate duration
      const durationSeconds = meeting.startedAt && meeting.endedAt
        ? Math.round((meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 1000)
        : undefined;

      // Generate AI content in parallel
      const [summary, actionItems, insights] = await Promise.all([
        generateMeetingSummary(transcript as string | TranscriptSegment[], meeting.title, durationSeconds),
        extractActionItems(transcript as string | TranscriptSegment[]),
        generateMeetingInsights(transcript as string | TranscriptSegment[], durationSeconds),
      ]);

      // Generate follow-up email content
      const followUpEmail = await generateFollowUpEmail(summary, actionItems, 'internal');

      // Update summary record with AI-generated content
      const updatedSummary = await prisma.meetingSummary.update({
        where: { id: summaryRecord.id },
        data: {
          title: summary.title,
          summary: summary.summary,
          keyPoints: JSON.parse(JSON.stringify(summary.keyPoints)),
          language: summary.language,
          topics: JSON.parse(JSON.stringify(insights.topics)),
          sentiment: insights.sentiment,
          participation: JSON.parse(JSON.stringify(insights.participationBalance)),
          suggestions: JSON.parse(JSON.stringify(insights.suggestions)),
          actionItems: JSON.parse(JSON.stringify(actionItems)),
          followUpEmail: JSON.parse(JSON.stringify(followUpEmail)),
          status: 'COMPLETED',
          generatedAt: new Date(),
        },
      });

      console.log(`[AI Summary] Generated successfully for meeting ${meeting.id}`);

      // Send email to all participants if requested
      let emailResult = null;
      if (sendEmail) {
        // Collect all participant emails
        const recipients: Array<{ email: string; name: string }> = [];

        // Add host
        if (meeting.host.email) {
          recipients.push({
            email: meeting.host.email,
            name: meeting.host.name || 'Host',
          });
        }

        // Add authenticated participants
        for (const p of meeting.participants) {
          if (p.user?.email && p.user.email !== meeting.host.email) {
            recipients.push({
              email: p.user.email,
              name: p.user.name || 'Participante',
            });
          } else if (p.guestEmail && p.guestEmail !== meeting.host.email) {
            recipients.push({
              email: p.guestEmail,
              name: p.guestName || 'Invitado',
            });
          }
        }

        if (recipients.length > 0 && meeting.startedAt && meeting.endedAt) {
          emailResult = await sendMeetingSummaryEmail({
            recipients,
            meeting: {
              id: meeting.id,
              title: meeting.title,
              roomId: meeting.roomId,
              startedAt: meeting.startedAt,
              endedAt: meeting.endedAt,
              duration: durationSeconds || 0,
            },
            host: {
              name: meeting.host.name,
              email: meeting.host.email,
            },
            summary,
            actionItems,
            insights,
          });

          if (emailResult.success) {
            await prisma.meetingSummary.update({
              where: { id: summaryRecord.id },
              data: {
                status: 'EMAIL_SENT',
                emailSentAt: new Date(),
              },
            });

            console.log(`[AI Summary] Emails sent to ${emailResult.sentCount} recipients`);
          }
        }
      }

      return NextResponse.json({
        success: true,
        summary: {
          ...updatedSummary,
          parsedSummary: summary,
          parsedActionItems: actionItems,
          parsedInsights: insights,
        },
        emailResult,
      });
    } catch (aiError) {
      console.error('[AI Summary] AI generation failed:', aiError);

      await prisma.meetingSummary.update({
        where: { id: summaryRecord.id },
        data: {
          status: 'FAILED',
          errorMessage: aiError instanceof Error ? aiError.message : 'Error generating AI summary',
        },
      });

      return NextResponse.json(
        { success: false, error: 'Error generando el resumen con IA' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[AI Summary] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error procesando la solicitud' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meetings/[meetingId]/ai-summary
 * Resend the AI summary email
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;
    const body = await request.json();
    const { action, additionalEmails = [] } = body;

    if (action !== 'resend') {
      return NextResponse.json(
        { success: false, error: 'Acción no válida' },
        { status: 400 }
      );
    }

    // Find meeting with summary
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [{ id: meetingId }, { roomId: meetingId }],
      },
      include: {
        host: { select: { id: true, name: true, email: true } },
        participants: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
        aiSummary: true,
      },
    });

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    if (session?.user?.id !== meeting.hostId) {
      return NextResponse.json(
        { success: false, error: 'Solo el host puede reenviar el resumen' },
        { status: 403 }
      );
    }

    if (!meeting.aiSummary || meeting.aiSummary.status === 'PENDING' || meeting.aiSummary.status === 'PROCESSING') {
      return NextResponse.json(
        { success: false, error: 'No hay resumen disponible para reenviar' },
        { status: 400 }
      );
    }

    // Collect recipients
    const recipients: Array<{ email: string; name: string }> = [];

    // Add additional emails
    for (const email of additionalEmails) {
      if (email && typeof email === 'string') {
        recipients.push({ email, name: 'Invitado' });
      }
    }

    // If no additional emails, send to all participants
    if (recipients.length === 0) {
      if (meeting.host.email) {
        recipients.push({
          email: meeting.host.email,
          name: meeting.host.name || 'Host',
        });
      }
      for (const p of meeting.participants) {
        if (p.user?.email && p.user.email !== meeting.host.email) {
          recipients.push({
            email: p.user.email,
            name: p.user.name || 'Participante',
          });
        } else if (p.guestEmail && p.guestEmail !== meeting.host.email) {
          recipients.push({
            email: p.guestEmail,
            name: p.guestName || 'Invitado',
          });
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay destinatarios para enviar el resumen' },
        { status: 400 }
      );
    }

    if (!meeting.startedAt || !meeting.endedAt) {
      return NextResponse.json(
        { success: false, error: 'Datos de la reunión incompletos' },
        { status: 400 }
      );
    }

    const durationSeconds = Math.round(
      (meeting.endedAt.getTime() - meeting.startedAt.getTime()) / 1000
    );

    const emailResult = await sendMeetingSummaryEmail({
      recipients,
      meeting: {
        id: meeting.id,
        title: meeting.title,
        roomId: meeting.roomId,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        duration: durationSeconds,
      },
      host: {
        name: meeting.host.name,
        email: meeting.host.email,
      },
      summary: {
        title: meeting.aiSummary.title || meeting.title,
        summary: meeting.aiSummary.summary || '',
        keyPoints: (meeting.aiSummary.keyPoints as string[]) || [],
        participants: [],
        duration: `${Math.round(durationSeconds / 60)} minutos`,
        language: meeting.aiSummary.language,
      },
      actionItems: (meeting.aiSummary.actionItems as Array<{
        task: string;
        assignee: string | null;
        dueDate: string | null;
        priority: 'high' | 'medium' | 'low';
        context: string;
      }>) || [],
      insights: {
        topics: (meeting.aiSummary.topics as Array<{
          name: string;
          duration: string;
          percentage: number;
        }>) || [],
        sentiment: (meeting.aiSummary.sentiment as 'positive' | 'neutral' | 'negative') || 'neutral',
        participationBalance: (meeting.aiSummary.participation as Array<{
          participant: string;
          speakingTime: string;
          percentage: number;
        }>) || [],
        suggestions: (meeting.aiSummary.suggestions as string[]) || [],
      },
    });

    return NextResponse.json({
      success: true,
      emailResult,
    });
  } catch (error) {
    console.error('[AI Summary] Error resending:', error);
    return NextResponse.json(
      { success: false, error: 'Error reenviando el resumen' },
      { status: 500 }
    );
  }
}
