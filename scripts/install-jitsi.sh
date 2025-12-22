#!/bin/bash
# Unity Meet - Jitsi Self-Hosted Installation Script
# Execute on: jitsi-meet droplet (67.205.189.124)

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        Unity Meet - Jitsi Self-Hosted Setup                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Variables
JITSI_DOMAIN="jitsi.byunity.net"
JWT_APP_ID="unity-meet"
JWT_SECRET=$(openssl rand -hex 32)
PUBLIC_IP=$(curl -s ifconfig.me)
PRIVATE_IP=$(hostname -I | awk '{print $1}')

echo "[INFO] Public IP: $PUBLIC_IP"
echo "[INFO] Private IP: $PRIVATE_IP"
echo "[INFO] Domain: $JITSI_DOMAIN"
echo ""

# Step 1: Update system
echo "[1/7] Updating system packages..."
apt-get update -qq
apt-get upgrade -y -qq

# Step 2: Install dependencies
echo "[2/7] Installing dependencies..."
apt-get install -y -qq apt-transport-https ca-certificates curl software-properties-common git gnupg lsb-release

# Step 3: Ensure Docker is installed
echo "[3/7] Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "       Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Ensure Docker Compose plugin
if ! docker compose version &> /dev/null 2>&1; then
    echo "       Installing Docker Compose plugin..."
    apt-get install -y -qq docker-compose-plugin
fi

echo "       Docker version: $(docker --version)"
echo "       Compose version: $(docker compose version)"

# Step 4: Clone Jitsi Docker
echo "[4/7] Setting up Jitsi Docker..."
mkdir -p /opt/jitsi
cd /opt/jitsi

if [ -d "docker-jitsi-meet" ]; then
    echo "       Updating existing installation..."
    cd docker-jitsi-meet
    git pull -q
else
    echo "       Cloning Jitsi Docker repository..."
    git clone -q https://github.com/jitsi/docker-jitsi-meet.git
    cd docker-jitsi-meet
fi

# Step 5: Configure environment
echo "[5/7] Configuring environment..."
cp env.example .env

# Generate secure passwords
./gen-passwords.sh

# Update .env with our configuration
sed -i "s|#PUBLIC_URL=.*|PUBLIC_URL=https://${JITSI_DOMAIN}|" .env
sed -i "s|#DOCKER_HOST_ADDRESS=.*|DOCKER_HOST_ADDRESS=${PUBLIC_IP}|" .env
sed -i "s|#ENABLE_AUTH=.*|ENABLE_AUTH=1|" .env
sed -i "s|#ENABLE_GUESTS=.*|ENABLE_GUESTS=1|" .env
sed -i "s|#AUTH_TYPE=.*|AUTH_TYPE=jwt|" .env
sed -i "s|#ENABLE_LETSENCRYPT=.*|ENABLE_LETSENCRYPT=1|" .env
sed -i "s|#LETSENCRYPT_DOMAIN=.*|LETSENCRYPT_DOMAIN=${JITSI_DOMAIN}|" .env
sed -i "s|#LETSENCRYPT_EMAIL=.*|LETSENCRYPT_EMAIL=admin@byunity.net|" .env
sed -i "s|HTTP_PORT=.*|HTTP_PORT=80|" .env
sed -i "s|HTTPS_PORT=.*|HTTPS_PORT=443|" .env

# Append JWT and additional configuration
cat >> .env << EOF

# ═══════════════════════════════════════════════════════════
# Unity Meet JWT Configuration
# ═══════════════════════════════════════════════════════════
JWT_APP_ID=${JWT_APP_ID}
JWT_APP_SECRET=${JWT_SECRET}
JWT_ACCEPTED_ISSUERS=${JWT_APP_ID}
JWT_ACCEPTED_AUDIENCES=${JWT_APP_ID}
JWT_ALLOW_EMPTY=0
JWT_AUTH_TYPE=token
JWT_TOKEN_AUTH_MODULE=token_verification

# ═══════════════════════════════════════════════════════════
# Recording (Jibri) - Will be configured later
# ═══════════════════════════════════════════════════════════
ENABLE_RECORDING=1
JIBRI_RECORDER_USER=recorder
JIBRI_RECORDER_PASSWORD=$(openssl rand -hex 16)
JIBRI_XMPP_USER=jibri
JIBRI_XMPP_PASSWORD=$(openssl rand -hex 16)

# ═══════════════════════════════════════════════════════════
# Additional Settings
# ═══════════════════════════════════════════════════════════
TZ=America/Mexico_City
OTEL_EXPORTER=
ENABLE_LOBBY=1
ENABLE_AV_MODERATION=1
ENABLE_BREAKOUT_ROOMS=1
ENABLE_PREJOIN_PAGE=1
ENABLE_WELCOME_PAGE=0
ENABLE_CLOSE_PAGE=0
ENABLE_NOISY_MIC_DETECTION=1
ENABLE_TALK_WHILE_MUTED=1
DISABLE_HTTPS=0
EOF

# Step 6: Create config directories
echo "[6/7] Creating configuration directories..."
mkdir -p ~/.jitsi-meet-cfg/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}

# Step 7: Start services
echo "[7/7] Starting Jitsi Meet services..."
docker compose down 2>/dev/null || true
docker compose up -d

# Wait for services to start
echo ""
echo "       Waiting for services to initialize..."
sleep 10

# Check status
echo ""
echo "       Service Status:"
docker compose ps --format "table {{.Name}}\t{{.Status}}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    SETUP COMPLETE                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Jitsi Meet URL: https://${JITSI_DOMAIN}"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SAVE THESE CREDENTIALS FOR UNITY MEET APP                   ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║                                                              ║"
echo "  JITSI_DOMAIN=${JITSI_DOMAIN}"
echo "  JWT_APP_ID=${JWT_APP_ID}"
echo "  JWT_APP_SECRET=${JWT_SECRET}"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 Commands:"
echo "   - Check status: cd /opt/jitsi/docker-jitsi-meet && docker compose ps"
echo "   - View logs:    cd /opt/jitsi/docker-jitsi-meet && docker compose logs -f"
echo "   - Restart:      cd /opt/jitsi/docker-jitsi-meet && docker compose restart"
echo ""
echo "⏳ SSL certificate will be issued automatically (may take 1-2 minutes)"
echo ""

# Save credentials to file
cat > /root/jitsi-credentials.txt << EOF
Unity Meet - Jitsi Credentials
==============================
Generated: $(date)

JITSI_DOMAIN=${JITSI_DOMAIN}
JWT_APP_ID=${JWT_APP_ID}
JWT_APP_SECRET=${JWT_SECRET}

Public IP: ${PUBLIC_IP}
Private IP (VPC): ${PRIVATE_IP}
EOF

echo "💾 Credentials saved to: /root/jitsi-credentials.txt"
echo ""
