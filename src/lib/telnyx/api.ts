import type {
  TelnyxRoomResponse,
  TelnyxClientTokenResponse,
  CreateRoomPayload,
  GenerateTokenPayload,
} from './types';

const TELNYX_API_BASE = 'https://api.telnyx.com/v2';

/**
 * Cliente para interactuar con la API de Telnyx Video
 * IMPORTANTE: Solo usar en el servidor (API routes)
 */
class TelnyxAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Headers comunes para todas las requests
   */
  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Crear una nueva sala de videoconferencia
   */
  async createRoom(payload: CreateRoomPayload): Promise<TelnyxRoomResponse> {
    const response = await fetch(`${TELNYX_API_BASE}/rooms`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        unique_name: payload.unique_name,
        max_participants: payload.max_participants || 50,
        enable_recording: payload.enable_recording || false,
        webhook_event_url: payload.webhook_event_url,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telnyx API Error:', {
        status: response.status,
        statusText: response.statusText,
        errors: errorData.errors,
      });

      // Handle specific error messages
      let errorMessage = `Error ${response.status}: ${response.statusText}`;
      if (errorData.errors) {
        // Check for array format
        if (Array.isArray(errorData.errors) && errorData.errors[0]) {
          errorMessage = errorData.errors[0].detail || errorData.errors[0].title || errorMessage;
        }
        // Check for object format (like unique_name errors)
        else if (typeof errorData.errors === 'object') {
          const firstKey = Object.keys(errorData.errors)[0];
          if (firstKey && Array.isArray(errorData.errors[firstKey])) {
            errorMessage = `${firstKey}: ${errorData.errors[firstKey][0]}`;
          }
        }
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  /**
   * Obtener información de una sala
   */
  async getRoom(roomId: string): Promise<TelnyxRoomResponse> {
    const response = await fetch(`${TELNYX_API_BASE}/rooms/${roomId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.detail || 'Sala no encontrada');
    }

    return response.json();
  }

  /**
   * Eliminar una sala
   */
  async deleteRoom(roomId: string): Promise<void> {
    const response = await fetch(`${TELNYX_API_BASE}/rooms/${roomId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.detail || 'Error al eliminar la sala');
    }
  }

  /**
   * Generar token de cliente para unirse a una sala
   */
  async generateClientToken(
    roomId: string,
    payload?: GenerateTokenPayload
  ): Promise<TelnyxClientTokenResponse> {
    const response = await fetch(
      `${TELNYX_API_BASE}/rooms/${roomId}/actions/generate_join_client_token`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          refresh_token_ttl_secs: payload?.refresh_token_ttl_secs || 3600,
          token_ttl_secs: payload?.token_ttl_secs || 600,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.errors?.[0]?.detail || 'Error al generar token de acceso'
      );
    }

    return response.json();
  }

  /**
   * Listar todas las salas
   */
  async listRooms(params?: {
    page_number?: number;
    page_size?: number;
  }): Promise<{
    data: TelnyxRoomResponse['data'][];
    meta: { total_pages: number; total_results: number };
  }> {
    const queryParams = new URLSearchParams();

    if (params?.page_number) {
      queryParams.set('page[number]', params.page_number.toString());
    }
    if (params?.page_size) {
      queryParams.set('page[size]', params.page_size.toString());
    }

    const url = `${TELNYX_API_BASE}/rooms${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0]?.detail || 'Error al listar salas');
    }

    return response.json();
  }
}

/**
 * Instancia singleton del cliente de Telnyx
 * Solo disponible en el servidor
 */
let telnyxApiInstance: TelnyxAPI | null = null;

export function getTelnyxAPI(): TelnyxAPI {
  if (typeof window !== 'undefined') {
    throw new Error('TelnyxAPI solo puede usarse en el servidor');
  }

  if (!telnyxApiInstance) {
    const apiKey = process.env.TELNYX_API_KEY;

    if (!apiKey) {
      throw new Error('TELNYX_API_KEY no está configurada');
    }

    telnyxApiInstance = new TelnyxAPI(apiKey);
  }

  return telnyxApiInstance;
}

export { TelnyxAPI };
