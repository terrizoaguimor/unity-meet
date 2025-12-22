import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Secret token for cron authentication (set in environment)
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/cron/cleanup-meetings
 * Clean up stale meetings that have been LIVE for too long without activity
 *
 * This endpoint can be called by:
 * 1. DigitalOcean App Platform scheduled jobs
 * 2. External cron services (Vercel Cron, GitHub Actions, etc.)
 *
 * Requires CRON_SECRET header for authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret if configured
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');

      if (providedSecret !== CRON_SECRET) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Find meetings that are LIVE but older than 4 hours (likely abandoned)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    // End stale LIVE meetings
    const staleInstantMeetings = await prisma.meeting.updateMany({
      where: {
        status: 'LIVE',
        type: 'INSTANT',
        startedAt: { lt: fourHoursAgo },
      },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });

    // End scheduled meetings that are past their end time
    const now = new Date();
    const staleScheduledMeetings = await prisma.meeting.updateMany({
      where: {
        status: 'LIVE',
        type: 'SCHEDULED',
        scheduledEnd: { lt: now },
      },
      data: {
        status: 'ENDED',
        endedAt: now,
      },
    });

    // Cancel PENDING meetings that were scheduled more than 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldPendingMeetings = await prisma.meeting.updateMany({
      where: {
        status: 'PENDING',
        scheduledStart: { lt: twentyFourHoursAgo },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // Optionally delete very old ended meetings (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // First delete related records
    const meetingsToDelete = await prisma.meeting.findMany({
      where: {
        status: { in: ['ENDED', 'CANCELLED'] },
        updatedAt: { lt: thirtyDaysAgo },
        // Only delete meetings without recordings (to preserve recording history)
        recordings: { none: {} },
      },
      select: { id: true },
    });

    const meetingIds = meetingsToDelete.map(m => m.id);

    if (meetingIds.length > 0) {
      // Delete related records first
      await prisma.meetingParticipant.deleteMany({
        where: { meetingId: { in: meetingIds } },
      });

      await prisma.meetingInvitation.deleteMany({
        where: { meetingId: { in: meetingIds } },
      });

      await prisma.poll.deleteMany({
        where: { meetingId: { in: meetingIds } },
      });

      await prisma.question.deleteMany({
        where: { meetingId: { in: meetingIds } },
      });

      // Delete the meetings
      await prisma.meeting.deleteMany({
        where: { id: { in: meetingIds } },
      });
    }

    const result = {
      success: true,
      cleaned: {
        staleInstantMeetings: staleInstantMeetings.count,
        staleScheduledMeetings: staleScheduledMeetings.count,
        oldPendingMeetings: oldPendingMeetings.count,
        deletedOldMeetings: meetingIds.length,
      },
      timestamp: new Date().toISOString(),
    };

    console.log('[Cleanup] Meeting cleanup completed:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Cleanup] Error cleaning up meetings:', error);
    return NextResponse.json(
      { success: false, error: 'Error during cleanup' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/cleanup-meetings
 * Get status and stats about meetings that need cleanup
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    if (CRON_SECRET) {
      const authHeader = request.headers.get('authorization');
      const providedSecret = authHeader?.replace('Bearer ', '');

      if (providedSecret !== CRON_SECRET) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [staleLive, staleScheduled, pendingExpired, oldEnded] = await Promise.all([
      prisma.meeting.count({
        where: {
          status: 'LIVE',
          type: 'INSTANT',
          startedAt: { lt: fourHoursAgo },
        },
      }),
      prisma.meeting.count({
        where: {
          status: 'LIVE',
          type: 'SCHEDULED',
          scheduledEnd: { lt: now },
        },
      }),
      prisma.meeting.count({
        where: {
          status: 'PENDING',
          scheduledStart: { lt: twentyFourHoursAgo },
        },
      }),
      prisma.meeting.count({
        where: {
          status: { in: ['ENDED', 'CANCELLED'] },
          updatedAt: { lt: thirtyDaysAgo },
          recordings: { none: {} },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        staleLiveMeetings: staleLive,
        staleScheduledMeetings: staleScheduled,
        pendingExpiredMeetings: pendingExpired,
        oldEndedMeetings: oldEnded,
        totalToClean: staleLive + staleScheduled + pendingExpired + oldEnded,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cleanup] Error getting cleanup stats:', error);
    return NextResponse.json(
      { success: false, error: 'Error getting stats' },
      { status: 500 }
    );
  }
}
