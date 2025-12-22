#!/bin/bash
# Install Jibri on a dedicated server
# Run this on the JIBRI SERVER (157.230.237.171)

set -e

# Configuration - UPDATE THESE VALUES
JITSI_DOMAIN="jitsi.byunity.net"
XMPP_SERVER="10.116.0.18"  # Jitsi internal VPC IP
JIBRI_PASSWORD="${JIBRI_PASSWORD:-REPLACE_WITH_JIBRI_PASSWORD}"
RECORDER_PASSWORD="${RECORDER_PASSWORD:-REPLACE_WITH_RECORDER_PASSWORD}"

if [[ "$JIBRI_PASSWORD" == "REPLACE_WITH_JIBRI_PASSWORD" ]]; then
    echo "ERROR: Set JIBRI_PASSWORD environment variable"
    echo "Usage: JIBRI_PASSWORD=xxx RECORDER_PASSWORD=yyy ./install-jibri.sh"
    exit 1
fi

echo "=== Installing Jibri ==="
echo "Jitsi Domain: $JITSI_DOMAIN"
echo "XMPP Server: $XMPP_SERVER"

# Update system
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# Install required packages
apt-get install -y \
    linux-image-extra-virtual \
    ffmpeg \
    curl \
    unzip \
    software-properties-common \
    gnupg2

# Install Java 11
apt-get install -y openjdk-11-jre-headless

# Add Google Chrome repository
curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list

# Add Jitsi repository
curl -fsSL https://download.jitsi.org/jitsi-key.gpg.key | gpg --dearmor -o /usr/share/keyrings/jitsi.gpg
echo "deb [signed-by=/usr/share/keyrings/jitsi.gpg] https://download.jitsi.org stable/" > /etc/apt/sources.list.d/jitsi-stable.list

apt-get update

# Install Chrome
apt-get install -y google-chrome-stable

# Install ChromeDriver
CHROME_VERSION=$(google-chrome --version | grep -oP '\d+\.\d+\.\d+')
CHROMEDRIVER_VERSION=$(curl -sS "https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_${CHROME_VERSION%.*.*}")
if [ -z "$CHROMEDRIVER_VERSION" ]; then
    # Fallback to latest stable
    CHROMEDRIVER_VERSION=$(curl -sS "https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_STABLE")
fi

echo "Installing ChromeDriver version: $CHROMEDRIVER_VERSION"
cd /tmp
curl -sS -o chromedriver.zip "https://storage.googleapis.com/chrome-for-testing-public/${CHROMEDRIVER_VERSION}/linux64/chromedriver-linux64.zip"
unzip -o chromedriver.zip
mv chromedriver-linux64/chromedriver /usr/local/bin/
chmod +x /usr/local/bin/chromedriver
rm -rf chromedriver.zip chromedriver-linux64

# Install Jibri
apt-get install -y jibri

# Add jibri user to required groups
usermod -aG adm,audio,video,plugdev jibri

# Configure ALSA loopback module
echo "snd-aloop" >> /etc/modules
modprobe snd-aloop || true

# Create recordings directory
mkdir -p /srv/recordings
chown jibri:jibri /srv/recordings

# Create Jibri configuration
mkdir -p /etc/jitsi/jibri

cat > /etc/jitsi/jibri/jibri.conf << EOF
jibri {
  id = ""
  single-use-mode = false

  api {
    http {
      external-api-port = 2222
      internal-api-port = 3333
    }
    xmpp {
      environments = [
        {
          name = "unity-meet"
          xmpp-server-hosts = ["$XMPP_SERVER"]
          xmpp-domain = "meet.jitsi"

          control-muc {
            domain = "internal.auth.meet.jitsi"
            room-name = "jibribrewery"
            nickname = "jibri-$(hostname)"
          }

          control-login {
            domain = "auth.meet.jitsi"
            username = "jibri"
            password = "$JIBRI_PASSWORD"
          }

          call-login {
            domain = "recorder.meet.jitsi"
            username = "recorder"
            password = "$RECORDER_PASSWORD"
          }

          strip-from-room-domain = "conference."
          usage-timeout = 0
          trust-all-xmpp-certs = true
        }
      ]
    }
  }

  recording {
    recordings-directory = "/srv/recordings"
    finalize-script = "/opt/jibri/finalize.sh"
  }

  streaming {
    rtmp-allow-list = [".*"]
  }

  chrome {
    flags = [
      "--use-fake-ui-for-media-stream",
      "--start-maximized",
      "--kiosk",
      "--enabled",
      "--disable-infobars",
      "--autoplay-policy=no-user-gesture-required",
      "--ignore-certificate-errors"
    ]
  }

  stats {
    enable-stats-d = true
  }

  call-status-checks {
    no-media-timeout = 30 seconds
    all-muted-timeout = 10 minutes
    default-call-empty-timeout = 30 seconds
  }
}
EOF

# Create finalize script (optional - for post-processing recordings)
mkdir -p /opt/jibri
cat > /opt/jibri/finalize.sh << 'FINALIZE'
#!/bin/bash
# Finalize script for Jibri recordings
# $1 = recording directory

RECORDING_DIR=$1

if [ -d "$RECORDING_DIR" ]; then
    echo "Recording finished: $RECORDING_DIR"
    # Add your post-processing here (upload to S3, etc.)
fi
FINALIZE

chmod +x /opt/jibri/finalize.sh

# Configure logging
mkdir -p /var/log/jibri
chown jibri:jibri /var/log/jibri

# Enable and start Jibri service
systemctl enable jibri
systemctl restart jibri

# Wait and check status
sleep 5
systemctl status jibri --no-pager || true

echo ""
echo "=== Jibri Installation Complete ==="
echo ""
echo "Check Jibri logs with: journalctl -u jibri -f"
echo "Recordings will be saved to: /srv/recordings"
echo ""
echo "If you see connection errors, ensure:"
echo "1. Firewall allows port 5222 from Jibri to Jitsi"
echo "2. The Jitsi server was configured with matching passwords"
echo ""
