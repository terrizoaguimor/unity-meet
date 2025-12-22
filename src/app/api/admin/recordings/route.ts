import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // List recordings from DO Spaces
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'recordings/',
    });

    const response = await s3Client.send(command);
    const objects = response.Contents || [];

    // Generate presigned URLs for each recording (valid for 1 hour)
    const recordings = await Promise.all(
      objects
        .filter((obj) => obj.Key && (obj.Key.endsWith('.mp4') || obj.Key.endsWith('.webm')))
        .map(async (obj) => {
          const key = obj.Key!;
          const filename = key.split('/').pop() || key;

          // Generate presigned URL for streaming (1 hour validity)
          const getCommand = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
          });
          const streamUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

          // Extract room ID and timestamp from filename
          // Format: roomId_timestamp.mp4 or similar
          const parts = filename.replace(/\.(mp4|webm)$/, '').split('_');
          const roomId = parts[0] || 'unknown';

          return {
            id: key,
            key: key,
            filename: filename,
            streamUrl: streamUrl,
            size: obj.Size?.toString() || '0',
            createdAt: obj.LastModified?.toISOString() || new Date().toISOString(),
            roomId: roomId,
          };
        })
    );

    // Sort by date (newest first)
    recordings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      recordings,
      total: recordings.length,
    });
  } catch (error) {
    console.error('[Admin Recordings] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener grabaciones' },
      { status: 500 }
    );
  }
}
