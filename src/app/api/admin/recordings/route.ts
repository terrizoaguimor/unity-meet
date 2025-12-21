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

    const recordings = await prisma.recording.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
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
      recordings: recordings.map((r) => ({
        id: r.id,
        filename: r.filename,
        url: r.url,
        duration: r.duration,
        size: r.size.toString(),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        user: r.user,
        meeting: r.meeting,
      })),
    });
  } catch (error) {
    console.error('[Admin Recordings] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener grabaciones' },
      { status: 500 }
    );
  }
}
