import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { S3Client, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT || 'https://nyc3.digitaloceanspaces.com',
  region: process.env.DO_SPACES_REGION || 'nyc3',
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY || '',
  },
  forcePathStyle: false,
});

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || 'meet-by-unity';

/**
 * GET /api/admin/recordings/[recordingId]
 * Get a presigned download URL for a recording (Admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { recordingId } = await params;

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado - Solo administradores pueden descargar' },
        { status: 403 }
      );
    }

    // The recordingId is the full S3 key (e.g., "recordings/filename.mp4")
    const key = decodeURIComponent(recordingId);

    // Verify the object exists
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      }));
    } catch {
      return NextResponse.json(
        { error: 'Grabación no encontrada' },
        { status: 404 }
      );
    }

    const filename = key.split('/').pop() || 'recording.mp4';

    // Generate presigned URL with content-disposition for download
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

    return NextResponse.json({
      success: true,
      downloadUrl,
      filename,
    });
  } catch (error) {
    console.error('[Admin Recording Download] Error:', error);
    return NextResponse.json(
      { error: 'Error al generar URL de descarga' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/recordings/[recordingId]
 * Delete a recording from DO Spaces (Admin only)
 */
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

    // The recordingId is the full S3 key (e.g., "recordings/filename.mp4")
    const key = decodeURIComponent(recordingId);

    // Delete from DO Spaces
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    }));

    console.log(`[Admin Recording Delete] Deleted: ${key}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Recording Delete] Error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar grabación' },
      { status: 500 }
    );
  }
}
