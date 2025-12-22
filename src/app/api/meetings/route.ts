import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createMeeting, getUserMeetings } from '@/lib/services/meeting.service';
import { sendMeetingInvitation } from '@/lib/services/email.service';
import { MeetingType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Autenticación requerida para crear reuniones' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      title,
      type = 'INSTANT',
      description,
      scheduledStart,
      scheduledEnd,
      maxParticipants,
      enableWaitingRoom,
      enableRecording,
      isPublic = true,
      password,
      webinarSettings,
      invitees = [],
      inviteMessage,
    } = body;

    const meeting = await createMeeting({
      hostId: session.user.id,
      title: title || 'Reunión de Unity Meet',
      type: type as MeetingType,
      description,
      scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
      maxParticipants,
      enableWaitingRoom,
      enableRecording,
      isPublic,
      password,
      webinarSettings,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Send email invitations for scheduled meetings and webinars
    const emailResults: Array<{ email: string; success: boolean; error?: string }> = [];

    if ((type === 'SCHEDULED' || type === 'WEBINAR') && invitees.length > 0 && scheduledStart) {
      console.log(`[Meetings] Sending invitations to ${invitees.length} invitees`);

      for (const email of invitees) {
        try {
          await sendMeetingInvitation({
            to: email,
            recipientName: email.split('@')[0], // Use email prefix as name
            meeting: {
              id: meeting.id,
              title: meeting.title,
              description: meeting.description,
              scheduledStart: new Date(scheduledStart),
              scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
              roomId: meeting.roomId,
              type: meeting.type,
            },
            host: {
              name: session.user.name || null,
              email: session.user.email || '',
            },
            message: inviteMessage,
          });
          emailResults.push({ email, success: true });
          console.log(`[Meetings] Invitation sent to ${email}`);
        } catch (error) {
          console.error(`[Meetings] Failed to send invitation to ${email}:`, error);
          emailResults.push({
            email,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      meeting: {
        ...meeting,
        joinUrl: `${appUrl}/room/${meeting.roomId}`,
      },
      invitations: emailResults.length > 0 ? {
        sent: emailResults.filter(r => r.success).length,
        failed: emailResults.filter(r => !r.success).length,
        results: emailResults,
      } : undefined,
    });
  } catch (error) {
    console.error('[Meetings] Error creating:', error);
    return NextResponse.json(
      { error: 'Error al crear la reunión' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'PENDING' | 'LIVE' | 'ENDED' | 'CANCELLED' | null;
    const type = searchParams.get('type') as 'INSTANT' | 'SCHEDULED' | 'WEBINAR' | null;

    const meetings = await getUserMeetings(session.user.id, {
      status: status || undefined,
      type: type || undefined
    });

    return NextResponse.json({ success: true, meetings });
  } catch (error) {
    console.error('[Meetings] Error listing:', error);
    return NextResponse.json(
      { error: 'Error al obtener reuniones' },
      { status: 500 }
    );
  }
}
