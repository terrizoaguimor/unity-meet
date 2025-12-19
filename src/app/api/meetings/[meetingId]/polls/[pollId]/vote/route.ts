import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getMeetingById } from '@/lib/services/meeting.service';
import prisma from '@/lib/db/prisma';

/**
 * POST /api/meetings/[meetingId]/polls/[pollId]/vote
 * Vote on a poll
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string; pollId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId, pollId } = await params;

    const meeting = await getMeetingById(meetingId);

    if (!meeting) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
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

    if (!poll.isActive) {
      return NextResponse.json(
        { error: 'Esta encuesta ya está cerrada' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { optionIndex, participantId } = body as {
      optionIndex: number;
      participantId?: string; // For guests without session
    };

    if (optionIndex === undefined || optionIndex === null) {
      return NextResponse.json(
        { error: 'Opción requerida' },
        { status: 400 }
      );
    }

    const options = poll.options as string[];
    if (optionIndex < 0 || optionIndex >= options.length) {
      return NextResponse.json(
        { error: 'Opción inválida' },
        { status: 400 }
      );
    }

    // Determine voter identity
    const responderId = session?.user?.id || participantId;

    if (!responderId) {
      return NextResponse.json(
        { error: 'Identificador de participante requerido' },
        { status: 400 }
      );
    }

    // Check if already voted
    const existingVote = await prisma.pollResponse.findFirst({
      where: {
        pollId: poll.id,
        responderId,
      },
    });

    // Use optionIndex as optionId (string representation)
    const optionId = String(optionIndex);

    if (existingVote) {
      // Update vote
      await prisma.pollResponse.update({
        where: { id: existingVote.id },
        data: { optionId },
      });
    } else {
      // Create new vote
      await prisma.pollResponse.create({
        data: {
          pollId: poll.id,
          responderId,
          optionId,
          responderName: session?.user?.name || 'Participante',
        },
      });
    }

    // Get updated results
    const responses = await prisma.pollResponse.findMany({
      where: { pollId: poll.id },
      select: { optionId: true },
    });

    const results = options.map((option, index) => ({
      option,
      votes: responses.filter((r) => r.optionId === String(index)).length,
    }));

    return NextResponse.json({
      success: true,
      message: existingVote ? 'Voto actualizado' : 'Voto registrado',
      totalVotes: responses.length,
      results,
    });
  } catch (error) {
    console.error('[Vote] Error:', error);
    return NextResponse.json(
      { error: 'Error al registrar el voto' },
      { status: 500 }
    );
  }
}
