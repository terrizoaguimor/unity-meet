import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/db/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { recordingId } = await params;

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    await prisma.recording.delete({
      where: { id: recordingId },
    });

    // TODO: Also delete from DO Spaces

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Recording Delete] Error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar grabación' },
      { status: 500 }
    );
  }
}
