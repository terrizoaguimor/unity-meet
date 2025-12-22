#!/bin/bash
# Unity Meet - Jitsi Self-Hosted Setup Script
# Run this on the jitsi-meet droplet (67.205.189.124)

set -e

echo "=========================================="
echo "  Unity Meet - Jitsi Setup"
echo "=========================================="

# Variables
JITSI_DOMAIN="jitsi.byunity.net"
JITSI_DIR="/opt/jitsi-meet"
JWT_APP_ID="unity-meet"
JWT_APP_SECRET=$(openssl rand -hex 32)

echo ""
echo "[1/6] Updating system and installing dependencies..."
apt-get update
apt-get install -y apt-transport-https ca-certificates curl software-properties-common git

echo ""
echo "[2/6] Ensuring Docker is installed..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose plugin if not present
if ! docker compose version &> /dev/null; then
    apt-get install -y docker-compose-plugin
fi

echo ""
echo "[3/6] Cloning Jitsi Docker repository..."
mkdir -p $JITSI_DIR
cd $JITSI_DIR

if [ -d "docker-jitsi-meet" ]; then
    cd docker-jitsi-meet
    git pull
else
    git clone https://github.com/jitsi/docker-jitsi-meet.git
    cd docker-jitsi-meet
fi

echo ""
echo "[4/6] Configuring environment..."
cp env.example .env

# Generate passwords
./gen-passwords.sh

# Configure .env file
sed -i "s|#PUBLIC_URL=.*|PUBLIC_URL=https://${JITSI_DOMAIN}|" .env
sed -i "s|#DOCKER_HOST_ADDRESS=.*|DOCKER_HOST_ADDRESS=$(curl -s ifconfig.me)|" .env
sed -i "s|#ENABLE_AUTH=.*|ENABLE_AUTH=1|" .env
sed -i "s|#ENABLE_GUESTS=.*|ENABLE_GUESTS=1|" .env
sed -i "s|#AUTH_TYPE=.*|AUTH_TYPE=jwt|" .env

# Add JWT configuration
cat >> .env << EOF

# JWT Configuration for Unity Meet
JWT_APP_ID=${JWT_APP_ID}
JWT_APP_SECRET=${JWT_APP_SECRET}
JWT_ACCEPTED_ISSUERS=${JWT_APP_ID}
JWT_ACCEPTED_AUDIENCES=${JWT_APP_ID}
JWT_ALLOW_EMPTY=0
JWT_AUTH_TYPE=token
JWT_TOKEN_AUTH_MODULE=token_verification

# Enable Jibri for recordings
ENABLE_RECORDING=1

# Timezone
TZ=America/Mexico_City

# OTEL (disable to reduce logs)
OTEL_EXPORTER=

# Etherpad (disable for now)
ETHERPAD_URL_BASE=
EOF

echo ""
echo "[5/6] Creating config directories..."
mkdir -p ~/.jitsi-meet-cfg/{web,transcripts,prosody/config,prosody/prosody-plugins-custom,jicofo,jvb,jigasi,jibri}

echo ""
echo "[6/6] Starting Jitsi Meet services..."
docker compose up -d

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Jitsi Meet is starting up at: https://${JITSI_DOMAIN}"
echo ""
echo "IMPORTANT - Save these credentials for Unity Meet app:"
echo "============================================"
echo "JWT_APP_ID: ${JWT_APP_ID}"
echo "JWT_APP_SECRET: ${JWT_APP_SECRET}"
echo "JITSI_DOMAIN: ${JITSI_DOMAIN}"
echo "============================================"
echo ""
echo "It may take 2-3 minutes for SSL certificate to be issued."
echo ""
echo "To check status: docker compose ps"
echo "To view logs: docker compose logs -f"
echo ""
