import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/db/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const meetings = await prisma.meeting.findMany({
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            participants: true,
            recordings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      meetings: meetings.map((m) => ({
        id: m.id,
        title: m.title,
        roomId: m.roomId,
        type: m.type,
        status: m.status,
        isPublic: m.isPublic,
        scheduledAt: m.scheduledStart?.toISOString() || null,
        startedAt: m.startedAt?.toISOString() || null,
        endedAt: m.endedAt?.toISOString() || null,
        createdAt: m.createdAt.toISOString(),
        host: m.host,
        _count: m._count,
      })),
    });
  } catch (error) {
    console.error('[Admin Meetings] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener reuniones' },
      { status: 500 }
    );
  }
}
