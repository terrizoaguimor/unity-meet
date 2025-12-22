import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '@/lib/db/prisma';

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION || 'nyc3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY || '',
  },
  forcePathStyle: false,
});

/**
 * GET /api/recordings/[recordingId]/url
 * Generate a signed URL for a recording (valid for 1 hour)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { recordingId } = await params;

    // Get recording from database
    const recording = await prisma.recording.findUnique({
      where: { id: recordingId },
      include: {
        meeting: {
          select: {
            hostId: true,
            participants: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!recording) {
      return NextResponse.json(
        { success: false, error: 'Grabación no encontrada' },
        { status: 404 }
      );
    }

    // Check access: user must be host or participant
    const isHost = recording.meeting?.hostId === session.user.id;
    const isParticipant = recording.meeting?.participants.some(
      p => p.userId === session.user.id
    );
    const isAdmin = session.user.role === 'ADMIN';

    if (!isHost && !isParticipant && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta grabación' },
        { status: 403 }
      );
    }

    // Extract the S3 key from the URL
    // URL format: https://bucket.region.digitaloceanspaces.com/path/to/file
    // or: https://region.digitaloceanspaces.com/bucket/path/to/file
    const url = new URL(recording.url);
    let storageKey = url.pathname;

    // Remove leading slash and bucket name if present in path
    if (storageKey.startsWith('/')) {
      storageKey = storageKey.slice(1);
    }
    const bucket = process.env.DO_SPACES_BUCKET || 'meet-by-unity';
    if (storageKey.startsWith(`${bucket}/`)) {
      storageKey = storageKey.slice(bucket.length + 1);
    }

    // Generate signed URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: storageKey,
    });

    const signedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return NextResponse.json({
      success: true,
      url: signedUrl,
      expiresIn: 3600,
      recording: {
        id: recording.id,
        filename: recording.filename,
        duration: recording.duration,
        size: recording.size,
      }
    });
  } catch (error) {
    console.error('[Recordings] Error generating signed URL:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar URL' },
      { status: 500 }
    );
  }
}
