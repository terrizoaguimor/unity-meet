import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getMeetingByRoomId } from '@/lib/services/meeting.service';
import prisma from '@/lib/db/prisma';

/**
 * POST /api/recordings
 * Guardar metadata de una grabación
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Autenticación requerida' },
        { status: 401 }
      );
    }

    const { roomId, filename, url, duration, size } = await request.json();

    if (!roomId || !filename || !url) {
      return NextResponse.json(
        { error: 'roomId, filename y url son requeridos' },
        { status: 400 }
      );
    }

    // Find the meeting
    const meeting = await getMeetingByRoomId(roomId);

    if (!meeting) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Only host can save recordings
    if (meeting.hostId !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo el organizador puede guardar grabaciones' },
        { status: 403 }
      );
    }

    const recording = await prisma.recording.create({
      data: {
        meetingId: meeting.id,
        userId: session.user.id,
        filename,
        url,
        duration: duration || 0,
        size: BigInt(size || 0),
        status: 'READY',
      },
    });

    console.log('[Recordings] Saved recording:', recording.id);

    return NextResponse.json({
      success: true,
      recording: {
        id: recording.id,
        filename: recording.filename,
        url: recording.url,
        duration: recording.duration,
        size: recording.size.toString(), // BigInt to string for JSON
        createdAt: recording.createdAt,
      },
    });
  } catch (error) {
    console.error('[Recordings] Error saving:', error);
    return NextResponse.json(
      { error: 'Error al guardar la grabación' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/recordings
 * Listar grabaciones del usuario autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Autenticación requerida' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const meetingId = searchParams.get('meetingId');

    const whereClause: {
      userId: string;
      meetingId?: string;
    } = {
      userId: session.user.id,
    };

    // Filter by meetingId if provided
    if (meetingId) {
      whereClause.meetingId = meetingId;
    } else if (roomId) {
      // Find meeting by roomId and filter by that
      const meeting = await getMeetingByRoomId(roomId);
      if (meeting) {
        whereClause.meetingId = meeting.id;
      }
    }

    const recordings = await prisma.recording.findMany({
      where: whereClause,
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            roomId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      recordings: recordings.map((r) => ({
        id: r.id,
        filename: r.filename,
        url: r.url,
        duration: r.duration,
        size: r.size.toString(), // BigInt to string for JSON
        status: r.status,
        createdAt: r.createdAt,
        meeting: r.meeting,
      })),
    });
  } catch (error) {
    console.error('[Recordings] Error listing:', error);
    return NextResponse.json(
      { error: 'Error al listar las grabaciones' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recordings
 * Eliminar una grabación
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Autenticación requerida' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get('id');

    if (!recordingId) {
      return NextResponse.json(
        { error: 'ID de grabación requerido' },
        { status: 400 }
      );
    }

    // Find the recording
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      return NextResponse.json(
        { error: 'Grabación no encontrada' },
        { status: 404 }
      );
    }

    // Only owner can delete
    if (recording.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta grabación' },
        { status: 403 }
      );
    }

    // Delete from database
    await prisma.recording.delete({
      where: { id: recordingId },
    });

    // TODO: Also delete from DO Spaces

    return NextResponse.json({
      success: true,
      message: 'Grabación eliminada',
    });
  } catch (error) {
    console.error('[Recordings] Error deleting:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la grabación' },
      { status: 500 }
    );
  }
}
