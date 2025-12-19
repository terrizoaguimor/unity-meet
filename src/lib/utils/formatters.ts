/**
 * Formatea la duración en formato legible (HH:MM:SS o MM:SS)
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}

/**
 * Formatea la hora de un mensaje de chat
 */
export function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Genera un ID único para la sala
 */
export function generateRoomId(): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz';
  const segments = 3;
  const segmentLength = 3;

  const parts: string[] = [];

  for (let i = 0; i < segments; i++) {
    let segment = '';
    for (let j = 0; j < segmentLength; j++) {
      segment += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    parts.push(segment);
  }

  return parts.join('-');
}

/**
 * Genera las iniciales de un nombre
 */
export function getInitials(name: string): string {
  if (!name) return '?';

  const words = name.trim().split(' ');

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Formatea el número de participantes
 */
export function formatParticipantCount(count: number): string {
  if (count === 1) return '1 participante';
  return `${count} participantes`;
}

/**
 * Copia texto al portapapeles
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para navegadores que no soportan clipboard API
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

/**
 * Genera un color consistente basado en un string (para avatares)
 */
export function stringToColor(str: string): string {
  const colors = [
    '#512783', // unity-purple
    '#f18918', // unity-orange
    '#3b82f6', // blue
    '#22c55e', // green
    '#ef4444', // red
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#ec4899', // pink
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}
