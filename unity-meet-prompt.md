# Prompt para Claude CLI - Unity Meet

## Instrucciones para Claude Code

Necesito que construyas **Unity Meet**, una aplicación de videoconferencias profesional similar a Google Meet, utilizando el API de Video de Telnyx.

---

## 🎨 Paleta de Colores (Brand Colors)

```css
--unity-purple: #512783;      /* Color principal - Headers, CTAs principales, elementos destacados */
--unity-orange: #f18918;      /* Color de acento - Botones de acción, notificaciones, highlights */
--unity-light-gray: #dadada;  /* Fondos claros, bordes, separadores */
--unity-dark-gray: #403c43;   /* Texto principal, fondos oscuros, modo oscuro */
```

---

## 🛠️ Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Next.js** | `14.2.35` | Framework principal (incluye parches de seguridad CVE-2025-66478, CVE-2025-55182) |
| **Tailwind CSS** | `4.1` | Sistema de estilos |
| **GSAP** | `latest` | Animaciones fluidas |
| **Telnyx Video SDK** | `@telnyx/video` | API de videoconferencias |
| **TypeScript** | `5.x` | Tipado estático |

---

## 📁 Estructura del Proyecto

```
unity-meet/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Landing/Home
│   │   ├── globals.css
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── room/
│   │   │   ├── [roomId]/
│   │   │   │   └── page.tsx            # Sala de videoconferencia
│   │   │   └── create/page.tsx         # Crear nueva sala
│   │   └── api/
│   │       ├── rooms/
│   │       │   ├── route.ts            # POST: crear room
│   │       │   └── [roomId]/
│   │       │       ├── route.ts        # GET: obtener room
│   │       │       └── token/route.ts  # POST: generar client token
│   │       └── webhooks/
│   │           └── telnyx/route.ts     # Webhooks de Telnyx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Avatar.tsx
│   │   │   └── Tooltip.tsx
│   │   ├── video/
│   │   │   ├── VideoGrid.tsx           # Grid de participantes
│   │   │   ├── VideoTile.tsx           # Tile individual de video
│   │   │   ├── LocalVideo.tsx          # Video local del usuario
│   │   │   ├── RemoteVideo.tsx         # Video de participantes remotos
│   │   │   ├── ScreenShare.tsx         # Compartir pantalla
│   │   │   └── VideoControls.tsx       # Controles (mute, video, etc)
│   │   ├── room/
│   │   │   ├── RoomHeader.tsx          # Header con info de la sala
│   │   │   ├── ParticipantsList.tsx    # Lista de participantes
│   │   │   ├── ChatPanel.tsx           # Chat en tiempo real
│   │   │   ├── PreJoinScreen.tsx       # Pantalla pre-unirse
│   │   │   └── MeetingControls.tsx     # Controles de la reunión
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── animations/
│   │       └── GSAPProvider.tsx        # Provider para animaciones GSAP
│   ├── hooks/
│   │   ├── useTelnyxRoom.ts            # Hook principal para Telnyx
│   │   ├── useMediaDevices.ts          # Hook para dispositivos
│   │   ├── useParticipants.ts          # Hook para participantes
│   │   ├── useScreenShare.ts           # Hook para compartir pantalla
│   │   └── useChat.ts                  # Hook para chat
│   ├── lib/
│   │   ├── telnyx/
│   │   │   ├── client.ts               # Cliente de Telnyx
│   │   │   ├── api.ts                  # Funciones API
│   │   │   └── types.ts                # Tipos de Telnyx
│   │   └── utils/
│   │       ├── cn.ts                   # Clase helper para Tailwind
│   │       └── formatters.ts           # Utilidades de formato
│   ├── stores/
│   │   └── roomStore.ts                # Estado global con Zustand
│   └── types/
│       └── index.ts                    # Tipos globales
├── public/
│   ├── sounds/
│   │   ├── join.mp3
│   │   ├── leave.mp3
│   │   └── notification.mp3
│   └── images/
│       └── logo.svg
├── .env.local.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.mjs
```

---

## 🔑 Variables de Entorno

```env
# .env.local
TELNYX_API_KEY=your_telnyx_api_key
TELNYX_PUBLIC_KEY=your_telnyx_public_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TELNYX_WEBHOOK_URL=https://your-domain.com/api/webhooks/telnyx
```

---

## 📡 Integración con Telnyx Video API

### Endpoints Principales de la API de Telnyx:

```typescript
// Crear una Room
POST https://api.telnyx.com/v2/rooms
Headers: {
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
Body: {
  "unique_name": "Unity Meet Room",
  "max_participants": 50,
  "webhook_event_url": "https://your-domain.com/api/webhooks/telnyx",
  "enable_recording": false
}

// Generar Client Token para unirse a una Room
POST https://api.telnyx.com/v2/rooms/{room_id}/actions/generate_join_client_token
Headers: {
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
Body: {
  "refresh_token_ttl_secs": 3600,
  "token_ttl_secs": 600
}
```

### Flujo del SDK de Video (JavaScript):

```typescript
import { TelnyxVideo } from '@telnyx/video';

// 1. Inicializar el cliente con el token
const room = new TelnyxVideo({
  token: clientToken
});

// 2. Conectar a la sala
await room.connect();

// 3. Eventos principales
room.on('connected', async () => {
  // Usuario conectado
  const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: true, 
    video: true 
  });
  
  const audioTrack = stream.getAudioTracks()[0];
  const videoTrack = stream.getVideoTracks()[0];
  
  await room.addStream('camera', { 
    audio: audioTrack, 
    video: videoTrack 
  });
});

room.on('participant_joined', (participantId, state) => {
  // Nuevo participante
});

room.on('stream_published', async (participantId, streamKey, state) => {
  // Stream publicado - suscribirse si es remoto
  const participant = state.participants.get(participantId);
  if (participant.origin !== 'local') {
    await room.addSubscription(participantId, streamKey, {
      audio: true,
      video: true
    });
  }
});

room.on('subscription_started', (participantId, streamKey, state) => {
  // Suscripción iniciada - renderizar video
  const remoteStream = room.getParticipantStream(participantId, streamKey);
  const mediaStream = new MediaStream([
    remoteStream.audioTrack,
    remoteStream.videoTrack
  ]);
  // Asignar a elemento video
});

room.on('participant_left', (participantId) => {
  // Participante salió
});

// 4. Desconectar
room.disconnect();
```

---

## 🎬 Funcionalidades Requeridas

### Core Features:
1. **Crear sala de reunión** - Generar link único
2. **Unirse a sala** - Con link o código
3. **Video/Audio en tiempo real** - WebRTC via Telnyx
4. **Compartir pantalla** - Screen sharing
5. **Chat en sala** - Mensajes en tiempo real
6. **Lista de participantes** - Ver quién está en la sala
7. **Controles de medios** - Mute audio, deshabilitar video
8. **Pre-join screen** - Configurar antes de entrar

### UI/UX Features:
1. **Grid adaptativo** - 1, 2, 4, 6+ participantes
2. **Speaker view** - Destacar quien habla
3. **Picture-in-picture** - Video flotante
4. **Dark/Light mode** - Usando los colores de la paleta
5. **Animaciones suaves** - Con GSAP
6. **Responsive design** - Mobile-first

### Controles de la Reunión:
- 🎤 Toggle micrófono
- 📹 Toggle cámara
- 🖥️ Compartir pantalla
- 💬 Abrir/cerrar chat
- 👥 Ver participantes
- ⚙️ Configuración (seleccionar dispositivos)
- 🚪 Salir de la reunión
- 📋 Copiar link de invitación

---

## 🎨 Diseño UI/UX Especificaciones

### Tema Claro:
```css
background: #ffffff;
surface: #dadada;
text-primary: #403c43;
accent-primary: #512783;
accent-secondary: #f18918;
```

### Tema Oscuro:
```css
background: #403c43;
surface: #2a282c;
text-primary: #dadada;
accent-primary: #512783;
accent-secondary: #f18918;
```

### Componentes Clave:

**Botón Principal (CTA):**
```css
background: linear-gradient(135deg, #512783, #6b3a9e);
color: white;
hover: brightness(1.1);
active: scale(0.98);
```

**Botón Secundario:**
```css
background: #f18918;
color: white;
```

**Video Tile:**
```css
border-radius: 12px;
background: #403c43;
border: 2px solid transparent;
speaking-indicator: border-color: #f18918;
```

**Control Buttons (Mic/Cam):**
```css
enabled: background: rgba(81, 39, 131, 0.2);
disabled: background: rgba(255, 59, 48, 0.2);
hover: transform scale(1.05);
```

---

## 🎭 Animaciones GSAP

```typescript
// Entrada de participante
gsap.from(participantTile, {
  scale: 0,
  opacity: 0,
  duration: 0.5,
  ease: "back.out(1.7)"
});

// Salida de participante
gsap.to(participantTile, {
  scale: 0,
  opacity: 0,
  duration: 0.3,
  ease: "power2.in"
});

// Toggle de controles
gsap.to(controlsPanel, {
  y: isVisible ? 0 : 100,
  opacity: isVisible ? 1 : 0,
  duration: 0.3,
  ease: "power2.out"
});

// Indicador de "hablando"
gsap.to(speakingRing, {
  scale: 1.1,
  repeat: -1,
  yoyo: true,
  duration: 0.5,
  ease: "sine.inOut"
});
```

---

## 📱 Responsive Breakpoints

```css
/* Mobile first */
sm: 640px   /* Tablet pequeña */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop pequeño */
xl: 1280px  /* Desktop */
2xl: 1536px /* Desktop grande */
```

### Grid de Video Responsive:
- **1 participante**: Full screen
- **2 participantes**: 50/50 split
- **3-4 participantes**: Grid 2x2
- **5-6 participantes**: Grid 3x2
- **7+ participantes**: Grid con scroll + speaker destacado

---

## 🚀 Comandos de Setup

```bash
# Crear proyecto
npx create-next-app@14.2.35 unity-meet --typescript --tailwind --eslint --app --src-dir

# Instalar dependencias
npm install @telnyx/video gsap zustand clsx tailwind-merge

# Instalar Tailwind v4.1
npm install tailwindcss@4.1 @tailwindcss/postcss

# Dev dependencies
npm install -D @types/node

# Ejecutar
npm run dev
```

---

## ⚠️ Consideraciones Importantes

1. **Seguridad**: NUNCA exponer `TELNYX_API_KEY` en el cliente. Solo usar en API routes.
2. **Permisos**: Solicitar permisos de cámara/micrófono antes de conectar.
3. **Fallbacks**: Manejar cuando el usuario deniega permisos.
4. **Cleanup**: Siempre desconectar tracks y room al salir.
5. **Error handling**: Implementar reconexión automática.
6. **Mobile**: Probar en iOS Safari (requiere gestos del usuario para autoplay).

---

## 📝 Notas Adicionales

- El código debe estar completamente tipado con TypeScript
- Usar Server Components donde sea posible
- Implementar loading states y skeletons
- Agregar meta tags para SEO y Open Graph
- Incluir manifest.json para PWA básico
- Comentar el código en español

---

## 🎯 Resultado Esperado

Una aplicación de videoconferencias funcional, moderna y profesional que:
1. Se vea y sienta como una alternativa seria a Google Meet
2. Use la paleta de colores de Unity consistentemente
3. Tenga animaciones fluidas y feedback visual claro
4. Sea completamente responsive
5. Maneje errores gracefully
6. Sea fácil de usar sin instrucciones

---

¡Comienza creando el proyecto con la estructura indicada y desarrolla componente por componente!
