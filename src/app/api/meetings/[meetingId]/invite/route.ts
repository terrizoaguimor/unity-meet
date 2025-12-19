import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getMeetingById } from '@/lib/services/meeting.service';
import { sendMeetingInvitation } from '@/lib/services/email.service';
import prisma from '@/lib/db/prisma';

/**
 * POST /api/meetings/[meetingId]/invite
 * Send meeting invitations via email
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Autenticación requerida' },
        { status: 401 }
      );
    }

    const meeting = await getMeetingById(meetingId);

    if (!meeting) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Only host can send invitations
    if (meeting.hostId !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo el organizador puede enviar invitaciones' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { invitees, message } = body as {
      invitees: Array<{ email: string; name: string }>;
      message?: string;
    };

    if (!invitees || !Array.isArray(invitees) || invitees.length === 0) {
      return NextResponse.json(
        { error: 'Debes incluir al menos un invitado' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const invitee of invitees) {
      if (!invitee.email || !emailRegex.test(invitee.email)) {
        return NextResponse.json(
          { error: `Email inválido: ${invitee.email}` },
          { status: 400 }
        );
      }
      if (!invitee.name || invitee.name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Todos los invitados deben tener nombre' },
          { status: 400 }
        );
      }
    }

    // Limit invitations per request
    if (invitees.length > 50) {
      return NextResponse.json(
        { error: 'Máximo 50 invitaciones por solicitud' },
        { status: 400 }
      );
    }

    const results: Array<{
      email: string;
      success: boolean;
      error?: string;
    }> = [];

    // Send invitations
    for (const invitee of invitees) {
      try {
        // Check if already invited
        const existingInvitation = await prisma.meetingInvitation.findFirst({
          where: {
            meetingId: meeting.id,
            email: invitee.email.toLowerCase(),
          },
        });

        if (existingInvitation) {
          // Update existing invitation
          await prisma.meetingInvitation.update({
            where: { id: existingInvitation.id },
            data: {
              name: invitee.name,
              sentAt: new Date(),
            },
          });
        } else {
          // Create new invitation record
          await prisma.meetingInvitation.create({
            data: {
              meetingId: meeting.id,
              email: invitee.email.toLowerCase(),
              name: invitee.name,
              sentAt: new Date(),
            },
          });
        }

        // Send email
        await sendMeetingInvitation({
          to: invitee.email,
          recipientName: invitee.name,
          meeting: {
            id: meeting.id,
            title: meeting.title,
            description: meeting.description,
            scheduledStart: meeting.scheduledStart || new Date(),
            scheduledEnd: meeting.scheduledEnd,
            roomId: meeting.roomId,
            type: meeting.type,
          },
          host: {
            name: meeting.host.name,
            email: meeting.host.email,
          },
          message,
        });

        results.push({ email: invitee.email, success: true });
      } catch (error) {
        console.error(`[Invite] Error sending to ${invitee.email}:`, error);
        results.push({
          email: invitee.email,
          success: false,
          error: 'Error al enviar la invitación',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `${successCount} invitación${successCount !== 1 ? 'es' : ''} enviada${successCount !== 1 ? 's' : ''}${failedCount > 0 ? `, ${failedCount} fallida${failedCount !== 1 ? 's' : ''}` : ''}`,
      results,
    });
  } catch (error) {
    console.error('[Invite] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar las invitaciones' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/meetings/[meetingId]/invite
 * Get list of invitations for a meeting
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Autenticación requerida' },
        { status: 401 }
      );
    }

    const meeting = await getMeetingById(meetingId);

    if (!meeting) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Only host can see invitations
    if (meeting.hostId !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo el organizador puede ver las invitaciones' },
        { status: 403 }
      );
    }

    const invitations = await prisma.meetingInvitation.findMany({
      where: { meetingId: meeting.id },
      orderBy: { sentAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      invitations,
    });
  } catch (error) {
    console.error('[Invite] Error fetching invitations:', error);
    return NextResponse.json(
      { error: 'Error al obtener las invitaciones' },
      { status: 500 }
    );
  }
}
