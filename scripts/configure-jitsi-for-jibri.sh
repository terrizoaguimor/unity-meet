#!/bin/bash
# Configure Jitsi Meet server to accept Jibri connections
# Run this on the JITSI SERVER (67.205.189.124)

set -e

echo "=== Configuring Jitsi Meet for Jibri ==="

JITSI_DOMAIN="jitsi.byunity.net"
JIBRI_PASSWORD=$(openssl rand -hex 16)
RECORDER_PASSWORD=$(openssl rand -hex 16)

echo ""
echo "Generated passwords:"
echo "JIBRI_PASSWORD=$JIBRI_PASSWORD"
echo "RECORDER_PASSWORD=$RECORDER_PASSWORD"
echo ""
echo "SAVE THESE - you'll need them for Jibri installation!"
echo ""

# Navigate to jitsi-docker directory
cd /root/jitsi-docker

# Stop containers first
docker compose down

# Add Jibri configuration to .env
cat >> .env << EOF

# Jibri Configuration
ENABLE_RECORDING=1
JIBRI_BREWERY_MUC=jibribrewery
JIBRI_PENDING_TIMEOUT=90
JIBRI_RECORDER_USER=recorder
JIBRI_RECORDER_PASSWORD=$RECORDER_PASSWORD
JIBRI_XMPP_USER=jibri
JIBRI_XMPP_PASSWORD=$JIBRI_PASSWORD
JIBRI_STRIP_DOMAIN_JID=muc
JIBRI_LOGS_DIR=/config/logs/jibri
JIBRI_RECORDING_DIR=/config/recordings
EOF

# Create recordings directory
mkdir -p /root/jitsi-docker/recordings
chmod 777 /root/jitsi-docker/recordings

echo "Jibri configuration added to .env"

# Restart Jitsi with new configuration
docker compose up -d

echo ""
echo "=== Jitsi configured for Jibri ==="
echo ""
echo "Now run the Jibri installation script on the Jibri server with:"
echo "  JIBRI_PASSWORD=$JIBRI_PASSWORD"
echo "  RECORDER_PASSWORD=$RECORDER_PASSWORD"
echo ""
