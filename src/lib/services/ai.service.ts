import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

// Safety settings for business use
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Get the Gemini model
function getModel() {
  return genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    safetySettings,
  });
}

export interface MeetingSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  participants: string[];
  duration: string;
  language: string;
}

export interface ActionItem {
  task: string;
  assignee: string | null;
  dueDate: string | null;
  priority: 'high' | 'medium' | 'low';
  context: string;
}

export interface MeetingInsights {
  topics: Array<{
    name: string;
    duration: string;
    percentage: number;
  }>;
  sentiment: 'positive' | 'neutral' | 'negative';
  participationBalance: Array<{
    participant: string;
    speakingTime: string;
    percentage: number;
  }>;
  suggestions: string[];
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  timestamp: string;
}

/**
 * Generate a meeting summary from transcript
 */
export async function generateMeetingSummary(
  transcript: string | TranscriptSegment[],
  meetingTitle?: string,
  meetingDuration?: number
): Promise<MeetingSummary> {
  const model = getModel();

  const transcriptText = Array.isArray(transcript)
    ? transcript.map(s => `[${s.timestamp}] ${s.speaker}: ${s.text}`).join('\n')
    : transcript;

  const prompt = `Analiza la siguiente transcripción de una reunión de negocios y genera un resumen estructurado.

TRANSCRIPCIÓN:
${transcriptText}

${meetingTitle ? `Título de la reunión: ${meetingTitle}` : ''}
${meetingDuration ? `Duración: ${Math.round(meetingDuration / 60)} minutos` : ''}

Responde SOLO con un objeto JSON válido (sin markdown, sin backticks) con la siguiente estructura:
{
  "title": "Título descriptivo de la reunión basado en el contenido",
  "summary": "Resumen ejecutivo de 2-3 párrafos con los puntos más importantes discutidos",
  "keyPoints": ["Punto clave 1", "Punto clave 2", "Punto clave 3", "..."],
  "participants": ["Nombre participante 1", "Nombre participante 2", "..."],
  "duration": "Duración estimada o proporcionada",
  "language": "es o en dependiendo del idioma principal"
}

Asegúrate de:
- Identificar los temas principales discutidos
- Resumir las decisiones tomadas
- Listar los participantes mencionados
- Mantener un tono profesional y conciso`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  try {
    // Clean the response (remove potential markdown code blocks)
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanedResponse) as MeetingSummary;
  } catch {
    // If JSON parsing fails, create a basic summary
    return {
      title: meetingTitle || 'Reunión',
      summary: response,
      keyPoints: [],
      participants: [],
      duration: meetingDuration ? `${Math.round(meetingDuration / 60)} minutos` : 'No disponible',
      language: 'es',
    };
  }
}

/**
 * Extract action items from meeting transcript
 */
export async function extractActionItems(
  transcript: string | TranscriptSegment[]
): Promise<ActionItem[]> {
  const model = getModel();

  const transcriptText = Array.isArray(transcript)
    ? transcript.map(s => `[${s.timestamp}] ${s.speaker}: ${s.text}`).join('\n')
    : transcript;

  const prompt = `Analiza la siguiente transcripción de reunión y extrae TODAS las acciones, tareas, compromisos o seguimientos mencionados.

TRANSCRIPCIÓN:
${transcriptText}

Busca frases como:
- "Voy a...", "Me comprometo a...", "Necesito..."
- "¿Puedes...?", "Te pido que...", "Por favor..."
- "Para la próxima reunión...", "Antes del viernes..."
- "Hay que...", "Debemos...", "Es necesario..."

Responde SOLO con un array JSON válido (sin markdown, sin backticks):
[
  {
    "task": "Descripción clara de la tarea",
    "assignee": "Nombre de la persona responsable o null si no está claro",
    "dueDate": "Fecha límite mencionada o null",
    "priority": "high, medium o low basado en urgencia/importancia",
    "context": "Breve contexto de por qué se necesita esta acción"
  }
]

Si no hay acciones claras, devuelve un array vacío: []`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  try {
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanedResponse) as ActionItem[];
  } catch {
    return [];
  }
}

/**
 * Generate meeting insights and analytics
 */
export async function generateMeetingInsights(
  transcript: string | TranscriptSegment[],
  meetingDuration?: number
): Promise<MeetingInsights> {
  const model = getModel();

  const transcriptText = Array.isArray(transcript)
    ? transcript.map(s => `[${s.timestamp}] ${s.speaker}: ${s.text}`).join('\n')
    : transcript;

  const prompt = `Analiza la siguiente transcripción de reunión y genera insights detallados.

TRANSCRIPCIÓN:
${transcriptText}

${meetingDuration ? `Duración total: ${Math.round(meetingDuration / 60)} minutos` : ''}

Responde SOLO con un objeto JSON válido (sin markdown, sin backticks):
{
  "topics": [
    {
      "name": "Nombre del tema discutido",
      "duration": "Tiempo estimado en ese tema",
      "percentage": 25
    }
  ],
  "sentiment": "positive, neutral o negative - tono general de la reunión",
  "participationBalance": [
    {
      "participant": "Nombre",
      "speakingTime": "Tiempo estimado hablando",
      "percentage": 30
    }
  ],
  "suggestions": [
    "Sugerencia para mejorar futuras reuniones basada en patrones observados"
  ]
}

Analiza:
- Qué temas ocuparon más tiempo
- Quién participó más/menos
- El tono general (productivo, tenso, colaborativo, etc.)
- Oportunidades de mejora`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  try {
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanedResponse) as MeetingInsights;
  } catch {
    return {
      topics: [],
      sentiment: 'neutral',
      participationBalance: [],
      suggestions: [],
    };
  }
}

/**
 * Generate real-time suggestions during a meeting (for live AI assistant)
 */
export async function generateLiveSuggestion(
  recentTranscript: string,
  context: {
    meetingType: string;
    participants: string[];
    currentTopic?: string;
  }
): Promise<{ suggestion: string; type: 'tip' | 'reminder' | 'question' | 'action' }> {
  const model = getModel();

  const prompt = `Eres un asistente de reuniones en vivo. Basándote en lo que se acaba de discutir, genera UNA sugerencia útil.

CONTEXTO:
- Tipo de reunión: ${context.meetingType}
- Participantes: ${context.participants.join(', ')}
${context.currentTopic ? `- Tema actual: ${context.currentTopic}` : ''}

ÚLTIMA PARTE DE LA CONVERSACIÓN:
${recentTranscript}

Responde SOLO con un objeto JSON válido (sin markdown):
{
  "suggestion": "Tu sugerencia breve y útil (máximo 2 oraciones)",
  "type": "tip (consejo), reminder (recordatorio), question (pregunta sugerida) o action (acción detectada)"
}

La sugerencia debe ser:
- Relevante al contexto inmediato
- Accionable y práctica
- En español
- Profesional`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  try {
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanedResponse);
  } catch {
    return {
      suggestion: '',
      type: 'tip',
    };
  }
}

/**
 * Analyze and improve a transcript for readability
 */
export async function improveTranscript(rawTranscript: string): Promise<string> {
  const model = getModel();

  const prompt = `Mejora la siguiente transcripción de reunión para hacerla más legible, corrigiendo errores menores y mejorando la puntuación, pero SIN cambiar el contenido ni el significado.

TRANSCRIPCIÓN ORIGINAL:
${rawTranscript}

Devuelve la transcripción mejorada directamente (no JSON, solo el texto corregido).`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Generate a follow-up email draft based on meeting content
 */
export async function generateFollowUpEmail(
  summary: MeetingSummary,
  actionItems: ActionItem[],
  recipientType: 'internal' | 'prospect' | 'client'
): Promise<{ subject: string; body: string }> {
  const model = getModel();

  const actionsText = actionItems.length > 0
    ? actionItems.map(a => `- ${a.task}${a.assignee ? ` (${a.assignee})` : ''}`).join('\n')
    : 'No se identificaron acciones específicas.';

  const prompt = `Genera un correo de seguimiento profesional basado en esta reunión.

RESUMEN DE LA REUNIÓN:
${summary.summary}

PUNTOS CLAVE:
${summary.keyPoints.join('\n')}

ACCIONES PENDIENTES:
${actionsText}

TIPO DE DESTINATARIO: ${recipientType === 'prospect' ? 'Prospecto potencial' : recipientType === 'client' ? 'Cliente existente' : 'Equipo interno'}

Responde SOLO con un objeto JSON válido (sin markdown):
{
  "subject": "Asunto del correo",
  "body": "Cuerpo del correo en formato texto plano con saltos de línea \\n"
}

El correo debe ser:
- Profesional pero cálido
- Conciso (máximo 200 palabras)
- Incluir próximos pasos claros
- En español`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  try {
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    return JSON.parse(cleanedResponse);
  } catch {
    return {
      subject: `Seguimiento: ${summary.title}`,
      body: `Hola,\n\nGracias por su tiempo en nuestra reunión.\n\nResumen:\n${summary.summary}\n\nQuedamos atentos.\n\nSaludos`,
    };
  }
}

/**
 * Detect the language of the transcript
 */
export async function detectLanguage(text: string): Promise<'es' | 'en' | 'other'> {
  const model = getModel();

  const prompt = `Detecta el idioma principal del siguiente texto. Responde SOLO con: "es" para español, "en" para inglés, o "other" para otros idiomas.

TEXTO:
${text.substring(0, 500)}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text().trim().toLowerCase();

  if (response === 'es' || response === 'en') {
    return response;
  }
  return 'other';
}
