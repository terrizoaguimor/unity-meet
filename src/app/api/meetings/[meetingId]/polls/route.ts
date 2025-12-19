import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getMeetingById } from '@/lib/services/meeting.service';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/meetings/[meetingId]/polls
 * Get all polls for a meeting
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const { meetingId } = await params;

    const meeting = await getMeetingById(meetingId);

    if (!meeting) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    const polls = await prisma.poll.findMany({
      where: { meetingId: meeting.id },
      include: {
        responses: {
          select: {
            optionId: true,
          },
        },
        _count: {
          select: { responses: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate results for each poll
    const pollsWithResults = polls.map((poll) => {
      const options = poll.options as string[];
      const results = options.map((option, index) => ({
        option,
        votes: poll.responses.filter((r) => r.optionId === String(index)).length,
      }));

      return {
        id: poll.id,
        question: poll.question,
        options,
        isActive: poll.isActive,
        createdAt: poll.createdAt,
        totalVotes: poll._count.responses,
        results: poll.isActive ? undefined : results, // Only show results if poll is closed
      };
    });

    return NextResponse.json({
      success: true,
      polls: pollsWithResults,
    });
  } catch (error) {
    console.error('[Polls] Error fetching polls:', error);
    return NextResponse.json(
      { error: 'Error al obtener las encuestas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meetings/[meetingId]/polls
 * Create a new poll (host only)
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

    // Only host can create polls
    if (meeting.hostId !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo el organizador puede crear encuestas' },
        { status: 403 }
      );
    }

    // Check if meeting is a webinar with polls enabled
    if (meeting.type !== 'WEBINAR') {
      return NextResponse.json(
        { error: 'Las encuestas solo están disponibles en webinars' },
        { status: 400 }
      );
    }

    if (meeting.webinarSettings && !meeting.webinarSettings.enablePolls) {
      return NextResponse.json(
        { error: 'Las encuestas están deshabilitadas para este webinar' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { question, options } = body as {
      question: string;
      options: string[];
    };

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'La pregunta es requerida' },
        { status: 400 }
      );
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { error: 'Se requieren al menos 2 opciones' },
        { status: 400 }
      );
    }

    if (options.length > 10) {
      return NextResponse.json(
        { error: 'Máximo 10 opciones permitidas' },
        { status: 400 }
      );
    }

    // Close any active polls first
    await prisma.poll.updateMany({
      where: {
        meetingId: meeting.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const poll = await prisma.poll.create({
      data: {
        meetingId: meeting.id,
        question: question.trim(),
        options: options.map((o) => o.trim()),
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      poll: {
        id: poll.id,
        question: poll.question,
        options: poll.options,
        isActive: poll.isActive,
        createdAt: poll.createdAt,
      },
    });
  } catch (error) {
    console.error('[Polls] Error creating poll:', error);
    return NextResponse.json(
      { error: 'Error al crear la encuesta' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meetings/[meetingId]/polls
 * Close active poll (host only)
 */
export async function PATCH(
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

    if (meeting.hostId !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo el organizador puede cerrar encuestas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { pollId, action } = body as {
      pollId: string;
      action: 'close' | 'reopen';
    };

    if (!pollId) {
      return NextResponse.json(
        { error: 'ID de encuesta requerido' },
        { status: 400 }
      );
    }

    const poll = await prisma.poll.findFirst({
      where: {
        id: pollId,
        meetingId: meeting.id,
      },
    });

    if (!poll) {
      return NextResponse.json(
        { error: 'Encuesta no encontrada' },
        { status: 404 }
      );
    }

    if (action === 'reopen') {
      // Close other active polls first
      await prisma.poll.updateMany({
        where: {
          meetingId: meeting.id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    }

    const updatedPoll = await prisma.poll.update({
      where: { id: pollId },
      data: {
        isActive: action === 'reopen',
      },
      include: {
        responses: {
          select: { optionId: true },
        },
      },
    });

    // Calculate results
    const options = updatedPoll.options as string[];
    const results = options.map((option, index) => ({
      option,
      votes: updatedPoll.responses.filter((r) => r.optionId === String(index)).length,
    }));

    return NextResponse.json({
      success: true,
      poll: {
        id: updatedPoll.id,
        question: updatedPoll.question,
        options: updatedPoll.options,
        isActive: updatedPoll.isActive,
        totalVotes: updatedPoll.responses.length,
        results,
      },
    });
  } catch (error) {
    console.error('[Polls] Error updating poll:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la encuesta' },
      { status: 500 }
    );
  }
}
