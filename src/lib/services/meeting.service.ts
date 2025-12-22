import prisma from '@/lib/db/prisma';
import { MeetingType, MeetingStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface CreateMeetingParams {
  hostId: string;
  title: string;
  type: MeetingType;
  description?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  maxParticipants?: number;
  enableWaitingRoom?: boolean;
  enableRecording?: boolean;
  isPublic?: boolean;
  password?: string;
  hostPassword?: string;         // Password for host/moderator
  participantPassword?: string;  // Password for participants
  webinarSettings?: {
    enableQA?: boolean;
    enablePolls?: boolean;
    enableChat?: boolean;
    enableHandRaise?: boolean;
    registrationRequired?: boolean;
  };
}

export async function createMeeting(params: CreateMeetingParams) {
  const roomId = `unity-${Date.now().toString(36)}-${uuidv4().slice(0, 8)}`;

  const meeting = await prisma.meeting.create({
    data: {
      roomId,
      title: params.title,
      description: params.description,
      type: params.type,
      hostId: params.hostId,
      scheduledStart: params.scheduledStart,
      scheduledEnd: params.scheduledEnd,
      maxParticipants: params.maxParticipants ?? 50,
      enableWaitingRoom: params.enableWaitingRoom ?? false,
      enableRecording: params.enableRecording ?? false,
      isPublic: params.isPublic ?? true,
      password: params.password,
      hostPassword: params.hostPassword,
      participantPassword: params.participantPassword,
      status: params.type === 'INSTANT' ? 'LIVE' : 'PENDING',
      startedAt: params.type === 'INSTANT' ? new Date() : null,
      webinarSettings: params.type === 'WEBINAR' && params.webinarSettings
        ? { create: params.webinarSettings }
        : undefined,
    },
    include: {
      host: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      webinarSettings: true,
    },
  });

  // Add host as participant
  await prisma.meetingParticipant.create({
    data: {
      meetingId: meeting.id,
      userId: params.hostId,
      role: 'HOST',
    },
  });

  return meeting;
}

export async function getMeetingByRoomId(roomId: string) {
  return prisma.meeting.findUnique({
    where: { roomId },
    include: {
      host: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      webinarSettings: true,
      _count: {
        select: { participants: true },
      },
    },
  });
}

export async function getMeetingById(id: string) {
  return prisma.meeting.findUnique({
    where: { id },
    include: {
      host: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      webinarSettings: true,
      _count: {
        select: { participants: true },
      },
    },
  });
}

export async function getUserMeetings(userId: string, options?: {
  status?: MeetingStatus;
  type?: MeetingType;
  limit?: number;
  offset?: number;
}) {
  return prisma.meeting.findMany({
    where: {
      OR: [
        { hostId: userId },
        { participants: { some: { userId } } },
      ],
      status: options?.status,
      type: options?.type,
    },
    include: {
      host: {
        select: { id: true, name: true, avatar: true },
      },
      _count: {
        select: { participants: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 20,
    skip: options?.offset ?? 0,
  });
}

export async function startMeeting(meetingId: string) {
  return prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: 'LIVE',
      startedAt: new Date(),
    },
  });
}

export async function endMeeting(meetingId: string) {
  return prisma.meeting.update({
    where: { id: meetingId },
    data: {
      status: 'ENDED',
      endedAt: new Date(),
    },
  });
}

export async function addParticipant(
  meetingId: string,
  data: { userId?: string; guestName?: string; guestEmail?: string; role?: 'PARTICIPANT' | 'VIEWER' }
) {
  return prisma.meetingParticipant.create({
    data: {
      meetingId,
      userId: data.userId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      role: data.role ?? 'PARTICIPANT',
      joinedAt: new Date(),
    },
  });
}

export async function updateParticipantLeft(meetingId: string, participantIdentifier: { userId?: string; guestEmail?: string }) {
  const leftAt = new Date();

  if (participantIdentifier.userId) {
    const participant = await prisma.meetingParticipant.findFirst({
      where: { meetingId, userId: participantIdentifier.userId },
    });

    if (participant && participant.joinedAt) {
      const duration = Math.floor((leftAt.getTime() - participant.joinedAt.getTime()) / 1000);
      await prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: { leftAt, duration },
      });
    }
  } else if (participantIdentifier.guestEmail) {
    const participant = await prisma.meetingParticipant.findFirst({
      where: { meetingId, guestEmail: participantIdentifier.guestEmail },
    });

    if (participant && participant.joinedAt) {
      const duration = Math.floor((leftAt.getTime() - participant.joinedAt.getTime()) / 1000);
      await prisma.meetingParticipant.update({
        where: { id: participant.id },
        data: { leftAt, duration },
      });
    }
  }
}
