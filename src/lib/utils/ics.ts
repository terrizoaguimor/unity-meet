/**
 * ICS (iCalendar) file generator for meeting invitations
 * Creates .ics files that can be imported into Google Calendar, Outlook, Apple Calendar, etc.
 */

export interface ICSEvent {
  title: string;
  description?: string;
  location?: string;
  url?: string;
  startTime: Date;
  endTime: Date;
  organizer: {
    name: string;
    email: string;
  };
  attendees?: Array<{
    name: string;
    email: string;
    rsvp?: boolean;
  }>;
  uid?: string;
  reminder?: number; // minutes before event
}

/**
 * Format a date to ICS format (YYYYMMDDTHHMMSSZ)
 */
function formatDateToICS(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape special characters for ICS format
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Fold lines that exceed 75 characters (ICS spec requirement)
 */
function foldLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) {
    return line;
  }

  const result: string[] = [];
  let currentLine = '';

  for (let i = 0; i < line.length; i++) {
    currentLine += line[i];
    if (currentLine.length >= maxLength) {
      result.push(currentLine);
      currentLine = ' '; // Continuation lines start with a space
    }
  }

  if (currentLine.length > 1) {
    result.push(currentLine);
  }

  return result.join('\r\n');
}

/**
 * Generate a unique identifier for the event
 */
function generateUID(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}@unity.meet`;
}

/**
 * Generate an ICS file content for a meeting event
 */
export function generateICS(event: ICSEvent): string {
  const uid = event.uid || generateUID();
  const dtstamp = formatDateToICS(new Date());
  const dtstart = formatDateToICS(event.startTime);
  const dtend = formatDateToICS(event.endTime);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Unity Meet//Unity Financial Network//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICSText(event.title)}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeICSText(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  // Add organizer
  lines.push(
    `ORGANIZER;CN=${escapeICSText(event.organizer.name)}:mailto:${event.organizer.email}`
  );

  // Add attendees
  if (event.attendees && event.attendees.length > 0) {
    for (const attendee of event.attendees) {
      const rsvp = attendee.rsvp !== false ? 'TRUE' : 'FALSE';
      lines.push(
        `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=${rsvp};CN=${escapeICSText(attendee.name)}:mailto:${attendee.email}`
      );
    }
  }

  // Add reminder (default 15 minutes before)
  const reminderMinutes = event.reminder ?? 15;
  lines.push(
    'BEGIN:VALARM',
    'TRIGGER:-PT' + reminderMinutes + 'M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICSText(event.title)} comienza en ${reminderMinutes} minutos`,
    'END:VALARM'
  );

  lines.push('END:VEVENT', 'END:VCALENDAR');

  // Fold lines and join with CRLF
  return lines.map(foldLine).join('\r\n');
}

/**
 * Generate ICS content as base64 for email attachments
 */
export function generateICSBase64(event: ICSEvent): string {
  const icsContent = generateICS(event);
  return Buffer.from(icsContent).toString('base64');
}

/**
 * Generate a filename for the ICS file
 */
export function generateICSFilename(title: string): string {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  return `${sanitized}.ics`;
}

/**
 * Create an ICS event from a meeting object
 */
export function createMeetingICSEvent(meeting: {
  id: string;
  title: string;
  description?: string | null;
  scheduledStart: Date;
  scheduledEnd?: Date | null;
  roomId: string;
  host: {
    name: string | null;
    email: string;
  };
  invitees?: Array<{
    name: string;
    email: string;
  }>;
}): ICSEvent {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const joinUrl = `${appUrl}/room/${meeting.roomId}`;

  // Default duration: 1 hour if no end time specified
  const endTime = meeting.scheduledEnd || new Date(meeting.scheduledStart.getTime() + 60 * 60 * 1000);

  return {
    title: meeting.title,
    description: [
      meeting.description || 'Reunión de Unity Meet',
      '',
      '---',
      `Únete a la reunión: ${joinUrl}`,
      '',
      'Powered by Unity Meet - Unity Financial Network',
    ].join('\n'),
    location: joinUrl,
    url: joinUrl,
    startTime: meeting.scheduledStart,
    endTime,
    organizer: {
      name: meeting.host.name || 'Unity Meet',
      email: meeting.host.email,
    },
    attendees: meeting.invitees,
    uid: `meeting-${meeting.id}@unity.meet`,
    reminder: 15,
  };
}
