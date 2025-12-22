import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getMeetingById, endMeeting, getMeetingByRoomId } from '@/lib/services/meeting.service';

/**
 * GET /api/meetings/[meetingId]
 * Get a meeting by ID or roomId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;

    // Try to find by ID first, then by roomId
    let meeting = await getMeetingById(meetingId);
    if (!meeting) {
      meeting = await getMeetingByRoomId(meetingId);
    }

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Check access for private meetings
    if (!meeting.isPublic && session?.user?.id !== meeting.hostId) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta reunión' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      meeting,
    });
  } catch (error) {
    console.error('[Meetings] Error getting meeting:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la reunión' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meetings/[meetingId]
 * Update meeting status (e.g., end a meeting)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;
    const body = await request.json();
    const { action } = body;

    // Try to find by ID first, then by roomId
    let meeting = await getMeetingById(meetingId);
    if (!meeting) {
      meeting = await getMeetingByRoomId(meetingId);
    }

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Only host or admin can update meeting
    const isHost = session?.user?.id === meeting.hostId;
    const isAdmin = session?.user?.role === 'ADMIN';

    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Solo el host puede modificar esta reunión' },
        { status: 403 }
      );
    }

    if (action === 'end') {
      const updatedMeeting = await endMeeting(meeting.id);
      return NextResponse.json({
        success: true,
        meeting: updatedMeeting,
        message: 'Reunión terminada',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Acción no válida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Meetings] Error updating meeting:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar la reunión' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meetings/[meetingId]
 * Delete/cancel a meeting
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Try to find by ID first, then by roomId
    let meeting = await getMeetingById(meetingId);
    if (!meeting) {
      meeting = await getMeetingByRoomId(meetingId);
    }

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Only host or admin can delete meeting
    const isHost = session.user.id === meeting.hostId;
    const isAdmin = session.user.role === 'ADMIN';

    if (!isHost && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Solo el host puede eliminar esta reunión' },
        { status: 403 }
      );
    }

    // Import prisma here to avoid circular dependencies
    const { prisma } = await import('@/lib/db/prisma');

    // Delete related records first
    await prisma.meetingParticipant.deleteMany({
      where: { meetingId: meeting.id },
    });

    await prisma.meetingInvitation.deleteMany({
      where: { meetingId: meeting.id },
    });

    // Delete the meeting
    await prisma.meeting.delete({
      where: { id: meeting.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Reunión eliminada',
    });
  } catch (error) {
    console.error('[Meetings] Error deleting meeting:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar la reunión' },
      { status: 500 }
    );
  }
}
