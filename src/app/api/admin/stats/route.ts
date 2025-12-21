import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/db/prisma';
import { MeetingStatus } from '@prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Get counts
    const [totalUsers, totalMeetings, totalRecordings, activeMeetings] = await Promise.all([
      prisma.user.count(),
      prisma.meeting.count(),
      prisma.recording.count(),
      prisma.meeting.count({ where: { status: MeetingStatus.LIVE } }),
    ]);

    // Get users by role
    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true },
    });

    // Get recent meetings as activity
    const recentMeetings = await prisma.meeting.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        host: { select: { name: true } },
      },
    });

    const recentActivity = recentMeetings.map((meeting) => ({
      id: meeting.id,
      type: 'meeting',
      description: `${meeting.host.name} creó la reunión "${meeting.title}"`,
      createdAt: meeting.createdAt.toISOString(),
    }));

    return NextResponse.json({
      totalUsers,
      totalMeetings,
      totalRecordings,
      activeMeetings,
      usersByRole: usersByRole.map((item) => ({
        role: item.role,
        count: item._count.role,
      })),
      recentActivity,
    });
  } catch (error) {
    console.error('[Admin Stats] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
