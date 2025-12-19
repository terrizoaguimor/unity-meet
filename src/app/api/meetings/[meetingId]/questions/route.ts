import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getMeetingById } from '@/lib/services/meeting.service';
import prisma from '@/lib/db/prisma';

/**
 * GET /api/meetings/[meetingId]/questions
 * Get all questions for a meeting (Q&A)
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

    const questions = await prisma.question.findMany({
      where: { meetingId: meeting.id },
      orderBy: [
        { isAnswered: 'asc' },
        { upvotes: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('[Questions] Error fetching:', error);
    return NextResponse.json(
      { error: 'Error al obtener las preguntas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/meetings/[meetingId]/questions
 * Submit a question
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;

    const meeting = await getMeetingById(meetingId);

    if (!meeting) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    // Check if Q&A is enabled for webinars
    if (meeting.type === 'WEBINAR' && meeting.webinarSettings && !meeting.webinarSettings.enableQA) {
      return NextResponse.json(
        { error: 'Las preguntas están deshabilitadas para este webinar' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { content, askerName, isAnonymous } = body as {
      content: string;
      askerName?: string;
      isAnonymous?: boolean;
    };

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'La pregunta es requerida' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'La pregunta no puede exceder 500 caracteres' },
        { status: 400 }
      );
    }

    // Determine asker info
    const finalAskerName = isAnonymous
      ? 'Anónimo'
      : session?.user?.name || askerName || 'Participante';

    const question = await prisma.question.create({
      data: {
        meetingId: meeting.id,
        content: content.trim(),
        askerName: finalAskerName,
        askerId: session?.user?.id || null,
        isAnonymous: isAnonymous || false,
      },
    });

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error('[Questions] Error creating:', error);
    return NextResponse.json(
      { error: 'Error al enviar la pregunta' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meetings/[meetingId]/questions
 * Update a question (answer, upvote, dismiss)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { meetingId } = await params;

    const meeting = await getMeetingById(meetingId);

    if (!meeting) {
      return NextResponse.json(
        { error: 'Reunión no encontrada' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { questionId, action } = body as {
      questionId: string;
      action: 'answer' | 'upvote';
    };

    if (!questionId) {
      return NextResponse.json(
        { error: 'ID de pregunta requerido' },
        { status: 400 }
      );
    }

    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        meetingId: meeting.id,
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Pregunta no encontrada' },
        { status: 404 }
      );
    }

    let updatedQuestion;

    switch (action) {
      case 'answer':
        // Only host can answer
        if (meeting.hostId !== session?.user?.id) {
          return NextResponse.json(
            { error: 'Solo el organizador puede responder preguntas' },
            { status: 403 }
          );
        }

        updatedQuestion = await prisma.question.update({
          where: { id: questionId },
          data: {
            isAnswered: true,
            answeredAt: new Date(),
          },
        });
        break;

      case 'upvote':
        updatedQuestion = await prisma.question.update({
          where: { id: questionId },
          data: {
            upvotes: { increment: 1 },
          },
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Acción inválida' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error) {
    console.error('[Questions] Error updating:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la pregunta' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meetings/[meetingId]/questions
 * Delete a question (host only)
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

    // Only host can delete questions
    if (meeting.hostId !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo el organizador puede eliminar preguntas' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');

    if (!questionId) {
      return NextResponse.json(
        { error: 'ID de pregunta requerido' },
        { status: 400 }
      );
    }

    await prisma.question.delete({
      where: { id: questionId },
    });

    return NextResponse.json({
      success: true,
      message: 'Pregunta eliminada',
    });
  } catch (error) {
    console.error('[Questions] Error deleting:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la pregunta' },
      { status: 500 }
    );
  }
}
