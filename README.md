# Unity Meet

<div align="center">
  <img src="public/logo.svg" alt="Unity Meet Logo" width="120" height="120">

  **Plataforma de videoconferencias exclusiva para Unity Financial Network**

  [![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
  [![Telnyx](https://img.shields.io/badge/Telnyx-Video-00c389)](https://telnyx.com/)
  [![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

  [Demo](https://meet.byunity.net) · [Documentación](#documentación) · [Reportar Bug](https://github.com/terrizoaguimor/unity-meet/issues)

</div>

---

## Acerca de Unity Meet

Unity Meet es una plataforma de videoconferencias diseñada exclusivamente para los agentes y staff de **Unity Financial Network**. Proporciona un entorno privado y seguro para reuniones de equipo, presentaciones a prospectos, webinars de entrenamiento y sesiones de cierre.

### Características principales

- **Entorno 100% Privado** - Espacio seguro exclusivo para miembros de Unity
- **Links Públicos** - Invita prospectos externos sin comprometer la seguridad
- **Grabación en la Nube** - Graba reuniones para training y compliance
- **Compartir Documentos** - Comparte PDFs y presentaciones en tiempo real
- **Modo Webinar** - Hasta 500 asistentes para entrenamientos masivos
- **IA Integrada** - Resúmenes automáticos, transcripciones y detección de acciones
- **Video HD** - Calidad hasta 1080p con optimización automática
- **Fondos Virtuales** - Branding de Unity y difuminado de fondo

## Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| **Next.js 14** | Framework React con App Router |
| **TypeScript** | Tipado estático |
| **Tailwind CSS 4** | Estilos y diseño |
| **Telnyx Video SDK** | Infraestructura de video |
| **Zustand** | Estado global |
| **GSAP** | Animaciones |

## Inicio Rápido

### Prerrequisitos

- Node.js 18.x o superior
- npm 9.x o superior
- Cuenta de Telnyx con Video habilitado

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/terrizoaguimor/unity-meet.git
cd unity-meet

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
```

### Configuración

Edita `.env.local` con tus credenciales:

```env
# Telnyx API Configuration
TELNYX_API_KEY=tu_api_key_aqui
TELNYX_PUBLIC_KEY=tu_public_key_aqui

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_TELNYX_WEBHOOK_URL=http://localhost:3000/api/webhooks/telnyx
```

### Desarrollo

```bash
# Iniciar servidor de desarrollo
npm run dev

# Abrir en el navegador
open http://localhost:3000
```

### Producción

```bash
# Construir para producción
npm run build

# Iniciar servidor de producción
npm run start
```

## Estructura del Proyecto

```
unity-meet/
├── src/
│   ├── app/                    # App Router de Next.js
│   │   ├── api/               # API Routes
│   │   │   ├── rooms/         # CRUD de salas
│   │   │   └── webhooks/      # Webhooks de Telnyx
│   │   ├── room/              # Páginas de sala
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── layout/            # Navbar, Footer
│   │   ├── room/              # Componentes de sala
│   │   ├── ui/                # Componentes UI base
│   │   └── video/             # Componentes de video
│   ├── hooks/                 # Custom hooks
│   ├── lib/
│   │   └── telnyx/            # Cliente API de Telnyx
│   └── store/                 # Estado global (Zustand)
├── public/                    # Assets estáticos
├── .do/                       # Config DigitalOcean
└── package.json
```

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/rooms` | Crear nueva sala |
| `GET` | `/api/rooms/[roomId]` | Obtener info de sala |
| `DELETE` | `/api/rooms/[roomId]` | Eliminar sala |
| `POST` | `/api/rooms/[roomId]/token` | Generar token de acceso |
| `POST` | `/api/webhooks/telnyx` | Recibir eventos de Telnyx |

## Despliegue

### DigitalOcean App Platform

1. Conecta tu repositorio de GitHub
2. Selecciona el archivo `.do/app.yaml`
3. Configura las variables de entorno como secretos
4. Despliega

```bash
# O usa doctl CLI
doctl apps create --spec .do/app.yaml
```

### Variables de Entorno en Producción

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `TELNYX_API_KEY` | API Key de Telnyx | Sí |
| `TELNYX_PUBLIC_KEY` | Public Key de Telnyx | Sí |
| `NEXT_PUBLIC_APP_URL` | URL de la aplicación | Sí |
| `NEXT_PUBLIC_TELNYX_WEBHOOK_URL` | URL para webhooks | Sí |
| `NODE_ENV` | Entorno (production) | Sí |

## Documentación

### Crear una Sala

```typescript
const response = await fetch('/api/rooms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'mi-reunion',
    maxParticipants: 50,
    enableRecording: true
  })
});

const { room } = await response.json();
// room.join_url -> URL para unirse
```

### Unirse a una Sala

```typescript
// El cliente obtiene un token automáticamente
// Solo necesita navegar a /room/[roomId]
```

### Webhooks de Telnyx

Configura el webhook URL en el portal de Telnyx:
```
https://meet.byunity.net/api/webhooks/telnyx
```

Eventos soportados:
- `room.session.started`
- `room.session.ended`
- `room.participant.joined`
- `room.participant.left`
- `room.recording.started`
- `room.recording.ended`

## Seguridad

- Todas las comunicaciones usan cifrado de extremo a extremo
- Las API keys nunca se exponen al cliente
- Los tokens de acceso tienen tiempo de expiración limitado
- Salas de espera para controlar admisión de externos
- Grabaciones almacenadas con cifrado en reposo

## Contribución

Este es un proyecto privado de Unity Financial Network. Las contribuciones están limitadas a miembros autorizados del equipo de desarrollo.

## Soporte

Para soporte técnico, contacta al equipo de desarrollo:
- Email: soporte@byunity.net
- GitHub Issues: [Reportar problema](https://github.com/terrizoaguimor/unity-meet/issues)

## Licencia

Copyright © 2024 Mario Gutierrez. Todos los derechos reservados.

Este software es propietario y confidencial. Ver [LICENSE](LICENSE) para más detalles.

---

<div align="center">
  Desarrollado con ❤️ para <strong>Unity Financial Network</strong>
</div>
