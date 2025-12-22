# Unity Meet - Jitsi Self-Hosted Implementation Plan

## Arquitectura Propuesta

```
                                    ┌─────────────────────────────────────────────────────────┐
                                    │                    DigitalOcean VPC                      │
                                    │                    nyc1-vpc-01                           │
                                    │                    10.116.0.0/20                         │
                                    │                                                          │
┌──────────────┐                    │  ┌──────────────────┐      ┌──────────────────┐        │
│   Usuarios   │◄──────HTTPS───────►│  │  Jitsi Meet      │      │    Jibri         │        │
│   (Web/App)  │                    │  │  Droplet         │◄────►│    Droplet       │        │
└──────────────┘                    │  │                  │      │                  │        │
                                    │  │  - Jitsi Meet    │      │  - Recording     │        │
                                    │  │  - Prosody       │      │  - Streaming     │        │
                                    │  │  - Jicofo        │      │  - Chrome        │        │
                                    │  │  - JVB           │      │    Headless      │        │
                                    │  │                  │      │                  │        │
                                    │  │  10.116.x.x      │      │  10.116.x.x      │        │
                                    │  └────────┬─────────┘      └────────┬─────────┘        │
                                    │           │                         │                   │
                                    │           │         VPC Network     │                   │
                                    │           └────────────┬────────────┘                   │
                                    │                        │                                │
                                    │           ┌────────────▼────────────┐                   │
                                    │           │   PostgreSQL DB         │                   │
                                    │           │   meet-by-unity         │                   │
                                    │           │   10.116.x.x            │                   │
                                    │           └─────────────────────────┘                   │
                                    │                                                          │
                                    │           ┌─────────────────────────┐                   │
                                    │           │   DO Spaces (S3)        │                   │
                                    │           │   Recordings Storage    │                   │
                                    │           └─────────────────────────┘                   │
                                    │                                                          │
                                    │           ┌─────────────────────────┐                   │
                                    │           │   Unity Meet App        │                   │
                                    │           │   (Next.js on App       │                   │
                                    │           │    Platform)            │                   │
                                    │           └─────────────────────────┘                   │
                                    └─────────────────────────────────────────────────────────┘
```

## Componentes

### 1. Jitsi Meet Droplet (Principal)
- **Tamaño**: 8GB RAM, 4 vCPU ($48/mes)
- **Región**: nyc1
- **VPC**: nyc1-vpc-01
- **Componentes Docker**:
  - `jitsi/web` - Frontend web
  - `jitsi/prosody` - XMPP server
  - `jitsi/jicofo` - Focus component (gestiona conferencias)
  - `jitsi/jvb` - Videobridge (maneja streams de video)

### 2. Jibri Droplet (Grabaciones)
- **Tamaño**: 8GB RAM, 4 vCPU ($48/mes)
- **Región**: nyc1
- **VPC**: nyc1-vpc-01
- **Requisitos especiales**:
  - Kernel con soporte ALSA loopback
  - Chrome/Chromium headless
  - FFmpeg para encoding

### 3. DO Spaces (Almacenamiento)
- **Región**: nyc3 (más cercana a nyc1)
- **Uso**: Almacenar grabaciones
- **Costo**: $5/mes base + $0.02/GB

## Dominio y SSL

- **Dominio principal**: `meet.byunity.net` (ya existe para la app)
- **Subdominios nuevos**:
  - `jitsi.byunity.net` → Jitsi Meet server
  - `jibri.byunity.net` → Jibri server (interno)

## Configuración de Red

### Puertos Requeridos (Jitsi Meet)
| Puerto | Protocolo | Descripción |
|--------|-----------|-------------|
| 80 | TCP | HTTP (redirect a HTTPS) |
| 443 | TCP | HTTPS (web interface) |
| 4443 | TCP | JVB Harvester fallback |
| 10000 | UDP | JVB media traffic |

### Puertos Internos (VPC)
| Puerto | Protocolo | Descripción |
|--------|-----------|-------------|
| 5222 | TCP | Prosody XMPP |
| 5280 | TCP | Prosody BOSH |
| 5347 | TCP | Prosody component |
| 8888 | TCP | Jibri HTTP API |

## Pasos de Implementación

### Fase 1: Infraestructura (Día 1)
1. Crear Droplet para Jitsi Meet
2. Crear Droplet para Jibri
3. Configurar DNS para jitsi.byunity.net
4. Agregar ambos Droplets al VPC

### Fase 2: Jitsi Meet Setup (Día 1-2)
1. Instalar Docker y Docker Compose
2. Clonar jitsi-docker
3. Configurar variables de entorno
4. Generar certificados SSL (Let's Encrypt)
5. Iniciar servicios
6. Probar conexión básica

### Fase 3: Jibri Setup (Día 2)
1. Configurar kernel para ALSA loopback
2. Instalar Chrome headless
3. Configurar Jibri Docker
4. Conectar con Jitsi Meet vía XMPP
5. Configurar almacenamiento en DO Spaces
6. Probar grabación

### Fase 4: Integración con Unity Meet (Día 3)
1. Crear API endpoints para:
   - Crear salas en Jitsi self-hosted
   - Obtener tokens JWT para autenticación
   - Iniciar/detener grabaciones
   - Listar grabaciones disponibles
2. Actualizar componente de reuniones
3. Migrar de JaaS a self-hosted

### Fase 5: Testing y Go-Live (Día 4)
1. Pruebas de carga
2. Pruebas de grabación
3. Pruebas de múltiples usuarios
4. Documentación
5. Rollout gradual

## Variables de Entorno Jitsi

```env
# Configuración básica
CONFIG=~/.jitsi-meet-cfg
HTTP_PORT=80
HTTPS_PORT=443
TZ=America/Mexico_City

# Dominio
PUBLIC_URL=https://jitsi.byunity.net
DOCKER_HOST_ADDRESS=<IP_PUBLICA_DROPLET>

# Autenticación JWT (para integración con Unity Meet)
ENABLE_AUTH=1
ENABLE_GUESTS=1
AUTH_TYPE=jwt
JWT_APP_ID=unity-meet
JWT_APP_SECRET=<GENERAR_SECRET_SEGURO>
JWT_ACCEPTED_ISSUERS=unity-meet
JWT_ACCEPTED_AUDIENCES=unity-meet

# Jibri
ENABLE_RECORDING=1
JIBRI_RECORDER_USER=recorder
JIBRI_RECORDER_PASSWORD=<GENERAR_PASSWORD>
JIBRI_XMPP_USER=jibri
JIBRI_XMPP_PASSWORD=<GENERAR_PASSWORD>

# XMPP
XMPP_DOMAIN=meet.jitsi
XMPP_SERVER=xmpp.meet.jitsi
XMPP_BOSH_URL_BASE=http://xmpp.meet.jitsi:5280
XMPP_AUTH_DOMAIN=auth.meet.jitsi
XMPP_MUC_DOMAIN=muc.meet.jitsi
XMPP_INTERNAL_MUC_DOMAIN=internal-muc.meet.jitsi
XMPP_GUEST_DOMAIN=guest.meet.jitsi
XMPP_RECORDER_DOMAIN=recorder.meet.jitsi

# JVB (Videobridge)
JVB_PORT=10000
JVB_TCP_PORT=4443
JVB_TCP_MAPPED_PORT=4443
```

## Estimación de Costos

| Recurso | Especificación | Costo Mensual |
|---------|----------------|---------------|
| Jitsi Meet Droplet | 8GB RAM, 4 vCPU | $48 |
| Jibri Droplet | 8GB RAM, 4 vCPU | $48 |
| DO Spaces | 250GB + transferencia | ~$10 |
| **Total** | | **~$106/mes** |

### Comparación con JaaS

| Característica | JaaS Pro | Self-Hosted |
|----------------|----------|-------------|
| Costo mensual | $99+ | ~$106 |
| Límite usuarios | 100 | Ilimitado* |
| Grabaciones | Incluidas (limitadas) | Ilimitadas |
| Personalización | Limitada | Total |
| Mantenimiento | Anthropic | Propio |
| Uptime SLA | 99.9% | Depende de DO |

*Limitado por recursos del servidor

## Comandos de Deployment

### Crear Droplets
```bash
# Jitsi Meet Droplet
doctl compute droplet create jitsi-meet \
  --image docker-20-04 \
  --size s-4vcpu-8gb \
  --region nyc1 \
  --vpc-uuid a8b64478-514d-41c1-8795-3e8a9fd5e176 \
  --ssh-keys <SSH_KEY_ID> \
  --tag-names "jitsi,unity-meet" \
  --enable-monitoring

# Jibri Droplet
doctl compute droplet create jitsi-jibri \
  --image docker-20-04 \
  --size s-4vcpu-8gb \
  --region nyc1 \
  --vpc-uuid a8b64478-514d-41c1-8795-3e8a9fd5e176 \
  --ssh-keys <SSH_KEY_ID> \
  --tag-names "jibri,unity-meet" \
  --enable-monitoring
```

### Configurar Firewall
```bash
doctl compute firewall create \
  --name jitsi-firewall \
  --inbound-rules "protocol:tcp,ports:80,address:0.0.0.0/0 protocol:tcp,ports:443,address:0.0.0.0/0 protocol:tcp,ports:4443,address:0.0.0.0/0 protocol:udp,ports:10000,address:0.0.0.0/0 protocol:tcp,ports:22,address:0.0.0.0/0" \
  --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0 protocol:udp,ports:all,address:0.0.0.0/0" \
  --tag-names jitsi
```

## Próximos Pasos Inmediatos

1. **Confirmar**: ¿Tienes acceso a gestionar DNS para byunity.net?
2. **Confirmar**: ¿Tienes SSH keys configuradas en DigitalOcean?
3. **Decidir**: ¿Crear DO Spaces nuevo o usar uno existente?
4. **Comenzar**: Crear los Droplets y configurar Jitsi
