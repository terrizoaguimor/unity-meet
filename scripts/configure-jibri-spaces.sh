#!/bin/bash
# Configure Jibri to upload recordings to DigitalOcean Spaces
# Run this on the JIBRI SERVER (157.230.237.171)

set -e

echo "=== Configuring Jibri for DO Spaces ==="

# Install AWS CLI
apt-get update
apt-get install -y awscli

# Configure AWS credentials for DO Spaces
mkdir -p /root/.aws

cat > /root/.aws/credentials << 'EOF'
[default]
aws_access_key_id = DO8019CCQH2CAW3VZG77
aws_secret_access_key = JMBFQ+HULBF/cHBRRwZNBA1O6FeyRkfLjUhUQVm/rIE
EOF

cat > /root/.aws/config << 'EOF'
[default]
region = nyc3
s3 =
    endpoint_url = https://nyc3.digitaloceanspaces.com
EOF

echo "AWS CLI configured for DO Spaces"

# Create finalize script for automatic upload
mkdir -p /opt/jibri

cat > /opt/jibri/finalize.sh << 'SCRIPT'
#!/bin/bash
# Jibri Finalize Script - Upload recordings to DO Spaces
# Called automatically after each recording ends

RECORDING_DIR="$1"
LOG_FILE="/var/log/jitsi/jibri/finalize.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

if [ -z "$RECORDING_DIR" ] || [ ! -d "$RECORDING_DIR" ]; then
    log "ERROR: Invalid recording directory: $RECORDING_DIR"
    exit 1
fi

log "Processing recording directory: $RECORDING_DIR"

ROOM_NAME=$(basename "$RECORDING_DIR")
UPLOAD_COUNT=0

# Upload all video files
for file in "$RECORDING_DIR"/*.mp4 "$RECORDING_DIR"/*.webm; do
    if [ -f "$file" ]; then
        FILENAME=$(basename "$file")
        DEST="s3://meet-by-unity/recordings/${ROOM_NAME}/${FILENAME}"

        log "Uploading: $FILENAME"

        if aws s3 cp "$file" "$DEST" \
            --endpoint-url https://nyc3.digitaloceanspaces.com \
            --acl private 2>> "$LOG_FILE"; then
            log "SUCCESS: Uploaded $FILENAME"
            ((UPLOAD_COUNT++))
        else
            log "ERROR: Failed to upload $FILENAME"
        fi
    fi
done

log "Finished processing $ROOM_NAME - Uploaded $UPLOAD_COUNT files"

# Optional: Clean up local files after successful upload
if [ $UPLOAD_COUNT -gt 0 ]; then
    log "Cleaning up local files in $RECORDING_DIR"
    rm -rf "$RECORDING_DIR"
fi

exit 0
SCRIPT

chmod +x /opt/jibri/finalize.sh

# Create log file
touch /var/log/jitsi/jibri/finalize.log
chown jibri:jibri /var/log/jitsi/jibri/finalize.log

# Update Jibri config to use finalize script
if grep -q 'finalize-script = ""' /etc/jitsi/jibri/jibri.conf; then
    sed -i 's|finalize-script = ""|finalize-script = "/opt/jibri/finalize.sh"|g' /etc/jitsi/jibri/jibri.conf
    echo "Updated Jibri config with finalize script"
fi

# Restart Jibri
systemctl restart jibri

echo ""
echo "=== Configuration Complete ==="
echo ""
echo "Testing DO Spaces connection..."
if aws s3 ls s3://meet-by-unity/ --endpoint-url https://nyc3.digitaloceanspaces.com > /dev/null 2>&1; then
    echo "✓ DO Spaces connection successful!"
else
    echo "✗ DO Spaces connection failed - check credentials"
fi

echo ""
echo "Recordings will be uploaded to: s3://meet-by-unity/recordings/"
echo "Finalize log: /var/log/jitsi/jibri/finalize.log"
echo ""
