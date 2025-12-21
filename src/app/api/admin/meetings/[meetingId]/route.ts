import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/db/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Delete related records first
    await prisma.$transaction([
      prisma.pollResponse.deleteMany({
        where: { poll: { meetingId } },
      }),
      prisma.poll.deleteMany({
        where: { meetingId },
      }),
      prisma.question.deleteMany({
        where: { meetingId },
      }),
      prisma.meetingParticipant.deleteMany({
        where: { meetingId },
      }),
      prisma.meetingInvitation.deleteMany({
        where: { meetingId },
      }),
      prisma.waitingRoomEntry.deleteMany({
        where: { meetingId },
      }),
      prisma.recording.deleteMany({
        where: { meetingId },
      }),
      prisma.webinarSettings.deleteMany({
        where: { meetingId },
      }),
      prisma.meeting.delete({
        where: { id: meetingId },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Meeting Delete] Error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar reunión' },
      { status: 500 }
    );
  }
}
