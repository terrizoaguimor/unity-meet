#!/bin/bash
# Secure Jitsi Meet to require JWT authentication
# Run this on the JITSI SERVER (67.205.189.124)

set -e

echo "=== Securing Jitsi Meet with JWT-only access ==="

cd /opt/jitsi/docker-jitsi-meet

# Stop containers
docker compose down

# Enable JWT authentication and disable anonymous access
echo "" >> .env
echo "# Security: Require JWT for all access" >> .env
echo "ENABLE_AUTH=1" >> .env
echo "AUTH_TYPE=jwt" >> .env
echo "ENABLE_GUESTS=0" >> .env

# Ensure these are set (they should already be from initial setup)
grep -q "^JWT_APP_ID=" .env || echo "JWT_APP_ID=unity-meet" >> .env
grep -q "^JWT_APP_SECRET=" .env || echo "JWT_APP_SECRET=7debac4d3500b152ec83f842e78cc39159faeeacefb9f7f07c9e8cda7c455613" >> .env

# Disable the welcome page (no public landing)
echo "ENABLE_WELCOME_PAGE=0" >> .env

# Start containers with new config
docker compose up -d

echo ""
echo "=== Jitsi Secured ==="
echo ""
echo "Now Jitsi will ONLY accept connections with valid JWT tokens."
echo "Direct access to jitsi.byunity.net will show an error."
echo "Users MUST go through meet.byunity.net to get a valid token."
echo ""

# Verify configuration
echo "Verifying configuration..."
sleep 5
docker logs docker-jitsi-meet-prosody-1 2>&1 | grep -i "auth\|jwt" | tail -5
